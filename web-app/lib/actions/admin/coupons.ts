'use server';

/**
 * A06 – Server Action quản trị mã giảm giá.
 *
 * Quy tắc nghiệp vụ:
 *  - Mã chuẩn hoá VIẾT HOA và chỉ gồm chữ/số ([A-Z0-9]).
 *  - Mã đã phát sinh đơn (used_count > 0) CHỈ được tắt, không sửa.
 *  - `await requireAdmin()` ở dòng đầu mỗi action.
 *
 * TODO(lead): khoá lại tên cột bảng `coupons` sau khi có schema dump.
 * Hiện ghi với bộ tên theo mô hình gốc (min_order_amount + ends_at) và tự thử
 * lại bộ tên còn lại (min_order_value + expires_at) khi PostgREST báo PGRST204.
 */

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  ActionResult,
  fail,
  formCheckbox,
  formString,
  getWriteClient,
  normalizeCouponCode,
  parseIntegerField,
  succeed,
  translateDbError,
} from './shared';

const DISCOUNT_TYPES = ['percent', 'fixed'] as const;

function parseDateTimeLocal(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const date = new Date(`${text}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Lỗi PostgREST khi body gửi lên có tên cột không tồn tại (PGRST204). */
function isUnknownColumnError(error: { code?: string | null; message?: string | null }): boolean {
  return (
    error.code === 'PGRST204' ||
    /could not find the '.*' column/i.test(error.message ?? '')
  );
}

/**
 * Ghi mã giảm giá với 2 bộ tên cột.
 *
 * TODO(lead): khoá lại khi có schema dump bảng `coupons`.
 * Mô hình dữ liệu gốc (Downloads/01_schema_postgres.sql) dùng
 * `min_order_amount` + `starts_at`/`ends_at`, nhưng bản Supabase có thể đã
 * đổi thành `min_order_value` + `expires_at`. Vì vậy lần ghi đầu dùng bộ tên
 * theo mô hình gốc; nếu PostgREST báo không tìm thấy cột thì tự thử lại với
 * bộ tên còn lại để admin luôn lưu được mã.
 */
async function writeCoupon(
  db: ReturnType<typeof getWriteClient>,
  couponId: number | null,
  payload: {
    code: string;
    discount_type: string;
    discount_value: number | null;
    min_order_amount: number | null;
    usage_limit: number | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  }
): Promise<{ error: { code?: string | null; message?: string | null } | null }> {
  const insert = couponId
    ? (body: Record<string, unknown>) =>
        db.from('coupons').update(body).eq('coupon_id', couponId)
    : (body: Record<string, unknown>) => db.from('coupons').insert({ ...body, used_count: 0 });

  const primary = insert(payload as unknown as Record<string, unknown>);
  const first = await primary;
  if (!first.error || !isUnknownColumnError(first.error)) return first;

  const fallback: Record<string, unknown> = { ...payload };
  delete fallback.min_order_amount;
  delete fallback.ends_at;
  fallback.min_order_value = payload.min_order_amount;
  fallback.expires_at = payload.ends_at;

  console.warn(
    '[admin:coupons] Bảng coupons không có min_order_amount/ends_at — thử lại với min_order_value/expires_at.'
  );
  return insert(fallback);
}

export async function saveCouponAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/ma-giam-gia');

  const idRaw = formString(formData, 'coupon_id').trim();
  const couponId = idRaw && idRaw !== 'new' ? Number(idRaw) : null;
  const usedCount = Number(formString(formData, 'used_count') || '0');

  // Mã đã có đơn -> chỉ được tắt.
  if (couponId && Number.isFinite(usedCount) && usedCount > 0) {
    return fail(
      `Mã này đã được dùng cho ${usedCount} đơn nên KHÔNG thể sửa. Bạn chỉ có thể bật/tắt mã ở danh sách.`
    );
  }

  const fieldErrors: Record<string, string> = {};

  const code = normalizeCouponCode(formString(formData, 'code'));
  if (code.length < 3 || code.length > 50) {
    fieldErrors.code = 'Mã phải gồm 3–50 ký tự chữ và số (sẽ tự động viết hoa).';
  }

  const discountType = formString(formData, 'discount_type').trim();
  if (!DISCOUNT_TYPES.includes(discountType as (typeof DISCOUNT_TYPES)[number])) {
    fieldErrors.discount_type = 'Loại giảm giá không hợp lệ.';
  }

  const discountValue = parseIntegerField(formString(formData, 'discount_value'), 'Giá trị giảm', {
    min: 1,
    max: 2_000_000_000,
  });
  if (!discountValue.ok) {
    fieldErrors.discount_value = discountValue.message;
  } else if (discountType === 'percent' && (discountValue.value ?? 0) > 100) {
    fieldErrors.discount_value = 'Giảm theo phần trăm không được vượt quá 100%.';
  }

  const minOrderValue = parseIntegerField(
    // Trang A06 gửi 'min_order_value'; chấp nhận thêm 'min_order_amount' để khớp
    // mô hình dữ liệu gốc nếu form đổi tên field.
    formString(formData, 'min_order_value') || formString(formData, 'min_order_amount'),
    'Giá trị đơn tối thiểu',
    { min: 0, allowEmpty: true }
  );
  if (!minOrderValue.ok) {
    // Gắn lỗi cho CẢ HAI tên field để UI hiển thị đúng dù dùng tên nào.
    fieldErrors.min_order_value = minOrderValue.message;
    fieldErrors.min_order_amount = minOrderValue.message;
  }

  const usageLimit = parseIntegerField(
    formString(formData, 'usage_limit'),
    'Số lượt sử dụng tối đa',
    { min: 1, allowEmpty: true }
  );
  if (!usageLimit.ok) fieldErrors.usage_limit = usageLimit.message;
  if (
    usageLimit.ok &&
    usageLimit.value !== null &&
    Number.isFinite(usedCount) &&
    usageLimit.value < usedCount
  ) {
    fieldErrors.usage_limit = `Số lượt tối đa không được nhỏ hơn số lượt đã dùng (${usedCount}).`;
  }

  const startsAt = parseDateTimeLocal(formString(formData, 'starts_at'));
  const expiresAt = parseDateTimeLocal(formString(formData, 'expires_at'));
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    fieldErrors.expires_at = 'Thời gian kết thúc phải sau thời gian bắt đầu.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fail('Vui lòng kiểm tra lại thông tin mã giảm giá.', fieldErrors);
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const payload = {
    code,
    discount_type: discountType,
    discount_value: discountValue.ok ? discountValue.value : 0,
    min_order_amount: minOrderValue.ok ? minOrderValue.value : null,
    usage_limit: usageLimit.ok ? usageLimit.value : null,
    is_active: formCheckbox(formData, 'is_active'),
    starts_at: startsAt,
    ends_at: expiresAt,
  };

  const result = await writeCoupon(db, couponId, payload);

  if (result.error) {
    const message =
      result.error.code === '23505'
        ? 'Mã giảm giá này đã tồn tại. Vui lòng chọn mã khác.'
        : translateDbError(result.error.message, 'Không lưu được mã giảm giá.');
    return fail(message);
  }

  revalidatePath('/admin/ma-giam-gia');
  return succeed(couponId ? 'Đã cập nhật mã giảm giá.' : 'Đã tạo mã giảm giá.');
}

/** Bật/tắt mã (dùng cho mã đã có đơn – vì không được sửa). */
export async function toggleCouponActiveAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/ma-giam-gia');

  const couponId = Number(formString(formData, 'coupon_id'));
  const nextActive = formString(formData, 'next_active') === 'true';
  if (!Number.isInteger(couponId) || couponId <= 0) return;

  const db = getWriteClient();
  await db.from('coupons').update({ is_active: nextActive }).eq('coupon_id', couponId);

  revalidatePath('/admin/ma-giam-gia');
}
