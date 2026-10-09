/**
 * Chuẩn hoá dữ liệu đơn hàng nhận từ Supabase RPC.
 *
 * Nguồn dữ liệu:
 *  - `get_order_detail(p_order_code text, p_phone text?)` -> jsonb (không xác nhận được key thật)
 *  - `fn_list_user_orders()` -> setof jsonb với contract ĐÃ CHỐT:
 *      order_id, order_code, created_at, status, payment_method, payment_status,
 *      total, expires_at, item_count
 *
 * TODO(lead): khoá lại key thật sau khi có schema dump của `get_order_detail`.
 *   Hiện tại `normalizeOrderDetail` chấp nhận nhiều alias key (xem bảng bên dưới) và
 *   tự dò các lớp bọc (`data` / `result` / `order` / `order_detail`).
 *
 * GIẢ ĐỊNH VỀ KEY (alias được chấp nhận, ưu tiên từ trái sang phải):
 *   order_code        : order_code | orderCode | ma_don | code
 *   order_id          : order_id | orderId            (KHÔNG dùng key `id` chung chung
 *                                                      vì có thể là id của payment link –
 *                                                      dùng order_id để gọi update_order_status)
 *   status            : status | order_status | trang_thai
 *   payment_method    : payment_method | paymentMethod | method | phuong_thuc_thanh_toan
 *   payment_status    : payment_status | paymentStatus | trang_thai_thanh_toan
 *   tiền              : subtotal/items_total/items_subtotal/goods_total/tam_tinh,
 *                       shipping_fee/shipping/phi_ship, discount/discount_amount/giam_gia,
 *                       total/total_amount/grand_total/final_total/thanh_tien
 *   thời gian         : created_at | createdAt | ngay_tao; updated_at; paid_at; expires_at | expired_at
 *   payos             : payos_order_code | payosOrderCode | payos_code,
 *                       payos_checkout_url | checkout_url | payment_url | payos_url
 *   người nhận        : receiver_name | customer_name | full_name | shipping_name | ten_nguoi_nhan
 *                       | recipient_name (tên cột thật trên public.orders),
 *                       receiver_phone | customer_phone | phone | shipping_phone | sdt
 *                       | recipient_phone (cột thật),
 *                       shipping_address | receiver_address | recipient_address | address | dia_chi
 *   ghi chú / lời chúc: note | notes | customer_note | order_note
 *                       greeting | wish | greeting_card | card_message | message | gift_message (cột thật)
 *   chi tiết món      : order_items | items | details | order_details
 *                       (product_id, product_name/name, quantity/qty, unit_price/price,
 *                        line_total/subtotal/total, image_url/thumbnail_url, product_slug/slug;
 *                        chấp nhận cả embed lồng `product` / `products`)
 *   timeline          : history | order_status_history | status_history | timeline | tracking
 *                       (status/new_status, note/reason/message, created_at/changed_at/at)
 *   đánh giá          : reviews | product_reviews | order_reviews
 *                       (product_id, rating, comment/content, created_at)
 *
 * Nếu timeline rỗng, tự dựng 1 mốc từ `created_at` + trạng thái hiện tại để UI vẫn có gì đó hiển thị.
 */

import { asNumber, asString } from '@/lib/format';

export interface OrderItemView {
  productId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Cờ `has_reviewed` do RPC get_order_detail trả về cho từng dòng. */
  hasReviewed: boolean;
  imageUrl: string | null;
  slug: string | null;
  unit: string | null;
}

export interface OrderHistoryEntry {
  status: string;
  note: string | null;
  /** ISO string hoặc null khi RPC không trả về mốc thời gian. */
  at: string | null;
}

export interface OrderReviewView {
  productId: number | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
}

