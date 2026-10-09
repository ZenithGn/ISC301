'use server';

/**
 * C12/C13 — Server Actions cho đơn hàng của khách.
 *
 * NGUYÊN TẮC BẢO MẬT (tiêu chí nghiệm thu task-3):
 *  - Mọi action đều gọi `requireUser()` trước khi chạm dữ liệu.
 *  - KHÔNG bao giờ tin `order_id` / `payos_order_code` do client gửi lên: hai giá trị này
 *    luôn được đọc lại từ RPC bằng chính phiên đăng nhập của người dùng.
 *  - Bảng `orders` / `order_items` / `payments` KHÔNG được query trực tiếp (không có GRANT
 *    cho anon) — chỉ dùng RPC.
 *
 * RPC dùng ở đây:
 *  - `get_order_detail(p_order_code text, p_phone text?)` -> jsonb
 *      Đã đăng nhập: BỎ TRỐNG p_phone. Khách vãng lai: truyền p_phone.
 *      Không tìm thấy -> lỗi P0001 với message `Không tìm thấy đơn hàng`.
 *  - `fn_list_user_orders()` -> setof jsonb (chưa có trong DB, Lead cấp trong migration PayOS)
 *  - `update_order_status(p_order_id bigint, p_new_status text, p_note text)` (cần đăng nhập)
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { cancelPaymentLink } from '@/lib/payos';
import {
  isOrderCancellable,
  normalizeOrderDetail,
  normalizeOrderSummaries,
  type OrderDetailView,
  type OrderSummary,
} from '@/components/orders/order-detail';

export interface OrderLookupResult {
  ok: boolean;
  message?: string;
  order?: OrderDetailView;
}

export interface UserOrderListResult {
  orders: OrderSummary[];
  /** true khi DB chưa có RPC `fn_list_user_orders` (migration PayOS chưa chạy). */
  migrationPending: boolean;
  message?: string;
}

export interface CancelOrderState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const NOT_FOUND_MESSAGE = 'Không tìm thấy đơn hàng';
const GENERIC_LOAD_ERROR = 'Không tải được đơn hàng. Vui lòng thử lại sau.';

interface PgErrorLike {
  message?: string;
  code?: string;
}

/** PostgREST báo "function ... does not exist" (PGRST202) khi migration chưa chạy. */
function isMigrationPendingError(error: PgErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST202') return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('could not find the function') ||
    (message.includes('fn_list_user_orders') && message.includes('does not exist'))
  );
}

/**
 * RPC ném P0001 với message `Không tìm thấy đơn hàng`.
 * Bắt theo nội dung message (không phụ thuộc error.code vì PostgREST trả về P0001).
 */
function isNotFoundError(error: PgErrorLike | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return message.includes('không tìm thấy') || message.includes('khong tim thay');
}

/** Thông điệp lỗi từ RPC: chỉ hiển thị khi là câu tiếng Việt ngắn, ngược lại dùng câu chung. */
function safeServerMessage(error: PgErrorLike | null | undefined, fallback: string): string {
  const message = (error?.message ?? '').trim();
  if (!message || message.length > 200) return fallback;
  if (/\b(relation|column|permission denied|syntax|constraint|violates)\b/i.test(message)) {
    return fallback;
  }
  return /[àáảãạăâđêôơư]/i.test(message) ? message : fallback;
}

/** Chuẩn hoá SĐT: bỏ ký tự lạ, đổi +84/84 về dạng 0xxxxxxxxx. */
function normalizePhone(input: string): string {
  const digits = (input ?? '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * C12: danh sách đơn của chính người dùng qua `fn_list_user_orders()`.
 * Chưa có RPC (migration chưa chạy) -> trả `migrationPending: true` để UI hiện
 * "Cần chạy migration" thay vì crash.
 */
export async function listUserOrders(): Promise<UserOrderListResult> {
  await requireUser('/tai-khoan/don-hang');

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('fn_list_user_orders');

    if (error) {
      if (isMigrationPendingError(error)) {
        return { orders: [], migrationPending: true };
      }
      console.error('[orders] fn_list_user_orders lỗi:', error.message);
      return {
        orders: [],
        migrationPending: false,
        message: 'Không tải được danh sách đơn hàng. Vui lòng thử lại sau.',
      };
    }

    return { orders: normalizeOrderSummaries(data), migrationPending: false };
  } catch (error) {
    console.error('[orders] listUserOrders lỗi:', error);
    return {
      orders: [],
      migrationPending: false,
      message: 'Không tải được danh sách đơn hàng. Vui lòng thử lại sau.',
    };
  }
}

/**
 * C13: chi tiết đơn của người dùng đã đăng nhập.
 * KHÔNG truyền p_phone — RPC tự lọc theo `auth.uid()`.
 */
export async function getOrderDetailForUser(orderCode: string): Promise<OrderLookupResult> {
  const code = (orderCode ?? '').trim();
  await requireUser(code ? `/tai-khoan/don-hang/${encodeURIComponent(code)}` : undefined);

  if (!code) return { ok: false, message: NOT_FOUND_MESSAGE };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_order_detail', { p_order_code: code });

    if (error) {
      if (isNotFoundError(error)) return { ok: false, message: NOT_FOUND_MESSAGE };
      console.error('[orders] get_order_detail lỗi:', error.message);
      return { ok: false, message: GENERIC_LOAD_ERROR };
    }

    const order = normalizeOrderDetail(data);
    if (!order || !order.orderCode) return { ok: false, message: NOT_FOUND_MESSAGE };

    return { ok: true, order };
  } catch (error) {
    console.error('[orders] getOrderDetailForUser lỗi:', error);
    return { ok: false, message: GENERIC_LOAD_ERROR };
  }
}

