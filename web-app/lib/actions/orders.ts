'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import {
  buildPaymentDescription,
  createPaymentLink,
  PayosApiError,
  PayosConfigError,
} from '@/lib/payos';
import { pickNumber, pickString } from '@/lib/json-utils';
import {
  checkoutFormSchema,
  toFieldErrors,
  type CheckoutInput,
  type PlaceOrderState,
} from '@/lib/validations/checkout';

/**
 * C06 – Đặt hàng.
 *
 * Luồng: Zod parse → RPC `place_order` (tất cả kiểm tra tồn kho/giá/mã giảm giá
 * nằm ở DB) → nếu COD thì quay về trang kết quả; nếu PayOS thì tạo link thanh
 * toán, lưu link bằng service_role rồi trả URL cho client chuyển hướng.
 */

const CART_SESSION_COOKIE = 'cart_session';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Link PayOS mặc định sống 15 phút nếu RPC không trả `expires_at`. */
const PAYOS_LINK_TTL_SECONDS = 15 * 60;

/** Đọc cookie phiên giỏ hàng do middleware cấp (httpOnly, UUID). */
async function getCartSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CART_SESSION_COOKIE)?.value ?? null;
  return value && UUID_PATTERN.test(value) ? value : null;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Rút gọn thông báo lỗi Postgres thành câu tiếng Việt thân thiện. */
function friendlyPlaceOrderError(message: string): string {
  const raw = message.replace(/^[A-Z0-9]{5}:\s*/, '').trim();
  if (/phương thức thanh toán/i.test(raw)) {
    return 'Phương thức thanh toán này chưa được hỗ trợ. Vui lòng chọn "Thanh toán khi nhận hàng (COD)" hoặc liên hệ hotline 0901 000 000.';
  }
  if (/hết hàng|tồn kho|không đủ/i.test(raw)) {
    return raw || 'Một số sản phẩm không đủ tồn kho. Vui lòng kiểm tra lại giỏ hàng.';
  }
  if (/giảm giá|mã/i.test(raw)) {
    return raw;
  }
  if (/could not find the function|schema cache/i.test(raw)) {
    return 'Máy chủ chưa chạy migration PayOS (04_payos.sql). Vui lòng chọn thanh toán khi nhận hàng (COD) hoặc liên hệ hotline 0901 000 000.';
  }
  return 'Không đặt được hàng. Vui lòng kiểm tra lại giỏ hàng rồi thử lại.';
}

function friendlyPayosError(error: unknown, orderCode: string): string {
  if (error instanceof PayosConfigError) {
    console.error('[orders] PayOS chưa cấu hình cho đơn', orderCode);
    return 'Cổng thanh toán PayOS chưa được cấu hình trên máy chủ. Vui lòng chọn thanh toán khi nhận hàng (COD) hoặc liên hệ hotline 0901 000 000.';
  }
  if (error instanceof PayosApiError) {
    console.error(
      '[orders] PayOS lỗi cho đơn',
      orderCode,
      '| code:',
      error.code ?? 'n/a',
      '| status:',
      error.status
    );
    if (error.code === 'INVALID_SIGNATURE') {
      return 'Cổng thanh toán PayOS phản hồi không hợp lệ. Đơn hàng đã được ghi nhận, vui lòng thử lại hoặc chọn COD.';
    }
    return `Chưa mở được cổng thanh toán PayOS cho đơn ${orderCode}. Đơn đã được ghi nhận ở trạng thái chờ thanh toán — bạn có thể thử lại sau hoặc chọn COD.`;
  }
  console.error('[orders] Lỗi không xác định khi tạo link PayOS cho đơn', orderCode);
  return `Chưa mở được cổng thanh toán cho đơn ${orderCode}. Vui lòng thử lại hoặc chọn thanh toán khi nhận hàng (COD).`;
}

