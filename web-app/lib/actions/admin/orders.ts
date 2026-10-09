'use server';

/**
 * A05 – Server Action quản trị đơn hàng.
 *
 * BẢO MẬT: `await requireAdmin()` ở dòng đầu mỗi action; trạng thái hiện tại
 * của đơn LUÔN đọc lại từ CSDL (không tin hidden field từ client).
 *
 * Đổi trạng thái qua RPC `update_order_status(p_order_id, p_new_status, p_note)`.
 * "Kiểm tra với PayOS" là công cụ ĐỐI SOÁT THỦ CÔNG: gọi getPaymentLink(),
 * nếu PayOS báo PAID mà đơn còn pending_payment thì gọi `record_payos_result`
 * qua service_role để xác nhận. KHÔNG có cron tự động ở đây.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getPaymentLink, PayosConfigError, PayosApiError } from '@/lib/payos';
import { requireAdmin } from '@/lib/auth';
import {
  ActionResult,
  ORDER_TRANSITIONS,
  fail,
  formString,
  getWriteClient,
  succeed,
} from './shared';
import { getOrderDetail, type AdminOrderRow } from './data';

/** Nội dung ghi chú gợi ý cho từng bước chuyển trạng thái. */
const DEFAULT_NOTES: Record<string, string> = {
  confirmed: 'Admin xác nhận đơn hàng.',
  shipping: 'Đơn đã bàn giao cho đơn vị vận chuyển.',
  completed: 'Khách đã nhận hàng – đơn hoàn tất.',
  cancelled: 'Admin hủy đơn hàng.',
};

async function readOrderForAction(orderId: number): Promise<{
  order: AdminOrderRow | null;
  error: string | null;
}> {
  const detail = await getOrderDetail(orderId);
  if (!detail.order) {
    return { order: null, error: detail.errors[0] ?? 'Không tìm thấy đơn hàng.' };
  }
  return { order: detail.order, error: null };
}

/** Gọi RPC bằng client phiên đăng nhập (is_admin() bên trong), fallback service_role. */
async function callStatusRpc(
  orderId: number,
  newStatus: string,
  note: string
): Promise<{ ok: boolean; message: string }> {
  const args = { p_order_id: orderId, p_new_status: newStatus, p_note: note };
  const attempts: Array<() => Promise<{ error: { message: string } | null }>> = [];

  attempts.push(async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc('update_order_status', args);
    return { error: error ? { message: error.message } : null };
  });

  attempts.push(async () => {
    const admin = getWriteClient();
    const { error } = await admin.rpc('update_order_status', args);
    return { error: error ? { message: error.message } : null };
  });

  let lastError = 'Không cập nhật được trạng thái đơn hàng.';
  for (const attempt of attempts) {
    try {
      const { error } = await attempt();
      if (!error) return { ok: true, message: 'Đã cập nhật trạng thái đơn hàng.' };
      lastError = error.message;
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    }
  }

  return { ok: false, message: lastError };
}

export async function updateOrderStatusAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/don-hang');

  const orderId = Number(formString(formData, 'order_id'));
  const newStatus = formString(formData, 'new_status').trim();
  const note = formString(formData, 'note').trim();

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return fail('Đơn hàng không hợp lệ.');
  }

  const { order, error } = await readOrderForAction(orderId);
  if (error || !order) {
    return fail(error ?? 'Không tìm thấy đơn hàng.');
  }

  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return fail(
      `Không thể chuyển từ "${order.status}" sang "${newStatus}". ` +
        'Luồng hợp lệ: confirmed → shipping → completed (hoặc hủy ở bước chờ xác nhận).'
    );
  }

  // Đơn chờ thanh toán chỉ được xác nhận khi là chuyển khoản/PayOS (đã đối soát thủ công).
  if (order.status === 'pending_payment' && newStatus === 'confirmed' && order.paymentMethod === 'cod') {
    return fail('Đơn COD không ở trạng thái chờ thanh toán. Vui lòng kiểm tra lại đơn hàng.');
  }

  const finalNote = note.length > 0 ? note : (DEFAULT_NOTES[newStatus] ?? '');

  const result = await callStatusRpc(orderId, newStatus, finalNote);
  if (!result.ok) {
    return fail(
      `Không cập nhật được trạng thái: ${result.message}. ` +
        'Kiểm tra RPC update_order_status và quyền admin.'
    );
  }

  revalidatePath('/admin/don-hang');
  revalidatePath(`/admin/don-hang/${orderId}`);
  revalidatePath('/admin');
  return succeed(result.message);
}