/**
 * /tra-cuu-don: khách vãng lai tra cứu bằng mã đơn + SĐT.
 * Cần ĐÚNG cả hai để RPC trả dữ liệu (không đăng nhập).
 */
export async function lookupGuestOrder(
  orderCode: string,
  phone: string
): Promise<OrderLookupResult> {
  const code = (orderCode ?? '').trim();
  const cleanPhone = normalizePhone(phone);

  if (!code || !cleanPhone) {
    return { ok: false, message: 'Vui lòng nhập mã đơn hàng và số điện thoại.' };
  }
  if (cleanPhone.length < 9 || cleanPhone.length > 11) {
    return { ok: false, message: 'Số điện thoại không hợp lệ.' };
  }
  if (code.length > 40) {
    return { ok: false, message: NOT_FOUND_MESSAGE };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_order_detail', {
      p_order_code: code,
      p_phone: cleanPhone,
    });

    if (error) {
      if (isNotFoundError(error)) return { ok: false, message: NOT_FOUND_MESSAGE };
      console.error('[orders] tra cứu đơn lỗi:', error.message);
      return { ok: false, message: GENERIC_LOAD_ERROR };
    }

    const order = normalizeOrderDetail(data);
    if (!order || !order.orderCode) return { ok: false, message: NOT_FOUND_MESSAGE };

    return { ok: true, order };
  } catch (error) {
    console.error('[orders] lookupGuestOrder lỗi:', error);
    return { ok: false, message: GENERIC_LOAD_ERROR };
  }
}

/**
 * C13: hủy đơn (chỉ khi `pending_payment` hoặc `confirmed`).
 *
 * Luồng:
 *  1. `requireUser()`.
 *  2. Đọc lại đơn bằng RPC với phiên người dùng -> xác thực quyền sở hữu + lấy trạng thái thật.
 *  3. Từ chối hủy nếu trạng thái không cho phép (kiểm tra ở SERVER, không tin client).
 *  4. `update_order_status(order_id, 'cancelled', lý do)`.
 *  5. Best-effort hủy link PayOS — lỗi bước này KHÔNG làm hỏng việc hủy đơn.
 */
export async function cancelOrderAction(
  prevState: CancelOrderState | null,
  formData: FormData
): Promise<CancelOrderState> {
  const orderCode = String(formData.get('orderCode') ?? '').trim();
  const rawReason = String(formData.get('reason') ?? '').trim();
  const reason = (rawReason || 'Khách hàng hủy đơn').slice(0, 300);

  await requireUser(orderCode ? `/tai-khoan/don-hang/${encodeURIComponent(orderCode)}` : undefined);

  if (!orderCode) {
    return { status: 'error', message: 'Thiếu mã đơn hàng.' };
  }

  try {
    const supabase = await createClient();

    // Bước 2: RPC tự kiểm tra đơn thuộc về user đang đăng nhập.
    const { data, error } = await supabase.rpc('get_order_detail', { p_order_code: orderCode });
    if (error || !data) {
      return { status: 'error', message: NOT_FOUND_MESSAGE };
    }

    const order = normalizeOrderDetail(data);
    if (!order || !order.orderCode) {
      return { status: 'error', message: NOT_FOUND_MESSAGE };
    }

    if (!isOrderCancellable(order.status)) {
      return { status: 'error', message: 'Đơn hàng ở trạng thái này không thể hủy.' };
    }

    // Bước 3: order_id lấy từ server. `get_order_detail` có thể không trả order_id,
    // khi đó lấy từ `fn_list_user_orders()` (contract: order_id + order_code).
    let orderId = order.orderId;
    if (orderId === null) {
      const { data: listData, error: listError } = await supabase.rpc('fn_list_user_orders');
      if (!listError) {
        const summary = normalizeOrderSummaries(listData).find(
          (item) => item.orderCode === order.orderCode
        );
        orderId = summary?.orderId ?? null;
      }
    }

    if (orderId === null) {
      return {
        status: 'error',
        message: 'Không xác định được đơn hàng để hủy. Vui lòng liên hệ hỗ trợ.',
      };
    }

    const { error: updateError } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: 'cancelled',
      p_note: reason,
    });

    if (updateError) {
      console.error('[orders] update_order_status lỗi:', updateError.message);
      return {
        status: 'error',
        message: safeServerMessage(updateError, 'Không hủy được đơn hàng. Vui lòng thử lại.'),
      };
    }

    // Bước 5: best-effort — lỗi PayOS không được làm hỏng kết quả hủy đơn.
    if (order.paymentMethod === 'payos' && order.payosOrderCode !== null) {
      try {
        await cancelPaymentLink(order.payosOrderCode, reason);
      } catch (payosError) {
        console.error(
          '[orders] Đã hủy đơn nhưng không hủy được link PayOS:',
          payosError instanceof Error ? payosError.message : payosError
        );
      }
    }

    revalidatePath('/tai-khoan/don-hang');
    revalidatePath(`/tai-khoan/don-hang/${encodeURIComponent(order.orderCode || orderCode)}`);
    revalidatePath('/tra-cuu-don');

    return { status: 'success', message: 'Đã hủy đơn hàng.' };
  } catch (error) {
    console.error('[orders] cancelOrderAction lỗi:', error);
    return { status: 'error', message: 'Có lỗi xảy ra khi hủy đơn. Vui lòng thử lại.' };
  }
}