export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderState> {
  const parsed = checkoutFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Thông tin đặt hàng chưa hợp lệ, vui lòng kiểm tra các ô được đánh dấu.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const auth = await getCurrentUser();
  const email =
    (data.customerEmail ?? '').trim() ||
    auth?.profile?.email ||
    auth?.user.email ||
    '';

  if (!email) {
    return {
      ok: false,
      error: 'Vui lòng nhập email để nhận xác nhận đơn hàng.',
      fieldErrors: { customerEmail: 'Email là bắt buộc với khách vãng lai.' },
    };
  }

  const sessionId = await getCartSessionId();
  if (!sessionId) {
    return {
      ok: false,
      error: 'Phiên giỏ hàng đã hết hạn. Vui lòng tải lại trang giỏ hàng rồi đặt lại.',
    };
  }

  const couponCode = data.couponCode?.trim() ? data.couponCode.trim().toUpperCase() : null;
  const supabase = await createClient();

  const note = data.note?.trim() ? data.note.trim() : null;
  const giftMessage = data.giftMessage?.trim() ? data.giftMessage.trim() : null;

  /**
   * `place_order` trong `huongque_db_full.sql` đã nhận cả 'cod' và 'payos':
   *   COD   -> status = confirmed ngay
   *   PayOS -> status = pending_payment, expires_at = now() + 15 phút
   * và trả về `payos_order_code` để app tạo link thanh toán.
   */
  const { data: raw, error } = await supabase.rpc('place_order', {
    p_session_id: sessionId,
    p_recipient_name: data.recipientName,
    p_recipient_phone: data.recipientPhone,
    p_customer_email: email,
    p_province: data.province,
    p_shipping_address: data.shippingAddress,
    p_payment_method: data.paymentMethod,
    p_coupon_code: couponCode,
    p_note: note,
    p_gift_message: giftMessage,
  });

  if (error) {
    console.error('[orders] place_order lỗi:', error.message);
    return { ok: false, error: friendlyPlaceOrderError(error.message) };
  }

  const orderCode = pickString(raw, ['order_code', 'code']);
  if (!orderCode) {
    console.error('[orders] place_order không trả về order_code:', JSON.stringify(raw));
    return {
      ok: false,
      error: 'Đơn hàng đã được xử lý nhưng không đọc được mã đơn. Vui lòng liên hệ hotline 0901 000 000.',
    };
  }

  const total = pickNumber(raw, ['total', 'total_amount'], 0);

  revalidatePath('/gio-hang');
  revalidatePath('/thanh-toan');

  const resultHref = `/thanh-toan/ket-qua?order=${encodeURIComponent(orderCode)}`;

  if (data.paymentMethod === 'cod') {
    return { ok: true, redirectTo: resultHref, orderCode };
  }

  /* ------------------------- Nhánh thanh toán PayOS ------------------------- */

  const payosOrderCode = pickNumber(raw, ['payos_order_code'], 0);
  if (!Number.isInteger(payosOrderCode) || payosOrderCode <= 0) {
    console.error('[orders] place_order không trả payos_order_code cho đơn', orderCode);
    return {
      ok: false,
      orderCode,
      error: `Đơn ${orderCode} đã được ghi nhận nhưng chưa thể mở cổng thanh toán PayOS (migration PayOS chưa chạy). Vui lòng chọn COD hoặc liên hệ hotline 0901 000 000.`,
    };
  }

  if (total <= 0) {
    return {
      ok: false,
      orderCode,
      error: `Đơn ${orderCode} có tổng tiền không hợp lệ để thanh toán PayOS. Vui lòng liên hệ hotline.`,
    };
  }

  if (!hasSupabaseAdminConfig()) {
    console.error('[orders] thiếu SUPABASE_SERVICE_ROLE_KEY, không lưu được link PayOS');
    return {
      ok: false,
      orderCode,
      error: `Đơn ${orderCode} đã được ghi nhận nhưng máy chủ chưa cấu hình thanh toán PayOS. Vui lòng chọn COD.`,
    };
  }

  const expiresAtRaw = pickString(raw, ['expires_at', 'expired_at']);
  const parsedExpiry = expiresAtRaw ? Math.floor(new Date(expiresAtRaw).getTime() / 1000) : NaN;
  const expiredAt = Number.isFinite(parsedExpiry) && parsedExpiry > 0
    ? parsedExpiry
    : Math.floor(Date.now() / 1000) + PAYOS_LINK_TTL_SECONDS;

  try {
    /**
     * returnUrl/cancelUrl mang theo SĐT người nhận.
     *
     * Lý do: RPC `get_payment_status` chỉ cho tra cứu khi người gọi là chủ đơn
     * (auth.uid()) HOẶC khớp `p_phone` HOẶC là admin. Khách vãng lai không có
     * session, nên C07 phải có SĐT để polling hoạt động — đây cũng chính là cặp
     * "mã đơn + SĐT" mà trang /tra-cuu-don dùng làm thông tin xác thực.
     */
    const resultHrefWithPhone = `${resultHref}&phone=${encodeURIComponent(data.recipientPhone)}`;

    const link = await createPaymentLink({
      orderCode: payosOrderCode,
      amount: total,
      description: buildPaymentDescription(orderCode),
      returnUrl: `${appUrl()}${resultHrefWithPhone}`,
      cancelUrl: `${appUrl()}${resultHrefWithPhone}&huy=1`,
      expiredAt,
      buyerName: data.recipientName,
      buyerPhone: data.recipientPhone,
      buyerEmail: email,
    });

    const checkoutUrl = pickString(link, ['checkoutUrl', 'checkout_url']);
    const linkId =
      pickString(link, ['paymentLinkId', 'payment_link_id', 'id']) ?? String(payosOrderCode);

    if (!checkoutUrl) {
      console.error('[orders] PayOS không trả checkoutUrl cho đơn', orderCode);
      return {
        ok: false,
        orderCode,
        error: `Chưa mở được cổng thanh toán cho đơn ${orderCode}. Vui lòng thử lại hoặc chọn COD.`,
      };
    }

    const { error: saveError } = await getSupabaseAdmin().rpc('save_payos_link', {
      p_order_code: orderCode,
      p_link_id: linkId,
      p_checkout_url: checkoutUrl,
    });

    if (saveError) {
      // Link đã tạo được; lỗi lưu chỉ ảnh hưởng đối soát, không chặn khách thanh toán.
      console.error('[orders] save_payos_link lỗi cho đơn', orderCode, '-', saveError.message);
    }

    revalidatePath('/thanh-toan/ket-qua');
    return { ok: true, redirectTo: checkoutUrl, orderCode };
  } catch (payosError) {
    return { ok: false, orderCode, error: friendlyPayosError(payosError, orderCode) };
  }
}
