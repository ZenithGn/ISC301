/**
 * Phần CLIENT-SAFE của tầng action quản trị: kiểu kết quả, schema và tiện ích
 * thuần (không import `next/headers`, Supabase hay bất kỳ module server-only nào).
 *
 * Nhờ tách riêng file này mà Client Component có thể import hằng số/kiểu
 * (ví dụ IDLE_RESULT, REGION_VALUES) mà không kéo `next/headers` vào bundle.
 */

import { z, type ZodError } from 'zod';

/* ------------------------------------------------------------------ */
/* Kiểu kết quả Server Action                                          */
/* ------------------------------------------------------------------ */

export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const IDLE_RESULT: ActionResult = { ok: false, message: '' };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionResult {
  return { ok: false, message, fieldErrors };
}

export function succeed(message: string): ActionResult {
  return { ok: true, message };
}

/** Gom lỗi zod thành map `field -> thông báo tiếng Việt đầu tiên`. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map((p) => String(p)).join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Chuẩn hoá giá trị                                                   */
/* ------------------------------------------------------------------ */

/** Chuẩn hoá chuỗi thành slug không dấu (dùng cho products/categories). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/** Mã giảm giá: viết hoa, chỉ giữ chữ và số. */
export function normalizeCouponCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Mã đơn PayOS: chỉ chữ và số, tối đa 25 ký tự. */
export function normalizeOrderCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
}

/* ------------------------------------------------------------------ */
/* Zod dùng chung                                                      */
/* ------------------------------------------------------------------ */

export const REGION_VALUES = ['bac', 'trung', 'nam', 'ba_mien'] as const;
/** DB thật (`ck_orders_payment_method`) chỉ cho phép 'cod' và 'payos'. */
export const PAYMENT_METHOD_VALUES = ['cod', 'payos'] as const;
export const ORDER_STATUS_VALUES = [
  'pending_payment',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
] as const;

/** Trạng thái đơn đã hủy (nhánh phụ của luồng). */
export const CANCELLED_STATUS = 'cancelled';
/** Trạng thái đơn đã hoàn tất. */
export const COMPLETED_STATUS = 'completed';

/** Hai trạng thái KẾT THÚC: không còn bước chuyển tiếp nào. */
export const FINAL_STATUSES: readonly string[] = [COMPLETED_STATUS, CANCELLED_STATUS];

/** true khi đơn đã ở trạng thái kết thúc (completed/cancelled). */
export function isFinalStatus(status: string): boolean {
  return FINAL_STATUSES.includes(status);
}

/**
 * Luồng trạng thái hợp lệ của đơn quà Tết (A05) — phải khớp CHÍNH XÁC với
 * ràng buộc trong `public.update_order_status` của `huongque_db_full.sql`:
 *   (pending_payment | confirmed) -> cancelled
 *   confirmed -> shipping (admin)      shipping -> completed (admin)
 *
 * `pending_payment` KHÔNG được xác nhận thủ công: chỉ webhook PayOS đã xác thực
 * chữ ký (`record_payos_result`) mới chuyển được sang 'confirmed'.
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

export function allowedNextStatuses(status: string): string[] {
  return ORDER_TRANSITIONS[status] ?? [];
}

/**
 * Thứ tự TIẾN của luồng đơn (không tính nhánh hủy). Dùng để biết đâu là
 * "trạng thái tiếp theo" khi A05 chỉ hiển thị một nút chính.
 */
export const ORDER_FORWARD_FLOW = ['pending_payment', 'confirmed', 'shipping', 'completed'] as const;

/**
 * Trạng thái kế tiếp theo hướng TIẾN của đơn (bỏ qua `cancelled`).
 *
 * Ví dụ: `confirmed` → `'shipping'` (dù `allowedNextStatuses` còn có `cancelled`);
 * `shipping` → `'completed'`; `pending_payment` → `null` (chỉ hủy được);
 * `completed`/`cancelled` → `null` (đơn đã kết thúc).
 */
