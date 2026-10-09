/**
 * Đối soát PayOS — dùng CHUNG cho: nút "Kiểm tra với PayOS" ở A05, endpoint
 * `/api/payos/reconcile`, và bước tự đối soát khi khách quay về C07.
 *
 * Vì sao cần: webhook có thể không tới được server (dev dùng localhost, URL webhook
 * chưa đăng ký, sai checksum key…). Khi đó đơn kẹt `pending_payment` dù PayOS đã thu
 * tiền. Hàm này hỏi thẳng API PayOS và ghi nhận qua `record_payos_result` (4 tham số,
 * idempotent, có kiểm tra số tiền).
 *
 * CHỈ chạy ở server (dùng service_role).
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getPaymentLink, PayosApiError, PayosConfigError } from '@/lib/payos';

export type ReconcileCode =
  | 'CONFIRMED'
  | 'ALREADY_PAID'
  | 'AMOUNT_MISMATCH'
  | 'LATE_PAYMENT'
  | 'ORDER_NOT_FOUND'
  | 'WRONG_METHOD'
  | 'NOT_PAID'
  | 'PAYOS_ERROR'
  | 'CONFIG_ERROR'
  | 'DB_ERROR'
  | 'COOLDOWN';

export interface ReconcileResult {
  ok: boolean;
  result: ReconcileCode;
  /** Thông báo tiếng Việt để hiển thị cho admin/khách. */
  message: string;
  /** Số tiền PayOS báo đã nhận (nếu có). */
  amountPaid?: number;
}

/** Chống gọi PayOS liên tục cho cùng một đơn (mỗi tiến trình). */
const COOLDOWN_MS = 10_000;
const lastRunAt = new Map<number, number>();

export function reconcileCooldownRemaining(payosOrderCode: number): number {
  const last = lastRunAt.get(payosOrderCode);
  if (!last) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

interface OrderRow {
  order_id: number;
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  payos_order_code: number | null;
}

/** Đọc đơn PayOS đang chờ thanh toán theo `payos_order_code`. */
async function findOrderByPayosCode(payosOrderCode: number): Promise<OrderRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('orders')
    .select('order_id, order_code, status, payment_status, payment_method, total, payos_order_code')
    .eq('payos_order_code', payosOrderCode)
    .maybeSingle<OrderRow>();

  if (error || !data) return null;
  return data;
}

/**
 * Hỏi PayOS trạng thái thật của đơn và ghi nhận nếu đã thanh toán.
 * Idempotent: gọi lại nhiều lần chỉ xác nhận một lần.
 */
