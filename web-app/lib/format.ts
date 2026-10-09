/**
 * Tiện ích định dạng dùng chung cho toàn bộ giao diện (server + client).
 */

/** 1234567 -> "1.234.567₫" */
export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '0₫';
  }
  return `${Number(amount).toLocaleString('vi-VN')}₫`;
}

/** 1234567 -> "1.234.567 đ" (dùng khi cần hậu tố riêng) */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '0';
  return Number(amount).toLocaleString('vi-VN');
}

/** ISO string -> "08:30 01/01/2027" (giờ Việt Nam) */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** ISO string -> "01/01/2027" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Đếm ngược "còn 14 phút" từ mốc hết hạn. */
export function formatTimeLeft(expiresAt: string | Date | null | undefined): string {
  if (!expiresAt) return '';
  const target = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const diffMs = target.getTime() - Date.now();
  if (Number.isNaN(target.getTime()) || diffMs <= 0) return 'đã hết hạn';

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `còn ${hours} giờ ${minutes} phút`;
  return `còn ${minutes} phút`;
}

/* ------------------------------------------------------------------ */
/* Nhãn tiếng Việt                                                     */
/* ------------------------------------------------------------------ */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-amber-950/70 text-amber-300 border-amber-700/50',
  confirmed: 'bg-blue-950/70 text-blue-300 border-blue-700/50',
  shipping: 'bg-indigo-950/70 text-indigo-300 border-indigo-700/50',
  completed: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50',
  cancelled: 'bg-stone-800 text-stone-400 border-stone-700',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  failed: 'Thanh toán lỗi',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  payos: 'Chuyển khoản/Ví qua PayOS',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function paymentStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

/** Trạng thái đơn coi như thành công về mặt doanh thu. */
export function isRevenueStatus(status: string | null | undefined): boolean {
  return status === 'confirmed' || status === 'shipping' || status === 'completed';
}

/** Chuẩn hoá chuỗi trả về từ Postgres (tránh lỗi khi giá trị không phải string). */
export function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/** Ép giá trị Postgres về number an toàn (numeric hay trả về string). */
export function asNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