/**
 * Nút "Kiểm tra với PayOS": đối soát THỦ CÔNG cho một đơn payos.
 */
export async function checkPayosAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/don-hang');

  const orderId = Number(formString(formData, 'order_id'));
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return fail('Đơn hàng không hợp lệ.');
  }

  const { order, error } = await readOrderForAction(orderId);
  if (error || !order) {
    return fail(error ?? 'Không tìm thấy đơn hàng.');
  }

  if (!order.payosOrderCode) {
    return fail('Đơn này không có mã PayOS (payos_order_code) nên không đối soát được.');
  }

  // 1. Hỏi PayOS trạng thái link thanh toán.
  let link;
  try {
    link = await getPaymentLink(order.payosOrderCode);
  } catch (err) {
    if (err instanceof PayosConfigError) {
      return fail(
        `${err.message} Hãy cấu hình PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY rồi thử lại.`
      );
    }
    if (err instanceof PayosApiError) {
      return fail(`PayOS trả lỗi (${err.code ?? 'unknown'}): ${err.message}`);
    }
    return fail(
      `Không gọi được PayOS: ${err instanceof Error ? err.message : 'lỗi không xác định'}`
    );
  }

  if (link.status !== 'PAID') {
    return fail(
      `PayOS chưa ghi nhận thanh toán cho đơn này (trạng thái: ${link.status}). ` +
        `Đã trả ${link.amountPaid ?? 0}₫ / còn ${link.amountRemaining ?? 0}₫.`
    );
  }

  if (order.status !== 'pending_payment') {
    return {
      ok: true,
      message:
        `PayOS báo ĐÃ THANH TOÁN và đơn đang ở trạng thái "${order.status}" – không cần xác nhận lại. ` +
        `Số tiền đã trả: ${link.amountPaid ?? order.total}₫.`,
    };
  }

  // 2. PayOS báo PAID nhưng đơn còn pending_payment -> xác nhận qua service_role.
  const transaction = Array.isArray(link.transactions) ? link.transactions[0] : undefined;
  if (!transaction) {
    return fail(
      'PayOS báo đã thanh toán nhưng không trả về giao dịch nào. ' +
        'Vui lòng kiểm tra trên dashboard PayOS trước khi xác nhận thủ công.'
    );
  }

  let admin;
  try {
    admin = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  // Khớp `huongque_db_full.sql`: record_payos_result chỉ có 4 tham số (không có
  // p_paid_at) — hàm tự đặt paid_at = now() khi xác nhận thanh toán.
  const { error: rpcError } = await admin.rpc('record_payos_result', {
    p_payos_order_code: order.payosOrderCode,
    p_amount: Math.round(transaction.amount ?? link.amountPaid ?? order.total),
    p_reference: transaction.reference ?? '',
    p_raw: transaction,
  });

  if (rpcError) {
    return fail(
      `PayOS đã xác nhận thanh toán nhưng không ghi được vào CSDL: ${rpcError.message}. ` +
        'Kiểm tra RPC record_payos_result.'
    );
  }

  revalidatePath('/admin/don-hang');
  revalidatePath(`/admin/don-hang/${orderId}`);
  revalidatePath('/admin');
  return succeed(
    `Đã xác nhận thanh toán PayOS cho đơn ${order.code} (giao dịch ${transaction.reference ?? '—'}, ` +
      `${transaction.amount ?? order.total}₫).`
  );
}