export async function reconcilePayosOrder(payosOrderCode: number): Promise<ReconcileResult> {
  if (!Number.isInteger(payosOrderCode) || payosOrderCode <= 0) {
    return { ok: false, result: 'ORDER_NOT_FOUND', message: 'Mã đơn PayOS không hợp lệ.' };
  }

  const remaining = reconcileCooldownRemaining(payosOrderCode);
  if (remaining > 0) {
    return {
      ok: false,
      result: 'COOLDOWN',
      message: `Vừa kiểm tra xong, vui lòng chờ ${Math.ceil(remaining / 1000)} giây rồi thử lại.`,
    };
  }
  lastRunAt.set(payosOrderCode, Date.now());

  const order = await findOrderByPayosCode(payosOrderCode);
  if (!order) {
    return { ok: false, result: 'ORDER_NOT_FOUND', message: 'Không tìm thấy đơn hàng theo mã PayOS.' };
  }

  if (order.payment_method !== 'payos') {
    return { ok: false, result: 'WRONG_METHOD', message: 'Đơn này không thanh toán bằng PayOS.' };
  }

  if (order.payment_status === 'paid') {
    return { ok: true, result: 'ALREADY_PAID', message: `Đơn ${order.order_code} đã được xác nhận thanh toán trước đó.` };
  }

  let link;
  try {
    link = await getPaymentLink(payosOrderCode);
  } catch (error) {
    if (error instanceof PayosConfigError) {
      return { ok: false, result: 'CONFIG_ERROR', message: error.message };
    }
    if (error instanceof PayosApiError) {
      return {
        ok: false,
        result: 'PAYOS_ERROR',
        message: `PayOS trả lỗi (${error.code ?? 'unknown'}): ${error.message}`,
      };
    }
    return {
      ok: false,
      result: 'PAYOS_ERROR',
      message: `Không gọi được PayOS: ${error instanceof Error ? error.message : 'lỗi không xác định'}`,
    };
  }

  const amountPaid = Number(link.amountPaid ?? 0);

  if (link.status !== 'PAID') {
    return {
      ok: false,
      result: 'NOT_PAID',
      message:
        `PayOS chưa ghi nhận thanh toán cho đơn ${order.order_code}` +
        ` (trạng thái: ${link.status}). Đã trả ${amountPaid.toLocaleString('vi-VN')}₫ / còn ${Number(link.amountRemaining ?? 0).toLocaleString('vi-VN')}₫.`,
    };
  }

  // Ưu tiên số tiền THỰC NHẬN từ giao dịch, rồi tới tổng đã trả của link.
  const transaction = Array.isArray(link.transactions) ? link.transactions[0] : undefined;
  const paidAmount = Math.round(Number(transaction?.amount ?? amountPaid ?? order.total) || 0);
  const reference = transaction?.reference ?? '';

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (error) {
    return {
      ok: false,
      result: 'CONFIG_ERROR',
      message: error instanceof Error ? error.message : 'Thiếu cấu hình service_role.',
    };
  }

  const { data, error } = await admin.rpc('record_payos_result', {
    p_payos_order_code: payosOrderCode,
    p_amount: paidAmount,
    p_reference: reference,
    p_raw: { source: 'reconcile', status: link.status, amountPaid, transaction: transaction ?? null },
  });

  if (error) {
    return {
      ok: false,
      result: 'DB_ERROR',
      message: `PayOS đã xác nhận thanh toán nhưng không ghi được vào CSDL: ${error.message}`,
    };
  }

  const result = (typeof data === 'string' ? data : 'UNKNOWN') as ReconcileCode;

  const messages: Record<string, string> = {
    CONFIRMED: `Đã xác nhận thanh toán PayOS cho đơn ${order.order_code} (${paidAmount.toLocaleString('vi-VN')}₫).`,
    ALREADY_PAID: `Đơn ${order.order_code} đã được xác nhận thanh toán trước đó.`,
    AMOUNT_MISMATCH: `Số tiền PayOS báo (${paidAmount.toLocaleString('vi-VN')}₫) khác tổng đơn (${Number(order.total).toLocaleString('vi-VN')}₫) — đã ghi nhật ký để admin đối soát thủ công.`,
    LATE_PAYMENT: `Đơn ${order.order_code} đã bị hủy nhưng khách vẫn trả tiền — cần hoàn tiền thủ công.`,
    ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng theo mã PayOS.',
    WRONG_METHOD: 'Đơn này không thanh toán bằng PayOS.',
  };

  return {
    ok: result === 'CONFIRMED' || result === 'ALREADY_PAID',
    result,
    amountPaid: paidAmount,
    message: messages[result] ?? `Kết quả đối soát: ${result}`,
  };
}

/** Tìm `payos_order_code` theo mã đơn hiển thị (dùng service_role). */
export async function findPayosOrderCodeByOrderCode(orderCode: string): Promise<number | null> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select('payos_order_code, status, payment_status, payment_method')
      .eq('order_code', orderCode)
      .maybeSingle<{ payos_order_code: number | null; status: string; payment_status: string; payment_method: string }>();

    if (error || !data) return null;
    if (data.payment_method !== 'payos') return null;
    if (data.payment_status === 'paid') return null;
    return data.payos_order_code ?? null;
  } catch {
    return null;
  }
}
