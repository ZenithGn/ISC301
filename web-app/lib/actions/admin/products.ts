'use server';

/**
 * A02/A03 – Server Action quản trị sản phẩm.
 *
 * BẢO MẬT: mọi action gọi `await requireAdmin()` ở DÒNG ĐẦU TIÊN.
 * Không bao giờ nhận `role` / `is_admin` từ client; quyền chỉ đọc từ phiên.
 * Ghi dữ liệu qua service_role (getWriteClient) sau khi đã guard.
 *
 * Ảnh: chỉ jpg/png/webp ≤ 5MB, tên file `crypto.randomUUID()`, bucket
 * `product-images`, lưu URL công khai vào `products.thumbnail_url`.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
  PUBLIC_IMAGE_BUCKET,
  REGION_VALUES,
  requiredText,
  slugify,
  translateDbError,
  uploadImageToBucket,
  validateImageFile,
  zodFieldErrors,
} from './shared';


const productSchema = z.object({
  name: requiredText('Tên sản phẩm', 2, 200),
  slug: z
    .string()
    .trim()
    .max(220, { message: 'Slug tối đa 220 ký tự' })
    .optional()
    .transform((value) => (value && value.length > 0 ? slugify(value) : '')),
  unit: requiredText('Đơn vị', 1, 50),
  region: z.enum(REGION_VALUES, { message: 'Miền không hợp lệ' }),
  origin: optionalText('Xuất xứ', 100),
  producer: optionalText('Nhà sản xuất', 200),
  short_description: optionalText('Mô tả ngắn', 300),
  description: optionalText('Mô tả dài', 20000),
});

/** Kiểm tra file ảnh hợp lệ; trả thông báo lỗi tiếng Việt nếu không. */
async function uploadProductImage(file: File): Promise<{ url?: string; error?: string }> {
  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError };
  return uploadImageToBucket(file, PUBLIC_IMAGE_BUCKET);
}

/** Sinh slug duy nhất: nếu trùng thì thêm hậu tố -2, -3, ... */
async function ensureUniqueSlug(
  db: ReturnType<typeof getWriteClient>,
  baseSlug: string,
  excludeProductId: number | null
): Promise<string> {
  const base = baseSlug || 'san-pham';
  let candidate = base;

  for (let attempt = 2; attempt <= 50; attempt += 1) {
    const { data, error } = await db
      .from('products')
      .select('product_id')
      .eq('slug', candidate)
      .limit(1);

    if (error) break; // để bước ghi báo lỗi nếu CSDL có vấn đề
    const rows = (data ?? []) as Array<{ product_id: number }>;
    const conflict = rows.some((row) => row.product_id !== excludeProductId);
    if (!conflict) return candidate;
    candidate = `${base}-${attempt}`;
  }

  return candidate;
}

/**
 * A03: tạo mới hoặc cập nhật sản phẩm.
 * `product_id` rỗng/"new" ⇒ tạo mới.
 */
export async function saveProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin('/admin/san-pham');

  const idRaw = formString(formData, 'product_id').trim();
  const productId = idRaw && idRaw !== 'new' ? Number(idRaw) : null;

  const parsed = productSchema.safeParse({
    name: formString(formData, 'name'),
    slug: formString(formData, 'slug'),
    unit: formString(formData, 'unit'),
    region: formString(formData, 'region'),
    origin: formString(formData, 'origin'),
    producer: formString(formData, 'producer'),
    short_description: formString(formData, 'short_description'),
    description: formString(formData, 'description'),
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    Object.assign(fieldErrors, zodFieldErrors(parsed.error));
  }

  const categoryId = parseIntegerField(formString(formData, 'category_id'), 'Danh mục', {
    min: 1,
  });
  if (!categoryId.ok) fieldErrors.category_id = categoryId.message;

  const price = parseIntegerField(formString(formData, 'price'), 'Giá bán', { min: 0 });
  if (!price.ok) fieldErrors.price = price.message;

  const compareAt = parseIntegerField(
    formString(formData, 'compare_at_price'),
    'Giá gốc',
    { min: 0, allowEmpty: true }
  );
  if (!compareAt.ok) fieldErrors.compare_at_price = compareAt.message;

  const stock = parseIntegerField(formString(formData, 'stock'), 'Tồn kho', { min: 0 });
  if (!stock.ok) fieldErrors.stock = stock.message;

  if (Object.keys(fieldErrors).length > 0 || !parsed.success || !categoryId.ok || !price.ok || !compareAt.ok || !stock.ok) {
    return fail('Vui lòng kiểm tra lại các trường được đánh dấu.', fieldErrors);
  }

  // Giá gốc (niêm yết) phải LỚN HƠN giá bán.
  const priceValue = price.value ?? 0;
  const compareAtValue = compareAt.value;
  if (compareAtValue !== null && compareAtValue <= priceValue) {
    return fail('Giá gốc phải lớn hơn giá bán.', {
      compare_at_price: 'Giá gốc phải lớn hơn giá bán.',
    });
  }

  const imageFile = formFile(formData, 'image');
  let thumbnailUrl = formString(formData, 'thumbnail_url').trim() || null;

  if (imageFile && imageFile.size > 0) {
    const uploaded = await uploadProductImage(imageFile);
    if (uploaded.error) {
      return fail(uploaded.error, { image: uploaded.error });
    }
    if (uploaded.url) thumbnailUrl = uploaded.url;
  } else if (imageFile) {
    const imageError = validateImageFile(imageFile);
    if (imageError) return fail(imageError, { image: imageError });
  }

  let db;
  try {
    db = getWriteClient();
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Thiếu cấu hình service_role.');
  }

  const slug = await ensureUniqueSlug(db, parsed.data.slug || slugify(parsed.data.name), productId);

  const payload = {
    category_id: categoryId.value,
    name: parsed.data.name,
    slug,
    unit: parsed.data.unit,
    region: parsed.data.region,
    origin: parsed.data.origin,
    producer: parsed.data.producer,
    short_description: parsed.data.short_description,
    description: parsed.data.description,
    price: priceValue,
    compare_at_price: compareAtValue,
    stock: stock.value,
    thumbnail_url: thumbnailUrl,
    is_featured: formCheckbox(formData, 'is_featured'),
    is_active: formCheckbox(formData, 'is_active'),
    updated_at: new Date().toISOString(),
  };

  const result = productId
    ? await db.from('products').update(payload).eq('product_id', productId)
    : await db.from('products').insert(payload);

  const error = result.error;
  if (error) {
    const message = translateDbError(error.message, 'Không lưu được sản phẩm.');
    return fail(message);
  }

  revalidatePath('/admin/san-pham');
  revalidatePath('/admin');
  redirect(`/admin/san-pham?saved=${encodeURIComponent(parsed.data.name)}`);
}

/**
 * A02: ẩn/hiện sản phẩm (KHÔNG xóa cứng vì có thể đã phát sinh đơn hàng).
 */
export async function toggleProductActiveAction(formData: FormData): Promise<void> {
  await requireAdmin('/admin/san-pham');

  const idRaw = formString(formData, 'product_id').trim();
  const nextRaw = formString(formData, 'next_active');
  const productId = Number(idRaw);
  if (!Number.isInteger(productId) || productId <= 0) return;

  const db = getWriteClient();
  await db
    .from('products')
    .update({ is_active: nextRaw === 'true', updated_at: new Date().toISOString() })
    .eq('product_id', productId);

  revalidatePath('/admin/san-pham');
  revalidatePath('/admin');
}
