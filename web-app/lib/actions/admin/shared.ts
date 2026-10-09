/**
 * Tiện ích SERVER-ONLY dùng chung cho các Server Action quản trị (A01–A06, F11).
 *
 * ⚠️ File này import `next/headers` (qua client Supabase phiên đăng nhập) nên
 * TUYỆT ĐỐI KHÔNG được import từ Client Component. Phần kiểu/hằng số/tiện ích
 * thuần nằm ở `./result`; file này re-export lại để Server Action dùng một chỗ.
 *
 * GHI CHÚ VỀ GIẢ ĐỊNH CSDL
 * ------------------------------------------------------------------
 * Repo không chứa DDL của các bảng orders / order_items / payments /
 * coupons / order_status_history, nên `data.ts` đọc bằng `select('*')` rồi
 * trích xuất qua helper phòng thủ trong `@/lib/json-utils`.
 *
 * KHÔNG file nào ở đây được nhận `role`/`is_admin` từ client.
 */

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

// Kiểu kết quả, schema zod, helper thuần (client-safe).
export * from './result';

/* ------------------------------------------------------------------ */
/* Client Supabase                                                     */
/* ------------------------------------------------------------------ */

export interface ReadClient {
  db: SupabaseClient;
  /** true khi đang dùng service_role (bỏ qua RLS). */
  usingServiceRole: boolean;
}

/**
 * Client để ĐỌC dữ liệu admin: ưu tiên service_role (thấy cả dữ liệu ẩn),
 * nếu chưa cấu hình thì rơi về client phiên đăng nhập (RLS is_admin()).
 */
export async function getReadClient(): Promise<ReadClient> {
  if (hasSupabaseAdminConfig()) {
    return { db: getSupabaseAdmin(), usingServiceRole: true };
  }
  return { db: await createClient(), usingServiceRole: false };
}

/** Client để GHI (bắt buộc service_role). Ném lỗi tiếng Việt nếu thiếu cấu hình. */
export function getWriteClient(): SupabaseClient {
  if (!hasSupabaseAdminConfig()) {
    throw new Error(
      'Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY nên không thể ghi dữ liệu quản trị. ' +
        'Vui lòng thêm biến môi trường này ở server (Vercel / .env.local) rồi thử lại.'
    );
  }
  return getSupabaseAdmin();
}

export const MISSING_SERVICE_ROLE_MESSAGE =
  'Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY: các bảng orders/payments/coupons không cấp quyền cho khách nên ' +
  'trang này cần service_role. Hãy thêm biến môi trường ở server rồi tải lại trang.';

/* ------------------------------------------------------------------ */
/* Upload ảnh lên Supabase Storage                                     */
/* ------------------------------------------------------------------ */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Bucket công khai duy nhất đã xác nhận tồn tại. */
export const PUBLIC_IMAGE_BUCKET = 'product-images';

/** Kiểm tra ảnh jpg/png/webp ≤ 5MB; trả thông báo tiếng Việt nếu không hợp lệ. */
export function validateImageFile(file: File): string | null {
  if (file.size === 0) return null; // người dùng không chọn ảnh mới
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Ảnh chỉ chấp nhận định dạng JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.';
  }
  return null;
}

/**
 * Upload ảnh với tên file `crypto.randomUUID()` rồi trả URL công khai.
 * Bắt buộc đã gọi `requireAdmin()` trước khi gọi hàm này.
 */
export async function uploadImageToBucket(
  file: File,
  bucket: string = PUBLIC_IMAGE_BUCKET
): Promise<{ url?: string; error?: string }> {
  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError };
  if (file.size === 0) return {};

  try {
    const db = getWriteClient();
    const extension =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await db.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: `Không upload được ảnh lên bucket "${bucket}": ${uploadError.message}` };
    }

    const { data } = db.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Lỗi không xác định khi upload ảnh.' };
  }
}