export interface OrderDetailView {
  orderId: number | null;
  orderCode: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  createdAt: string | null;
  updatedAt: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  note: string | null;
  greeting: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  payosOrderCode: number | null;
  payosCheckoutUrl: string | null;
  items: OrderItemView[];
  history: OrderHistoryEntry[];
  reviews: OrderReviewView[];
}

export interface OrderSummary {
  orderId: number | null;
  orderCode: string;
  createdAt: string | null;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  total: number;
  expiresAt: string | null;
  itemCount: number;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Các lớp bọc có thể gặp quanh payload jsonb thật của RPC. */
const WRAPPER_KEYS = ['data', 'result', 'order_detail', 'orderDetail', 'order', 'payload'] as const;

/** Thu thập object gốc + các object lồng trong lớp bọc (tối đa 3 tầng). */
function collectRoots(raw: unknown): JsonRecord[] {
  const roots: JsonRecord[] = [];

  const visit = (value: unknown, depth: number): void => {
    if (depth > 3 || value === null || value === undefined) return;

    if (Array.isArray(value)) {
      // Jsonb có thể trả về mảng 1 phần tử: [{...}]
      if (value.length === 1) visit(value[0], depth + 1);
      return;
    }

    if (!isRecord(value)) return;

    roots.push(value);
    for (const key of WRAPPER_KEYS) {
      if (key in value) visit(value[key], depth + 1);
    }
  };

  visit(raw, 0);
  return roots;
}

/** Tìm giá trị đầu tiên theo thứ tự key ưu tiên, rồi mới tới lớp bọc. */
function firstRaw(roots: JsonRecord[], keys: string[]): unknown {
  for (const key of keys) {
    for (const root of roots) {
      const value = root[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
  }
  return undefined;
}

function firstString(roots: JsonRecord[], keys: string[]): string | null {
  const value = firstRaw(roots, keys);
  if (value === undefined) return null;
  if (isRecord(value) || Array.isArray(value)) return null;
  return asString(value);
}

function firstNumber(roots: JsonRecord[], keys: string[], fallback = 0): number {
  const value = firstRaw(roots, keys);
  if (value === undefined || isRecord(value) || Array.isArray(value)) return fallback;
  return asNumber(value, fallback);
}

function firstNumberOrNull(roots: JsonRecord[], keys: string[]): number | null {
  const value = firstRaw(roots, keys);
  if (value === undefined || isRecord(value) || Array.isArray(value)) return null;
  const parsed = asNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstArray(roots: JsonRecord[], keys: string[]): unknown[] {
  const value = firstRaw(roots, keys);
  return Array.isArray(value) ? value : [];
}

/** Mốc thời gian -> epoch ms, null nếu không parse được. */
function toEpoch(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/* ------------------------------------------------------------------ */
/* Chuẩn hoá từng phần                                                 */
/* ------------------------------------------------------------------ */

function normalizeItem(rawItem: unknown): OrderItemView | null {
  if (!isRecord(rawItem)) return null;

  const product = isRecord(rawItem.product)
    ? rawItem.product
    : isRecord(rawItem.products)
      ? rawItem.products
      : null;
  const roots: JsonRecord[] = product ? [rawItem, product] : [rawItem];

  const name =
    firstString(roots, ['product_name', 'productName', 'name', 'ten_san_pham']) ?? 'Sản phẩm';
  const quantity = Math.max(
    1,
    Math.round(firstNumber(roots, ['quantity', 'qty', 'so_luong'], 1))
  );
  const unitPrice = firstNumber(roots, ['unit_price', 'unitPrice', 'price', 'gia'], 0);

  const lineTotalRaw = firstRaw(roots, [
    'line_total',
    'lineTotal',
    'subtotal',
    'sub_total',
    'total',
    'thanh_tien',
  ]);
  const lineTotal =
    lineTotalRaw === undefined || isRecord(lineTotalRaw) || Array.isArray(lineTotalRaw)
      ? unitPrice * quantity
      : asNumber(lineTotalRaw, unitPrice * quantity);

  // `get_order_detail` của DB thật trả cờ `has_reviewed` cho từng dòng sản phẩm.
  const hasReviewedRaw = firstRaw(roots, ['has_reviewed', 'hasReviewed', 'da_danh_gia']);
  const hasReviewed =
    hasReviewedRaw === true || hasReviewedRaw === 'true' || hasReviewedRaw === 't';

  return {
    productId: firstNumberOrNull(roots, ['product_id', 'productId']),
    name,
    quantity,
    unitPrice,
    lineTotal,
    hasReviewed,
    imageUrl: firstString(roots, [
      'image_url',
      'imageUrl',
      'thumbnail_url',
      'thumbnail',
      'product_image',
      'image',
      'anh',
    ]),
    slug: firstString(roots, ['product_slug', 'productSlug', 'slug']),
    unit: firstString(roots, ['unit', 'don_vi']),
  };
}

function normalizeHistoryEntry(rawEntry: unknown): OrderHistoryEntry | null {
  if (!isRecord(rawEntry)) return null;

  const roots = [rawEntry];
  const status = firstString(roots, [
    'status',
    'new_status',
    'order_status',
    'to_status',
    'trang_thai',
  ]);
  if (!status) return null;

  return {
    status,
    note: firstString(roots, ['note', 'reason', 'description', 'message', 'ghi_chu']),
    at: firstString(roots, [
      'created_at',
      'changed_at',
      'updated_at',
      'at',
      'timestamp',
      'time',
      'createdAt',
    ]),
  };
}

function normalizeReview(rawReview: unknown): OrderReviewView | null {
  if (!isRecord(rawReview)) return null;

  const roots = [rawReview];
  const rating = Math.round(firstNumber(roots, ['rating', 'stars', 'so_sao'], 0));
  if (rating < 1 || rating > 5) return null;

  return {
    productId: firstNumberOrNull(roots, ['product_id', 'productId']),
    rating,
    comment: firstString(roots, ['comment', 'content', 'review', 'noi_dung']),
    createdAt: firstString(roots, ['created_at', 'createdAt', 'at']),
  };
}

/* ------------------------------------------------------------------ */
/* API chính                                                           */
/* ------------------------------------------------------------------ */

/**
 * Chuẩn hoá jsonb của `get_order_detail` về `OrderDetailView`.
 * Trả `null` khi payload không giống một đơn hàng (thiếu cả mã đơn lẫn trạng thái).
 */
export function normalizeOrderDetail(raw: unknown): OrderDetailView | null {
  const roots = collectRoots(raw);
  if (roots.length === 0) return null;

  const orderCode = firstString(roots, ['order_code', 'orderCode', 'ma_don', 'code']);
  const status = firstString(roots, ['status', 'order_status', 'trang_thai']);
  if (!orderCode && !status) return null;

  const items = firstArray(roots, [
    'order_items',
    'orderItems',
    'items',
    'details',
    'order_details',
    'chi_tiet',
  ])
    .map(normalizeItem)
    .filter((item): item is OrderItemView => item !== null);

  const itemsSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotalRaw = firstRaw(roots, [
    'subtotal',
    'sub_total',
    'items_total',
    'items_subtotal',
    'goods_total',
    'tam_tinh',
  ]);
  const subtotal =
    subtotalRaw === undefined || isRecord(subtotalRaw) || Array.isArray(subtotalRaw)
      ? itemsSubtotal
      : asNumber(subtotalRaw, itemsSubtotal);

  const shippingFee = firstNumber(
    roots,
    ['shipping_fee', 'shippingFee', 'shipping', 'ship_fee', 'shipping_cost', 'phi_ship'],
    0
  );
  const discount = firstNumber(
    roots,
    ['discount', 'discount_amount', 'discount_total', 'giam_gia', 'voucher_discount'],
    0
  );

  const totalRaw = firstRaw(roots, [
    'total',
    'total_amount',
    'totalAmount',
    'grand_total',
    'final_total',
    'thanh_tien',
  ]);
  const total =
    totalRaw === undefined || isRecord(totalRaw) || Array.isArray(totalRaw)
      ? Math.max(0, subtotal + shippingFee - discount)
      : asNumber(totalRaw, subtotal + shippingFee - discount);

  const createdAt = firstString(roots, ['created_at', 'createdAt', 'ngay_tao', 'ordered_at']);

  const historyEntries = firstArray(roots, [
    'history',
    'order_status_history',
    'status_history',
    'statusHistory',
    'timeline',
    'tracking',
  ])
    .map(normalizeHistoryEntry)
    .filter((entry): entry is OrderHistoryEntry => entry !== null);

  // Sắp xếp tăng dần theo thời gian; mốc không có ngày giữ nguyên thứ tự (sort ổn định).
  historyEntries.sort((a, b) => {
    const ta = toEpoch(a.at);
    const tb = toEpoch(b.at);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  if (historyEntries.length === 0 && createdAt) {
    // Timeline dự phòng khi RPC không trả history.
    historyEntries.push({ status: status ?? 'pending_payment', note: null, at: createdAt });
  }

  return {
    orderId: firstNumberOrNull(roots, ['order_id', 'orderId']),
    orderCode: orderCode ?? '',
    status: status ?? 'pending_payment',
    paymentMethod: firstString(roots, [
      'payment_method',
      'paymentMethod',
      'method',
      'phuong_thuc_thanh_toan',
    ]),
    paymentStatus: firstString(roots, [
      'payment_status',
      'paymentStatus',
      'trang_thai_thanh_toan',
    ]),
    subtotal,
    shippingFee,
    discount,
    total,
    createdAt,
    updatedAt: firstString(roots, ['updated_at', 'updatedAt']),
    paidAt: firstString(roots, ['paid_at', 'paidAt', 'payment_date']),
    expiresAt: firstString(roots, [
      'expires_at',
      'expiresAt',
      'expired_at',
      'payment_expires_at',
      'het_han',
    ]),
    note: firstString(roots, ['note', 'notes', 'customer_note', 'order_note', 'ghi_chu']),
    greeting: firstString(roots, [
      'greeting',
      'wish',
      'greeting_card',
      'greetingCard',
      'card_message',
      'message',
      'loi_chuc',
      // Cột thật public.orders.gift_message (đã xác nhận trong huongque_db_full.sql).
      'gift_message',
      'giftMessage',
    ]),
    receiverName: firstString(roots, [
      'receiver_name',
      'receiverName',
      'customer_name',
      'full_name',
      'shipping_name',
      'ten_nguoi_nhan',
      // Tên cột thật trên public.orders (đã xác nhận trong huongque_db_full.sql).
      'recipient_name',
      'recipientName',
    ]),
    receiverPhone: firstString(roots, [
      'receiver_phone',
      'receiverPhone',
      'customer_phone',
      'phone',
      'shipping_phone',
      'sdt',
      // public.orders.recipient_phone (điều kiện tra cứu của get_payment_status).
      'recipient_phone',
      'recipientPhone',
    ]),
    shippingAddress: firstString(roots, [
      'shipping_address',
      'shippingAddress',
      'receiver_address',
      'recipient_address',
      'address',
      'customer_address',
      'dia_chi',
    ]),
    payosOrderCode: firstNumberOrNull(roots, [
      'payos_order_code',
      'payosOrderCode',
      'payos_code',
    ]),
    payosCheckoutUrl: firstString(roots, [
      'payos_checkout_url',
      'payosCheckoutUrl',
      'checkout_url',
      'checkoutUrl',
      'payment_url',
      'paymentUrl',
      'payos_url',
    ]),
    items,
    history: historyEntries,
    reviews: firstArray(roots, ['reviews', 'product_reviews', 'order_reviews'])
      .map(normalizeReview)
      .filter((review): review is OrderReviewView => review !== null),
  };
}

function normalizeSummary(rawItem: unknown): OrderSummary | null {
  if (!isRecord(rawItem)) return null;
  const roots = collectRoots(rawItem);

  const orderCode = firstString(roots, ['order_code', 'orderCode', 'ma_don', 'code']);
  const status = firstString(roots, ['status', 'order_status', 'trang_thai']);
  if (!orderCode && !status) return null;

  return {
    orderId: firstNumberOrNull(roots, ['order_id', 'orderId']),
    orderCode: orderCode ?? '',
    createdAt: firstString(roots, ['created_at', 'createdAt', 'ngay_tao']),
    status: status ?? 'pending_payment',
    paymentMethod: firstString(roots, ['payment_method', 'paymentMethod', 'method']),
    paymentStatus: firstString(roots, ['payment_status', 'paymentStatus']),
    total: firstNumber(roots, ['total', 'total_amount', 'grand_total', 'final_total'], 0),
    expiresAt: firstString(roots, ['expires_at', 'expiresAt', 'expired_at']),
    itemCount: firstNumber(roots, ['item_count', 'itemCount', 'total_items'], 0),
  };
}

/**
 * Chuẩn hoá kết quả `fn_list_user_orders()` (setof jsonb).
 * Chấp nhận cả mảng thuần lẫn object bọc `{ orders: [...] }`.
 */
export function normalizeOrderSummaries(raw: unknown): OrderSummary[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (isRecord(raw)) {
    const wrapped = raw.orders ?? raw.data ?? raw.result;
    if (Array.isArray(wrapped)) list = wrapped;
  }

  return list
    .map(normalizeSummary)
    .filter((summary): summary is OrderSummary => summary !== null);
}

/* ------------------------------------------------------------------ */
/* Helper hiển thị / quy tắc nghiệp vụ                                 */
/* ------------------------------------------------------------------ */

/** Đơn được phép hủy: chờ thanh toán hoặc đã xác nhận. */
export function isOrderCancellable(status: string | null | undefined): boolean {
  return status === 'pending_payment' || status === 'confirmed';
}

/** Đơn PayOS còn chờ thanh toán, còn hạn và đã có link checkout -> cho phép "Thanh toán ngay". */
export function canPayOrder(order: Pick<
  OrderDetailView,
  'status' | 'paymentMethod' | 'payosCheckoutUrl' | 'expiresAt'
>): boolean {
  if (order.status !== 'pending_payment') return false;
  if (order.paymentMethod !== 'payos') return false;
  if (!order.payosCheckoutUrl) return false;
  // Không có hạn thanh toán coi như không giới hạn thời gian.
  if (!order.expiresAt) return true;
  const deadline = toEpoch(order.expiresAt);
  if (deadline === null) return true;
  return deadline > Date.now();
}

/** Hạn thanh toán đã qua chưa (false khi RPC không trả về hạn). */
export function isPaymentExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const deadline = toEpoch(expiresAt);
  if (deadline === null) return false;
  return deadline <= Date.now();
}

/**
 * Người dùng đã đánh giá sản phẩm này trong đơn chưa.
 * DB thật trả cờ `items[].has_reviewed`; `reviews` chỉ là đường dự phòng.
 */
export function hasReviewedProduct(
  order: Pick<OrderDetailView, 'reviews' | 'items'>,
  productId: number | null
): boolean {
  if (productId === null) return false;
  if (order.items.some((item) => item.productId === productId && item.hasReviewed)) return true;
  return order.reviews.some((review) => review.productId === productId);
}

/** Che bớt số điện thoại khi hiển thị cho khách vãng lai: 0901234567 -> 090***4567 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\s+/g, '');
  if (digits.length < 7) return '•••';
  return `${digits.slice(0, 3)}***${digits.slice(-4)}`;
}