export function forwardNextStatus(status: string): string | null {
  const candidates = allowedNextStatuses(status).filter((next) => next !== CANCELLED_STATUS);
  if (candidates.length === 0) return null;

  const rank = (value: string) => {
    const index = (ORDER_FORWARD_FLOW as readonly string[]).indexOf(value);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...candidates].sort((a, b) => rank(a) - rank(b))[0];
}

/** Chuỗi bắt buộc, đã trim, có độ dài trong khoảng. */
export function requiredText(label: string, min = 1, max = 255) {
  return z
    .string()
    .trim()
    .min(min, { message: `${label} không được để trống` })
    .max(max, { message: `${label} tối đa ${max} ký tự` });
}

/** Chuỗi tuỳ chọn: rỗng -> null. */
export function optionalText(label: string, max = 1000) {
  return z
    .string()
    .trim()
    .max(max, { message: `${label} tối đa ${max} ký tự` })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));
}

/** Số nguyên không âm từ FormData (chuỗi rỗng -> 0). */
export function intFromForm(label: string, { min = 0, max = 2_000_000_000 } = {}) {
  return z.coerce
    .number({ message: `${label} phải là số` })
    .int({ message: `${label} phải là số nguyên` })
    .min(min, { message: `${label} không hợp lệ` })
    .max(max, { message: `${label} quá lớn` });
}

export type ParsedInt =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

/**
 * Đọc một trường số nguyên từ FormData. Chuỗi rỗng -> null (khi allowEmpty).
 * Trả về thông báo tiếng Việt thay vì ném lỗi.
 */
export function parseIntegerField(
  raw: string,
  label: string,
  options: { min?: number; max?: number; allowEmpty?: boolean } = {}
): ParsedInt {
  const { min = 0, max = 2_000_000_000, allowEmpty = false } = options;
  const text = (raw ?? '').trim();

  if (text === '') {
    return allowEmpty
      ? { ok: true, value: null }
      : { ok: false, message: `${label} không được để trống` };
  }

  if (!/^-?\d+$/.test(text)) {
    return { ok: false, message: `${label} phải là số nguyên` };
  }

  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${label} không hợp lệ` };
  }
  if (value < min) {
    return { ok: false, message: `${label} phải lớn hơn hoặc bằng ${min}` };
  }
  if (value > max) {
    return { ok: false, message: `${label} quá lớn` };
  }
  return { ok: true, value };
}

/** Đọc giá trị FormData thành chuỗi an toàn (null nếu không phải string). */
export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

/** Đọc checkbox: 'on' | 'true' | '1' -> true. */
export function formCheckbox(formData: FormData, key: string): boolean {
  const value = formString(formData, key);
  return value === 'on' || value === 'true' || value === '1';
}

export function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (value && typeof value === 'object' && typeof (value as File).arrayBuffer === 'function') {
    return value as File;
  }
  return null;
}

/** Dịch lỗi Postgres quen thuộc sang tiếng Việt cho admin. */
export function translateDbError(message: string | null | undefined, fallback: string): string {
  const text = (message ?? '').toLowerCase();
  if (!text) return fallback;
  if (text.includes('duplicate key') || text.includes('unique constraint')) {
    return 'Giá trị này đã tồn tại (trùng mã/slug). Vui lòng chọn giá trị khác.';
  }
  if (
    text.includes('foreign key') ||
    text.includes('violates foreign key constraint') ||
    text.includes('still referenced')
  ) {
    return 'Không thể xóa vì vẫn còn dữ liệu liên quan (ví dụ sản phẩm trong danh mục).';
  }
  if (text.includes('permission denied') || text.includes('row-level security')) {
    return 'Không đủ quyền thực hiện thao tác này. Kiểm tra cấu hình service_role / RLS.';
  }
  if (text.includes('does not exist')) {
    return 'Cấu trúc dữ liệu chưa khớp với CSDL hiện tại. Vui lòng báo quản trị kỹ thuật.';
  }
  return fallback;
}
