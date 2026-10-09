/**
 * Tầng ĐỌC dữ liệu cho khu vực quản trị (A01–A06, F11).
 *
 * Mọi truy vấn ở đây chạy SERVER-SIDE. Nơi gọi (page/Server Action) phải
 * đã gọi `requireAdmin()` từ '@/lib/auth' trước.
 *
 * Bảng `orders`, `order_items`, `payments`, `coupons`, `order_status_history`
 * KHÔNG cấp GRANT cho anon ⇒ buộc phải đọc qua service_role. Khi thiếu
 * SUPABASE_SERVICE_ROLE_KEY, các hàm trả về `needsServiceRole: true` để UI
 * hiện thông báo cấu hình thay vì crash trắng trang.
 *
 * TODO(lead): khoá lại tên cột sau khi có schema dump. Hiện tại mọi dòng
 * được map qua MỘT hàm `mapOrderRow()` duy nhất với danh sách alias.
 */

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { getArrayByKeys, hasKey, pickBoolean, pickNumber, pickString } from '@/lib/json-utils';
import { translateDbError, MISSING_SERVICE_ROLE_MESSAGE } from './shared';
import { ADMIN_PAGE_SIZE, paginateAdmin, type AdminPage } from './pagination';
import type { Product, Category } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu đã chuẩn hoá                                           */
/* ------------------------------------------------------------------ */

export interface AdminOrderRow {
  id: number | null;
  code: string;
  createdAt: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  customerName: string;
  customerPhone: string;
  province: string;
  expiresAt: string | null;
  payosOrderCode: number | null;
  userId: string | null;
  raw: unknown;
}

export interface AdminOrderItemRow {
  productId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  raw: unknown;
}

export interface AdminPaymentRow {
  id: number | null;
  orderId: number | null;
  provider: string;
  amount: number;
  reference: string | null;
  isSuccess: boolean;
  createdAt: string | null;
  raw: unknown;
}

export interface AdminHistoryRow {
  status: string;
  note: string | null;
  createdAt: string | null;
  raw: unknown;
}

export interface AdminCouponRow {
  id: number | null;
  code: string;
  usedCount: number;
  usageLimit: number | null;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  raw: unknown;
}

