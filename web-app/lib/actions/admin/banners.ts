'use server';

/**
 * F11 – Server Action quản trị banner trang chủ.
 *
 * Bảng `banners` (đã xác nhận): banner_id, title, subtitle, image_url,
 * link_url, sort_order, is_active, starts_at, ends_at, created_at.
 * `await requireAdmin()` ở dòng đầu mỗi action.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import {
  ActionResult,
  fail,
  formCheckbox,
  formFile,
  formString,
  getWriteClient,
  optionalText,
  parseIntegerField,
  requiredText,
  succeed,
  uploadImageToBucket,
  validateImageFile,
  zodFieldErrors,
} from './shared';

const bannerSchema = z.object({
  title: requiredText('Tiêu đề', 2, 200),
  subtitle: optionalText('Tiêu đề phụ', 300),
  link_url: optionalText('Liên kết', 500),
});

/** Chuyển giá trị datetime-local (giờ VN) thành ISO UTC; rỗng -> null. */
function parseDateTimeLocal(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const date = new Date(`${text}:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function saveBannerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/banner');

  const idRaw = formString(formData, 'banner_id').trim();
  const bannerId = idRaw && idRaw !== 'new' ? Number(idRaw) : null;

  const parsed = bannerSchema.safeParse({
    title: formString(formData, 'title'),
    subtitle: formString(formData, 'subtitle'),
    link_url: formString(formData, 'link_url'),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) Object.assign(fieldErrors, zodFieldErrors(parsed.error));

  const sortOrder = parseIntegerField(formString(formData, 'sort_order'), 'Thứ tự', {
    min: 0,
    max: 100000,
  });
  if (!sortOrder.ok) fieldErrors.sort_order = sortOrder.message;

  if (!parsed.success || !sortOrder.ok) {
    return fail('Vui lòng kiểm tra lại thông tin banner.', fieldErrors);
  }

  let imageUrl = formString(formData, 'image_url').trim() || null;
  const imageFile = formFile(formData, 'image');

  if (imageFile && imageFile.size > 0) {
    const uploaded = await uploadImageToBucket(imageFile);
    if (uploaded.error) return fail(uploaded.error, { image: uploaded.error });
    if (uploaded.url) imageUrl = uploaded.url;
  } else if (imageFile) {
    const imageError = validateImageFile(imageFile);
    if (imageError) return fail(imageError, { image: imageError });
  }

  if (!imageUrl) {
    return fail('Banner cần có ảnh (tải ảnh lên hoặc dán URL ảnh).', {
      image: 'Thiếu ảnh banner.',
    });
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const payload = {
    title: parsed.data.title,
    subtitle: parsed.data.subtitle,
    image_url: imageUrl,
    link_url: parsed.data.link_url,
    sort_order: sortOrder.value ?? 0,
    is_active: formCheckbox(formData, 'is_active'),
    starts_at: parseDateTimeLocal(formString(formData, 'starts_at')),
    ends_at: parseDateTimeLocal(formString(formData, 'ends_at')),
  };

  const result = bannerId
    ? await db.from('banners').update(payload).eq('banner_id', bannerId)
    : await db.from('banners').insert(payload);

  if (result.error) {
    return fail(`Không lưu được banner: ${result.error.message}`);
  }

  revalidatePath('/admin/banner');
  revalidatePath('/');
  return succeed(bannerId ? 'Đã cập nhật banner.' : 'Đã thêm banner mới.');
}

export async function toggleBannerActiveAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/banner');

  const bannerId = Number(formString(formData, 'banner_id'));
  const nextActive = formString(formData, 'next_active') === 'true';
  if (!Number.isInteger(bannerId) || bannerId <= 0) return;

  const db = getWriteClient();
  await db.from('banners').update({ is_active: nextActive }).eq('banner_id', bannerId);

  revalidatePath('/admin/banner');
  revalidatePath('/');
}

export async function deleteBannerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/banner');

  const bannerId = Number(formString(formData, 'banner_id'));
  if (!Number.isInteger(bannerId) || bannerId <= 0) {
    return fail('Banner không hợp lệ.');
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const { error } = await db.from('banners').delete().eq('banner_id', bannerId);
  if (error) return fail(`Không xóa được banner: ${error.message}`);

  revalidatePath('/admin/banner');
  revalidatePath('/');
  return succeed('Đã xóa banner.');
}
