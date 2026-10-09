'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getArrayByKeys,
  getByKeysDeep,
  pickBoolean,
  pickNumber,
  pickString,
} from '@/lib/json-utils';
import {
  addToCartSchema,
  couponCodeFieldSchema,
  setQuantitySchema,
  DEFAULT_FREE_SHIPPING_FROM,
  type CartActionResult,
  type CartItemView,
  type CartView,
} from '@/lib/validations/checkout';

/**
 * C05 – Server Action cho giỏ hàng.
 *
 * Phiên giỏ hàng là cookie `cart_session` (UUID, httpOnly) do middleware cấp cho
 * khách vãng lai. Mọi thao tác giỏ/đơn đi qua RPC (bảng cart_items KHÔNG cấp
 * GRANT cho anon):
 *   - get_cart(p_session_id, p_coupon_code)
 *   - cart_add / cart_set_quantity / cart_merge_guest
 */

const CART_SESSION_COOKIE = 'cart_session';
const CART_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày (khớp middleware)
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đọc cookie phiên giỏ hàng (chỉ đọc – an toàn trong Server Component). */
async function readCartSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  return value && UUID_PATTERN.test(value) ? value : null;
}

/**
 * Đọc cookie phiên giỏ hàng, tự cấp mới nếu middleware chưa kịp gắn.
 * Chỉ gọi trong Server Action / Route Handler (nơi được phép ghi cookie).
 */
async function getOrCreateCartSessionId(): Promise<string | null> {
  const existing = await readCartSessionId();
  if (existing) return existing;

  const created = randomUUID();
  try {
    const cookieStore = await cookies();
    cookieStore.set(CART_SESSION_COOKIE, created, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_SESSION_MAX_AGE,
    });
  } catch {
    // Ngữ cảnh chỉ đọc (Server Component) – coi như chưa có phiên.
    return null;
  }
  return created;
}

function emptyCart(): CartView {
  return {
    items: [],
    subtotal: 0,
    discountAmount: 0,
    shippingFee: 0,
    total: 0,
    coupon: null,
    freeShippingFrom: DEFAULT_FREE_SHIPPING_FROM,
    itemCount: 0,
  };
}

function mapCartItem(raw: unknown): CartItemView {
  const price = pickNumber(raw, ['price', 'unit_price'], 0);
  const quantity = pickNumber(raw, ['quantity', 'qty'], 0);
  const stock = pickNumber(raw, ['stock', 'stock_available'], 0);
  const lineTotalRaw = pickNumber(raw, ['line_total', 'subtotal', 'amount', 'total'], -1);

  return {
    productId: pickNumber(raw, ['product_id', 'id'], 0),
    name: pickString(raw, ['name', 'product_name']) ?? 'Sản phẩm',
    slug: pickString(raw, ['slug']),
    thumbnailUrl: pickString(raw, ['thumbnail_url', 'image_url', 'image']),
    unit: pickString(raw, ['unit']),
    price,
    quantity,
    stock,
    // Mặc định `true` để không chặn oan khách khi RPC dùng tên key khác.
    available: pickBoolean(raw, ['available', 'is_available', 'in_stock'], true),
    lineTotal: lineTotalRaw >= 0 ? lineTotalRaw : price * quantity,
  };
}

/** Chuẩn hoá JSON thô của get_cart về CartView. */
function mapCart(raw: unknown): CartView {
  const items = getArrayByKeys(raw, ['items'])
    .map(mapCartItem)
    .filter((item) => item.productId > 0 && item.quantity > 0);

  const computedSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = pickNumber(raw, ['subtotal'], computedSubtotal);
  const discountAmount = pickNumber(raw, ['discount_amount', 'discount'], 0);
  const shippingFee = pickNumber(raw, ['shipping_fee'], 0);
  const computedTotal = Math.max(0, subtotal - discountAmount) + shippingFee;
  const total = pickNumber(raw, ['total', 'grand_total'], computedTotal);
  const freeShippingFrom = pickNumber(
    raw,
    ['free_shipping_from'],
    DEFAULT_FREE_SHIPPING_FROM
  );

  const couponRaw = getByKeysDeep(raw, ['coupon']);
  const couponCode = pickString(couponRaw, ['code']);
  const coupon =
    couponCode && typeof couponRaw === 'object'
      ? {
          code: couponCode,
          valid: pickBoolean(couponRaw, ['valid', 'is_valid'], false),
          message: pickString(couponRaw, ['message', 'error']),
        }
      : null;

  return {
    items,
    subtotal,
    discountAmount,
    shippingFee,
    total,
    coupon,
    freeShippingFrom,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

async function fetchCart(
  sessionId: string,
  couponCode: string | null
): Promise<CartView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_cart', {
    p_session_id: sessionId,
    p_coupon_code: couponCode,
  });

  if (error) {
    console.error('[cart] get_cart lỗi:', error.message);
    return null;
  }
  return mapCart(data);
}

