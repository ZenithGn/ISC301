'use client';

import { useActionState } from 'react';
import { checkPayosAction, updateOrderStatusAction } from '@/lib/actions/admin/orders';
import {
  CANCELLED_STATUS,
  allowedNextStatuses,
  forwardNextStatus,
  IDLE_RESULT,
  isFinalStatus,
} from '@/lib/actions/admin/result';
import { Alert, Field, adminInputClass } from './FormBits';
import { SubmitButton } from './SubmitButton';
import { ORDER_STATUS_LABELS, paymentMethodLabel } from '@/lib/format';

function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/**
 * A05 – Thao tác trên một đơn hàng.
 *
 * 1. CHUYỂN TRẠNG THÁI TỊNH TIẾN: không còn select tự do. Danh sách nút lấy từ
 *    `allowedNextStatuses(order.status)` (nguồn duy nhất: ORDER_TRANSITIONS khớp
 *    ràng buộc của RPC `update_order_status`):
 *      - có bước tiến  → nút chính "Chuyển sang <trạng thái>";
 *      - có nhánh hủy  → thêm nút phụ "Hủy đơn" màu đỏ;
 *      - chỉ hủy được  → đúng một nút "Hủy đơn";
 *      - đã kết thúc   → không nút nào, ghi rõ "Đơn đã kết thúc".
 *    Mỗi nút gửi `new_status` của chính nó (name/value của nút submit), ghi chú
 *    dùng chung một ô nhập nhỏ nên KHÔNG phải sửa `updateOrderStatusAction`.
 *
 * 2. Đối soát PayOS THỦ CÔNG (không có cron tự động): admin chủ động bấm kiểm
 *    tra khi webhook bị lỡ.
 */
export function OrderActionPanel({
  orderId,
  currentStatus,
  paymentMethod,
  hasPayosCode,
}: {
  orderId: number;
  currentStatus: string;
  paymentMethod: string;
  hasPayosCode: boolean;
}) {
  const [statusState, statusAction] = useActionState(updateOrderStatusAction, IDLE_RESULT);
  const [payosState, payosAction] = useActionState(checkPayosAction, IDLE_RESULT);

  const nextStatuses = allowedNextStatuses(currentStatus);
  const forwardStatus = forwardNextStatus(currentStatus);
  const canCancel = nextStatuses.includes(CANCELLED_STATUS);
  const finished = isFinalStatus(currentStatus) || nextStatuses.length === 0;

  return (
    <div className="space-y-5">
      {finished ? (
        <Alert tone="info">
          <p className="font-semibold">Đơn đã kết thúc.</p>
          <p className="mt-0.5">
            Trạng thái hiện tại: <strong>{statusLabel(currentStatus)}</strong> — không còn trạng thái
            nào để chuyển tiếp.
          </p>
        </Alert>
      ) : (
        <form action={statusAction} className="space-y-3">
          {statusState.message ? (
            <Alert tone={statusState.ok ? 'success' : 'error'}>{statusState.message}</Alert>
          ) : null}

          <input type="hidden" name="order_id" value={String(orderId)} />

          <p className="text-xs text-stone-300">
            Trạng thái hiện tại:{' '}
            <strong className="text-amber-300">{statusLabel(currentStatus)}</strong>
            <span className="text-[11px] text-stone-500">
              {' '}
              · phương thức {paymentMethodLabel(paymentMethod)}
            </span>
          </p>

          <Field
            label="Ghi chú (tùy chọn)"
            htmlFor="order-status-note"
            hint="Bỏ trống sẽ dùng ghi chú mặc định của từng bước."
          >
            <input
              id="order-status-note"
              name="note"
              maxLength={300}
              placeholder="Ví dụ: đã gọi xác nhận với khách…"
              className={`${adminInputClass} text-xs`}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            {forwardStatus ? (
              <SubmitButton
                name="new_status"
                value={forwardStatus}
                pendingLabel="Đang cập nhật…"
              >
                Chuyển sang “{statusLabel(forwardStatus)}”
              </SubmitButton>
            ) : null}

            {canCancel ? (
              <SubmitButton
                name="new_status"
                value={CANCELLED_STATUS}
                variant="danger"
                pendingLabel="Đang hủy…"
              >
                Hủy đơn
              </SubmitButton>
            ) : null}
          </div>

          <p className="text-[11px] text-stone-500">
            Luồng hợp lệ: chờ thanh toán → (PayOS xác nhận) đã xác nhận → đang giao → hoàn tất; hủy
            được khi đơn còn “chờ thanh toán” hoặc “đã xác nhận”. Trạng thái kế tiếp:{' '}
            <strong className="text-stone-400">
              {nextStatuses.map(statusLabel).join(', ')}
            </strong>
            .
          </p>
        </form>
      )}

      <form action={payosAction} className="space-y-3 border-t border-stone-800 pt-4">
        {payosState.message ? (
          <Alert tone={payosState.ok ? 'success' : 'error'}>{payosState.message}</Alert>
        ) : null}

        <input type="hidden" name="order_id" value={String(orderId)} />

        <div>
          <p className="text-xs font-semibold text-stone-200">Đối soát PayOS (thủ công)</p>
          <p className="text-[11px] text-stone-500 mt-1">
            Dùng khi webhook bị lỡ: hệ thống hỏi trực tiếp PayOS, và nếu PayOS báo đã thanh toán mà
            đơn còn chờ thanh toán thì tự ghi nhận kết quả vào CSDL.
          </p>
        </div>

        <button
          type="submit"
          disabled={!hasPayosCode}
          className="rounded-xl border border-stone-700 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {hasPayosCode ? 'Kiểm tra với PayOS' : 'Đơn chưa có mã PayOS'}
        </button>
      </form>
    </div>
  );
}