export interface AdminBannerRow {
  banner_id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/* ------------------------------------------------------------------ */
/* Adapter phòng thủ                                                   */
/* ------------------------------------------------------------------ */

/**
 * TODO(lead): khoá lại tên cột sau khi có schema dump của bảng `orders`.
 * Danh sách alias dưới đây bám theo gợi ý của Lead (order_id, order_code,
 * recipient_name|customer_name, ...). Khi có dump, chỉ cần rút gọn mảng.
 */
export function mapOrderRow(row: unknown): AdminOrderRow {
  const idRaw = pickString(row, ['order_id', 'orderid', 'id']);
  const id = idRaw !== null && /^\d+$/.test(idRaw) ? Number(idRaw) : null;
  const payosRaw = pickString(row, ['payos_order_code', 'payosordercode']);

  return {
    id,
    code: pickString(row, ['order_code', 'ordercode', 'code']) ?? (id !== null ? String(id) : '—'),
    createdAt: pickString(row, ['created_at', 'createdat', 'created_date', 'order_date']),
    status: pickString(row, ['status', 'order_status', 'trang_thai']) ?? 'unknown',
    paymentMethod: pickString(row, ['payment_method', 'paymentmethod', 'method']) ?? 'unknown',
    paymentStatus: pickString(row, ['payment_status', 'paymentstatus']) ?? 'unknown',
    total: pickNumber(row, ['total', 'total_amount', 'totalamount', 'grand_total', 'final_amount']),
    customerName:
      pickString(row, [
        'recipient_name',
        'recipientname',
        'customer_name',
        'customername',
        'full_name',
        'name',
      ]) ?? '—',
    customerPhone:
      pickString(row, [
        'recipient_phone',
        'recipientphone',
        'customer_phone',
        'phone',
        'phone_number',
      ]) ?? '—',
    province:
      pickString(row, [
        'province',
        'shipping_address',
        'shippingaddress',
        'address',
        'delivery_address',
      ]) ?? '—',
    expiresAt: pickString(row, ['expires_at', 'expiresat', 'expired_at', 'payment_expires_at']),
    payosOrderCode:
      payosRaw !== null && /^\d+$/.test(payosRaw) ? Number(payosRaw) : null,
    userId: pickString(row, ['user_id', 'userid', 'customer_id', 'customerid']),
    raw: row,
  };
}

/** TODO(lead): khoá lại tên cột sau khi có schema dump của bảng `order_items`. */
export function mapOrderItemRow(row: unknown): AdminOrderItemRow {
  const quantity = pickNumber(row, ['quantity', 'qty', 'so_luong'], 1);
  const unitPrice = pickNumber(row, ['unit_price', 'unitprice', 'price', 'don_gia']);
  const subtotal = pickNumber(
    row,
    ['subtotal', 'line_total', 'linetotal', 'total', 'amount'],
    unitPrice * quantity
  );
  const productIdRaw = pickString(row, ['product_id', 'productid']);

  return {
    productId: productIdRaw !== null && /^\d+$/.test(productIdRaw) ? Number(productIdRaw) : null,
    name:
      pickString(row, ['product_name', 'productname', 'name', 'ten_san_pham']) ?? 'Sản phẩm',
    quantity,
    unitPrice,
    subtotal,
    raw: row,
  };
}

/** TODO(lead): khoá lại tên cột sau khi có schema dump của bảng `payments`. */
export function mapPaymentRow(row: unknown): AdminPaymentRow {
  const orderIdRaw = pickString(row, ['order_id', 'orderid']);
  const idRaw = pickString(row, ['payment_id', 'paymentid', 'id']);
  const isSuccess = pickBoolean(row, ['is_success', 'issuccess', 'success', 'paid'], false);

  return {
    id: idRaw !== null && /^\d+$/.test(idRaw) ? Number(idRaw) : null,
    orderId: orderIdRaw !== null && /^\d+$/.test(orderIdRaw) ? Number(orderIdRaw) : null,
    provider: pickString(row, ['provider', 'payment_method', 'paymentmethod', 'gateway']) ?? '—',
    amount: pickNumber(row, ['amount', 'total', 'paid_amount']),
    reference:
      pickString(row, ['transaction_no', 'transactionno', 'reference', 'reference_id', 'txn_ref']) ??
      null,
    isSuccess,
    createdAt: pickString(row, ['created_at', 'createdat', 'paid_at', 'transaction_time']),
    raw: row,
  };
}

/** TODO(lead): khoá lại tên cột sau khi có schema dump của bảng `order_status_history`. */
export function mapHistoryRow(row: unknown): AdminHistoryRow {
  return {
    status: pickString(row, ['new_status', 'newstatus', 'status', 'to_status']) ?? '—',
    note: pickString(row, ['note', 'reason', 'ghi_chu']),
    createdAt: pickString(row, ['created_at', 'createdat', 'changed_at']),
    raw: row,
  };
}

/** TODO(lead): khoá lại tên cột sau khi có schema dump của bảng `coupons`. */
export function mapCouponRow(row: unknown): AdminCouponRow {
  const idRaw = pickString(row, ['coupon_id', 'couponid', 'id']);
  const usageRaw = pickString(row, ['usage_limit', 'usagelimit', 'limit', 'max_uses']);

  return {
    id: idRaw !== null && /^\d+$/.test(idRaw) ? Number(idRaw) : null,
    code: pickString(row, ['code', 'coupon_code', 'couponcode']) ?? '—',
    usedCount: pickNumber(row, ['used_count', 'usedcount', 'used']),
    usageLimit: usageRaw !== null && /^\d+$/.test(usageRaw) ? Number(usageRaw) : null,
    discountType:
      pickString(row, ['discount_type', 'discounttype', 'type', 'loai_giam']) ?? 'percent',
    discountValue: pickNumber(row, ['discount_value', 'discountvalue', 'value', 'amount']),
    minOrderValue: pickNumber(row, [
      'min_order_amount',
      'minorderamount',
      'min_order_value',
      'minordervalue',
      'min_order',
      'minorder',
    ]),
    isActive: pickBoolean(row, ['is_active', 'isactive', 'active'], true),
    startsAt: pickString(row, ['starts_at', 'startsat', 'start_date', 'start']),
    expiresAt: pickString(row, ['expires_at', 'expiresat', 'ends_at', 'end_date', 'expired_at']),
    raw: row,
  };
}

/* ------------------------------------------------------------------ */
/* Kiểu kết quả chung                                                  */
/* ------------------------------------------------------------------ */

export interface QueryOutcome<T> {
  data: T;
  /** Thông báo lỗi tiếng Việt (null nếu thành công). */
  error: string | null;
  /** true khi thiếu SUPABASE_SERVICE_ROLE_KEY nên không đọc được bảng. */
  needsServiceRole: boolean;
}

function missingServiceRole<T>(empty: T): QueryOutcome<T> {
  return { data: empty, error: MISSING_SERVICE_ROLE_MESSAGE, needsServiceRole: true };
}

/* ------------------------------------------------------------------ */
/* A01 – Dashboard                                                     */
/* ------------------------------------------------------------------ */

export interface DashboardSummary {
  totalRevenue: number | null;
  totalOrders: number | null;
  avgOrderValue: number | null;
  newCustomers: number | null;
  ordersNeedingAction: number | null;
  pendingPaymentOrders: number | null;
}

export interface DailyRevenuePoint {
  label: string;
  dateKey: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductRow {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMixSlice {
  method: string;
  orderCount: number;
  revenue: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  daily: DailyRevenuePoint[];
  topProducts: TopProductRow[];
  paymentMix: PaymentMixSlice[];
  errors: string[];
}

function numOrNull(source: unknown, keys: string[]): number | null {
  if (!hasKey(source, keys)) return null;
  const value = pickNumber(source, keys, NaN);
  return Number.isFinite(value) ? value : null;
}

/** RPC admin_* tự kiểm tra is_admin() ⇒ gọi bằng client phiên đăng nhập. */
async function callRpc(
  supabase: SupabaseClient,
  name: string,
  args?: Record<string, unknown>
): Promise<{ data: unknown; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc(name, args ?? {});
    if (error) return { data: null, error: error.message };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

/**
 * A01: gom 4 RPC thành một lần gọi song song.
 * KHÔNG ném lỗi: mỗi RPC hỏng sẽ được ghi vào `errors` để UI hiện cảnh báo.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];
  const supabase = await createClient();

  const [summaryRes, dailyRes, topRes, mixRes] = await Promise.all([
    callRpc(supabase, 'admin_dashboard_summary'),
    callRpc(supabase, 'admin_daily_revenue'),
    callRpc(supabase, 'admin_top_products', { p_limit: 5 }),
    callRpc(supabase, 'admin_payment_mix'),
  ]);

  const label = (name: string) => `Không tải được số liệu "${name}"`;
  if (summaryRes.error) errors.push(`${label('Tổng quan')}: ${summaryRes.error}`);
  if (dailyRes.error) errors.push(`${label('Doanh thu 30 ngày')}: ${dailyRes.error}`);
  if (topRes.error) errors.push(`${label('Top sản phẩm')}: ${topRes.error}`);
  if (mixRes.error) errors.push(`${label('Tỷ lệ thanh toán')}: ${mixRes.error}`);

  // TODO(lead): khoá lại hình dạng JSON của admin_dashboard_summary() sau khi có dump.
  const summarySource = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
  const summary: DashboardSummary = {
    totalRevenue: numOrNull(summarySource, [
      'total_revenue',
      'totalrevenue',
      'revenue',
      'doanh_thu',
      'total_amount',
    ]),
    totalOrders: numOrNull(summarySource, [
      'total_orders',
      'totalorders',
      'orders',
      'order_count',
      'so_don',
    ]),
    avgOrderValue: numOrNull(summarySource, [
      'avg_order_value',
      'avgordervalue',
      'average_order_value',
      'avg_total',
      'aov',
    ]),
    newCustomers: numOrNull(summarySource, [
      'new_customers',
      'newcustomers',
      'customers',
      'new_customer_count',
      'khach_moi',
    ]),
    ordersNeedingAction: numOrNull(summarySource, [
      'orders_needing_action',
      'ordersneedingaction',
      'orders_to_process',
      'orderstoprocess',
      'need_action',
      'action_orders',
      'pending_action',
    ]),
    pendingPaymentOrders: numOrNull(summarySource, [
      'pending_payment_count',
      'pendingpaymentcount',
      'pending_payment_orders',
      'pendingpaymentorders',
      'pending_payment',
      'unpaid_orders',
    ]),
  };

  /**
   * `admin_daily_revenue()`, `admin_top_products()`, `admin_payment_mix()` trả về
   * MẢNG Ở CẤP GỐC (PostgREST trả thẳng JSON array), nên không thể dùng
   * `getArrayByKeys` (hàm đó đi tìm key trong object). Nhận cả hai dạng.
   */
  const rowsFrom = (value: unknown, keys: string[]): unknown[] => {
    if (Array.isArray(value)) return value;
    return getArrayByKeys(value, keys);
  };

  // TODO(lead): khoá lại hình dạng JSON của admin_daily_revenue().
  // Hình dạng thật (đã kiểm chứng trên DB): [{ sale_date, revenue, order_count }, ...]
  const daily: DailyRevenuePoint[] = rowsFrom(dailyRes.data, [
    'daily_revenue',
    'daily',
    'items',
    'rows',
  ])
    .map((row) => {
      const dateRaw =
        pickString(row, ['sale_date', 'sales_date', 'day', 'date', 'revenue_date', 'created_at', 'd', 'ngay']) ?? '';
      return {
        label: dateRaw ? formatVNShortDate(dateRaw) : '',
        dateKey: dateRaw.slice(0, 10),
        revenue: pickNumber(row, ['revenue', 'total_revenue', 'amount', 'total', 'doanh_thu']),
        orderCount: pickNumber(row, ['order_count', 'ordercount', 'count', 'orders', 'total_orders']),
      };
    })
    .filter((point) => point.dateKey !== '');

  // TODO(lead): khoá lại hình dạng JSON của admin_top_products(p_limit).
  // Hình dạng thật: [{ product_id, name, slug, thumbnail_url, quantity_sold, revenue }, ...]
  const topProducts: TopProductRow[] = rowsFrom(topRes.data, [
    'top_products',
    'products',
    'items',
    'rows',
  ]).map((row) => ({
    name: pickString(row, ['product_name', 'name', 'ten', 'ten_san_pham']) ?? '—',
    quantity: pickNumber(row, [
      'quantity_sold',
      'quantitysold',
      'quantity',
      'qty',
      'sold',
      'total_quantity',
      'sold_count',
    ]),
    revenue: pickNumber(row, ['revenue', 'total_revenue', 'amount', 'total', 'doanh_thu']),
  }));

  // TODO(lead): khoá lại hình dạng JSON của admin_payment_mix().
  // Hình dạng thật: [{ payment_method, order_count, revenue, share_percent }, ...]
  const paymentMix: PaymentMixSlice[] = rowsFrom(mixRes.data, [
    'payment_mix',
    'mix',
    'items',
    'rows',
  ]).map((row) => ({
    method:
      pickString(row, ['payment_method', 'paymentmethod', 'method', 'provider', 'name']) ?? '—',
    orderCount: pickNumber(row, ['order_count', 'ordercount', 'count', 'orders', 'total_orders']),
    revenue: pickNumber(row, ['revenue', 'amount', 'total', 'total_amount']),
  }));

  return { summary, daily, topProducts, paymentMix, errors };
}

function formatVNShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam, dùng để lọc khoảng ngày. */
export function vnDateKey(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts;
}

/* ------------------------------------------------------------------ */
/* A05 – Đơn hàng                                                      */
/* ------------------------------------------------------------------ */

export interface OrderFilters {
  status?: string;
  method?: string;
  from?: string;
  to?: string;
  keyword?: string;
}

export const MAX_ADMIN_ORDERS = 300;

/**
 * Đọc danh sách đơn rồi lọc trong bộ nhớ để không phụ thuộc tên cột khi
 * truy vấn (schema orders chưa được khoá).
 */
export async function listOrders(
  filters: OrderFilters = {}
): Promise<QueryOutcome<AdminOrderRow[]>> {
  if (!hasSupabaseAdminConfig()) return missingServiceRole<AdminOrderRow[]>([]);

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('orders').select('*').limit(MAX_ADMIN_ORDERS);

  if (error) {
    return {
      data: [],
      error: translateDbError(error.message, 'Không đọc được danh sách đơn hàng.'),
      needsServiceRole: false,
    };
  }

  let rows = (data ?? []).map(mapOrderRow);
  rows.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  const keyword = (filters.keyword ?? '').trim().toLowerCase();
  const keywordDigits = keyword.replace(/\D/g, '');

  rows = rows.filter((order) => {
    if (filters.status && filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.method && filters.method !== 'all' && order.paymentMethod !== filters.method) {
      return false;
    }
    if (filters.from || filters.to) {
      const key = vnDateKey(order.createdAt);
      if (!key) return false;
      if (filters.from && key < filters.from) return false;
      if (filters.to && key > filters.to) return false;
    }
    if (keyword) {
      const code = order.code.toLowerCase();
      const phoneDigits = order.customerPhone.replace(/\D/g, '');
      const name = order.customerName.toLowerCase();
      const matched =
        code.includes(keyword) ||
        name.includes(keyword) ||
        (keywordDigits.length > 0 && phoneDigits.includes(keywordDigits));
      if (!matched) return false;
    }
    return true;
  });

  return { data: rows, error: null, needsServiceRole: false };
}

/**
 * A05 – Bản PHÂN TRANG của `listOrders()`.
 *
 * Hàm `listOrders()` phía trên giữ nguyên chữ ký và hành vi (mọi nơi đang gọi
 * vẫn chạy đúng); hàm này lọc y hệt rồi cắt ra đúng một trang kèm tổng số dòng
 * để UI hiện "Trang x/y · tổng N".
 */
export async function listOrdersPaged(
  filters: OrderFilters = {},
  page = 1,
  pageSize: number = ADMIN_PAGE_SIZE
): Promise<QueryOutcome<AdminPage<AdminOrderRow>>> {
  const outcome = await listOrders(filters);
  return { ...outcome, data: paginateAdmin(outcome.data, page, pageSize) };
}

export interface AdminOrderDetail {
  order: AdminOrderRow | null;
  items: AdminOrderItemRow[];
  payments: AdminPaymentRow[];
  history: AdminHistoryRow[];
  errors: string[];
  needsServiceRole: boolean;
}

/** Đọc một đơn + items + payments + lịch sử trạng thái. Lỗi phụ không làm hỏng trang. */
export async function getOrderDetail(orderId: number): Promise<AdminOrderDetail> {
  const empty: AdminOrderDetail = {
    order: null,
    items: [],
    payments: [],
    history: [],
    errors: [],
    needsServiceRole: false,
  };

  if (!hasSupabaseAdminConfig()) {
    return {
      ...empty,
      errors: [MISSING_SERVICE_ROLE_MESSAGE],
      needsServiceRole: true,
    };
  }

  const db = getSupabaseAdmin();
  const errors: string[] = [];

  // 1. Đơn hàng
  let orderRow: unknown = null;
  const direct = await db.from('orders').select('*').eq('order_id', orderId).maybeSingle();
  if (!direct.error && direct.data) {
    orderRow = direct.data;
  } else {
    if (direct.error) {
      // Có thể tên cột khoá khác 'order_id' → quét tối đa MAX_ADMIN_ORDERS dòng.
      const fallback = await db.from('orders').select('*').limit(MAX_ADMIN_ORDERS);
      if (fallback.error) {
        errors.push(translateDbError(fallback.error.message, 'Không đọc được đơn hàng.'));
      } else {
        orderRow =
          (fallback.data ?? []).find((row) => mapOrderRow(row).id === orderId) ?? null;
      }
    }
  }

  // 2. Items / payments / history – cùng chiến lược eq + fallback lọc JS.
  const children = await Promise.all([
    fetchRelated(db, 'order_items', orderId),
    fetchRelated(db, 'payments', orderId),
    fetchRelated(db, 'order_status_history', orderId),
  ]);

  if (children[0].error) {
    errors.push(translateDbError(children[0].error, 'Không đọc được chi tiết sản phẩm của đơn.'));
  }
  if (children[1].error) {
    errors.push(translateDbError(children[1].error, 'Không đọc được lịch sử thanh toán.'));
  }
  if (children[2].error) {
    errors.push(translateDbError(children[2].error, 'Không đọc được lịch sử trạng thái đơn.'));
  }

  const order = orderRow ? mapOrderRow(orderRow) : null;

  return {
    order,
    items: children[0].rows.map(mapOrderItemRow),
    payments: children[1].rows.map(mapPaymentRow),
    history: children[2].rows.map(mapHistoryRow).reverse(),
    errors,
    needsServiceRole: false,
  };
}

async function fetchRelated(
  db: SupabaseClient,
  table: string,
  orderId: number
): Promise<{ rows: unknown[]; error: string | null }> {
  const direct = await db.from(table).select('*').eq('order_id', orderId).limit(500);
  if (!direct.error) return { rows: direct.data ?? [], error: null };

  const fallback = await db.from(table).select('*').limit(1000);
  if (fallback.error) return { rows: [], error: fallback.error.message };

  const rows = (fallback.data ?? []).filter((row) => {
    const raw = pickString(row, ['order_id', 'orderid']);
    return raw !== null && Number(raw) === orderId;
  });
  return { rows, error: null };
}

/* ------------------------------------------------------------------ */
/* A06 – Mã giảm giá                                                   */
/* ------------------------------------------------------------------ */

export async function listCoupons(): Promise<QueryOutcome<AdminCouponRow[]>> {
  if (!hasSupabaseAdminConfig()) return missingServiceRole<AdminCouponRow[]>([]);

  const db = getSupabaseAdmin();
  const { data, error } = await db.from('coupons').select('*').limit(500);

  if (error) {
    return {
      data: [],
      error: translateDbError(error.message, 'Không đọc được danh sách mã giảm giá.'),
      needsServiceRole: false,
    };
  }

  const rows = (data ?? []).map(mapCouponRow);
  rows.sort((a, b) => a.code.localeCompare(b.code));
  return { data: rows, error: null, needsServiceRole: false };
}

/** A06 – Bản PHÂN TRANG của `listCoupons()` (hàm cũ giữ nguyên chữ ký). */
export async function listCouponsPaged(
  page = 1,
  pageSize: number = ADMIN_PAGE_SIZE
): Promise<QueryOutcome<AdminPage<AdminCouponRow>>> {
  const outcome = await listCoupons();
  return { ...outcome, data: paginateAdmin(outcome.data, page, pageSize) };
}

/* ------------------------------------------------------------------ */
/* A02/A03 – Sản phẩm & danh mục                                       */
/* ------------------------------------------------------------------ */

export async function listProductsAdmin(): Promise<Product[]> {
  try {
    const db = hasSupabaseAdminConfig() ? getSupabaseAdmin() : await createClient();
    const { data, error } = await db
      .from('products')
      .select('*, category:categories(*)')
      .order('product_id', { ascending: false });

    if (error || !data) {
      console.error('listProductsAdmin error:', error);
      return [];
    }
    return data as unknown as Product[];
  } catch (err) {
    console.error('listProductsAdmin exception:', err);
    return [];
  }
}

export async function getProductById(productId: number): Promise<Product | null> {
  try {
    const db = hasSupabaseAdminConfig() ? getSupabaseAdmin() : await createClient();
    const { data, error } = await db
      .from('products')
      .select('*, category:categories(*)')
      .eq('product_id', productId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as Product;
  } catch (err) {
    console.error('getProductById exception:', err);
    return null;
  }
}

export async function listCategoriesAdmin(): Promise<Category[]> {
  try {
    const db = hasSupabaseAdminConfig() ? getSupabaseAdmin() : await createClient();
    const { data, error } = await db
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data) {
      console.error('listCategoriesAdmin error:', error);
      return [];
    }
    return data as unknown as Category[];
  } catch (err) {
    console.error('listCategoriesAdmin exception:', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* F11 – Banner                                                        */
/* ------------------------------------------------------------------ */

export async function listBanners(): Promise<QueryOutcome<AdminBannerRow[]>> {
  if (!hasSupabaseAdminConfig()) return missingServiceRole<AdminBannerRow[]>([]);

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return {
      data: [],
      error: translateDbError(error.message, 'Không đọc được danh sách banner.'),
      needsServiceRole: false,
    };
  }

  return { data: (data ?? []) as unknown as AdminBannerRow[], error: null, needsServiceRole: false };
}

/** F11 – Bản PHÂN TRANG của `listBanners()` (hàm cũ giữ nguyên chữ ký). */
export async function listBannersPaged(
  page = 1,
  pageSize: number = ADMIN_PAGE_SIZE
): Promise<QueryOutcome<AdminPage<AdminBannerRow>>> {
  const outcome = await listBanners();
  return { ...outcome, data: paginateAdmin(outcome.data, page, pageSize) };
}