function revalidateCartPages(): void {
  revalidatePath('/gio-hang');
  revalidatePath('/thanh-toan');
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Thêm sản phẩm vào giỏ (C04/C05). */
export async function addToCartAction(
  productId: number,
  quantity: number = 1
): Promise<CartActionResult> {
  const parsed = addToCartSchema.safeParse({ productId, quantity });
  if (!parsed.success) {
    return { ok: false, error: 'Số lượng hoặc sản phẩm không hợp lệ.' };
  }

  const sessionId = await getOrCreateCartSessionId();
  if (!sessionId) {
    return {
      ok: false,
      error: 'Không khởi tạo được phiên giỏ hàng. Vui lòng tải lại trang rồi thử lại.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cart_add', {
    p_session_id: sessionId,
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
  });

  if (error) {
    console.error('[cart] cart_add lỗi:', error.message);
    return {
      ok: false,
      error: error.message || 'Không thêm được sản phẩm vào giỏ hàng.',
    };
  }

  revalidateCartPages();
  const cart = await fetchCart(sessionId, null);
  return { ok: true, cart: cart ?? emptyCart() };
}

/** Đặt số lượng tuyệt đối cho một dòng (0 = xoá dòng). */
export async function setQuantityAction(
  productId: number,
  quantity: number
): Promise<CartActionResult> {
  const parsed = setQuantitySchema.safeParse({ productId, quantity });
  if (!parsed.success) {
    return { ok: false, error: 'Số lượng không hợp lệ.' };
  }

  const sessionId = await getOrCreateCartSessionId();
  if (!sessionId) {
    return {
      ok: false,
      error: 'Không tìm thấy phiên giỏ hàng. Vui lòng tải lại trang rồi thử lại.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cart_set_quantity', {
    p_session_id: sessionId,
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
  });

  if (error) {
    console.error('[cart] cart_set_quantity lỗi:', error.message);
    return {
      ok: false,
      error: error.message || 'Không cập nhật được số lượng.',
    };
  }

  revalidateCartPages();
  const cart = await fetchCart(sessionId, null);
  return { ok: true, cart: cart ?? emptyCart() };
}

/** Xoá một dòng khỏi giỏ (đặt số lượng = 0 theo RPC). */
export async function removeFromCartAction(
  productId: number
): Promise<CartActionResult> {
  return setQuantityAction(productId, 0);
}

/**
 * Lấy giỏ hàng hiện tại, kèm xem trước mã giảm giá (C05).
 * Chỉ đọc – không gọi revalidate.
 */
export async function getCartAction(couponCode?: string): Promise<CartActionResult> {
  const parsedCoupon = couponCodeFieldSchema.safeParse(couponCode);
  const normalizedCoupon = parsedCoupon.success && parsedCoupon.data
    ? parsedCoupon.data.trim().toUpperCase()
    : null;

  const sessionId = await readCartSessionId();
  if (!sessionId) {
    return { ok: true, cart: emptyCart() };
  }

  const cart = await fetchCart(sessionId, normalizedCoupon);
  if (!cart) {
    return { ok: false, error: 'Không tải được giỏ hàng. Vui lòng thử lại.' };
  }
  return { ok: true, cart };
}

/**
 * Gộp giỏ của khách vãng lai vào tài khoản vừa đăng nhập.
 * `cart_merge_guest` yêu cầu đăng nhập; anon sẽ bị RPC từ chối.
 */
export async function mergeGuestCartAction(): Promise<CartActionResult> {
  const auth = await getCurrentUser();
  if (!auth) {
    return { ok: false, error: 'Vui lòng đăng nhập để đồng bộ giỏ hàng.' };
  }

  const sessionId = await readCartSessionId();
  if (!sessionId) {
    return { ok: true, cart: emptyCart() };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('cart_merge_guest', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('[cart] cart_merge_guest lỗi:', error.message);
    return { ok: false, error: 'Không đồng bộ được giỏ hàng đã lưu trên thiết bị.' };
  }

  revalidateCartPages();
  const cart = await fetchCart(sessionId, null);
  return { ok: true, cart: cart ?? emptyCart() };
}
