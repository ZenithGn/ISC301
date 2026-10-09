'use server';

/**
 * A04 – Server Action quản trị danh mục.
 *
 * BẢO MẬT: `await requireAdmin()` ở dòng đầu mỗi action.
 * Xóa danh mục còn sản phẩm sẽ bị CSDL chặn bằng khóa ngoại (23503) và
 * được dịch thành thông báo tiếng Việt rõ ràng.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import {
  ActionResult,
  fail,
  formCheckbox,
  formString,
  getWriteClient,
  optionalText,
  parseIntegerField,
  requiredText,
  slugify,
  succeed,
  zodFieldErrors,
} from './shared';

const categorySchema = z.object({
  name: requiredText('Tên danh mục', 2, 100),
  slug: z
    .string()
    .trim()
    .max(120, { message: 'Slug tối đa 120 ký tự' })
    .optional()
    .transform((value) => (value && value.length > 0 ? slugify(value) : '')),
  description: optionalText('Mô tả', 300),
  image_url: optionalText('Ảnh danh mục', 500),
});

export async function saveCategoryAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/danh-muc');

  const idRaw = formString(formData, 'category_id').trim();
  const categoryId = idRaw && idRaw !== 'new' ? Number(idRaw) : null;

  const parsed = categorySchema.safeParse({
    name: formString(formData, 'name'),
    slug: formString(formData, 'slug'),
    description: formString(formData, 'description'),
    image_url: formString(formData, 'image_url'),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) Object.assign(fieldErrors, zodFieldErrors(parsed.error));

  const sortOrder = parseIntegerField(formString(formData, 'sort_order'), 'Thứ tự', {
    min: 0,
    max: 100000,
  });
  if (!sortOrder.ok) fieldErrors.sort_order = sortOrder.message;

  if (!parsed.success || !sortOrder.ok) {
    return fail('Vui lòng kiểm tra lại thông tin danh mục.', fieldErrors);
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const payload = {
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    image_url: parsed.data.image_url,
    sort_order: sortOrder.value ?? 0,
    is_active: formCheckbox(formData, 'is_active'),
  };

  const result = categoryId
    ? await db.from('categories').update(payload).eq('category_id', categoryId)
    : await db.from('categories').insert(payload);

  if (result.error) {
    const isDuplicate =
      result.error.code === '23505' ||
      result.error.message.toLowerCase().includes('duplicate key');
    const message = isDuplicate
      ? 'Tên hoặc slug danh mục đã tồn tại. Vui lòng chọn giá trị khác.'
      : `Không lưu được danh mục: ${result.error.message}`;
    return fail(message);
  }

  revalidatePath('/admin/danh-muc');
  revalidatePath('/admin/san-pham');
  revalidatePath('/');
  return succeed(categoryId ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục mới.');
}

export async function deleteCategoryAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/danh-muc');

  const idRaw = formString(formData, 'category_id').trim();
  const categoryId = Number(idRaw);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return fail('Danh mục không hợp lệ.');
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  // Đếm sản phẩm trước để báo lỗi thân thiện (FK sẽ chặn nếu bỏ qua bước này).
  const { count } = await db
    .from('products')
    .select('product_id', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if ((count ?? 0) > 0) {
    return fail(
      `Không thể xóa: danh mục này còn ${count} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác hoặc ẩn danh mục (bỏ chọn "Đang hoạt động").`
    );
  }

  const { error } = await db.from('categories').delete().eq('category_id', categoryId);
  if (error) {
    const isForeignKey =
      error.code === '23503' ||
      error.message.toLowerCase().includes('foreign key') ||
      error.message.toLowerCase().includes('violates');
    return fail(
      isForeignKey
        ? 'Không thể xóa danh mục vì vẫn còn sản phẩm hoặc dữ liệu khác tham chiếu tới nó.'
        : `Không xóa được danh mục: ${error.message}`
    );
  }

  revalidatePath('/admin/danh-muc');
  revalidatePath('/');
  return succeed('Đã xóa danh mục.');
}

/** Đổi chỗ thứ tự với danh mục liền kề (lên/xuống). */
export async function moveCategoryAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/danh-muc');

  const idRaw = formString(formData, 'category_id').trim();
  const direction = formString(formData, 'direction');
  const categoryId = Number(idRaw);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return fail('Danh mục không hợp lệ.');
  }
  if (direction !== 'up' && direction !== 'down') {
    return fail('Hướng sắp xếp không hợp lệ.');
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const { data, error } = await db
    .from('categories')
    .select('category_id, sort_order')
    .order('sort_order', { ascending: true });

  if (error || !data) {
    return fail('Không đọc được danh sách danh mục để sắp xếp.');
  }

  const rows = data as Array<{ category_id: number; sort_order: number }>;
  const index = rows.findIndex((row) => row.category_id === categoryId);
  if (index < 0) return fail('Không tìm thấy danh mục.');

  const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighbourIndex < 0 || neighbourIndex >= rows.length) {
    return succeed('Danh mục đã ở vị trí đầu/cuối.');
  }

  const current = rows[index];
  const neighbour = rows[neighbourIndex];
  const currentOrder = current.sort_order;
  const neighbourOrder = neighbour.sort_order;

  // Nếu hai danh mục cùng sort_order thì đổi sang giá trị lệch để tạo khác biệt.
  const newCurrent = neighbourOrder === currentOrder ? neighbourOrder + (direction === 'up' ? -1 : 1) : neighbourOrder;

  await Promise.all([
    db.from('categories').update({ sort_order: newCurrent }).eq('category_id', current.category_id),
    db
      .from('categories')
      .update({ sort_order: currentOrder })
      .eq('category_id', neighbour.category_id),
  ]);

  revalidatePath('/admin/danh-muc');
  revalidatePath('/');
  return succeed('Đã cập nhật thứ tự danh mục.');
}
