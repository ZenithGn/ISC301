/**
 * Cloudinary – upload ảnh (sản phẩm, avatar) bằng REST API + chữ ký SHA-1.
 *
 * KHÔNG dùng SDK `cloudinary` (repo không cài thêm dependency). CHỈ chạy ở server
 * vì cần API secret.
 *
 * Cấu hình bằng MỘT biến duy nhất (đúng chuẩn Cloudinary):
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 * (Dashboard Cloudinary → "API environment variable" → copy nguyên dòng đó.)
 */

import crypto from 'node:crypto';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export class CloudinaryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudinaryConfigError';
  }
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Tách `CLOUDINARY_URL` thành 3 phần.
 *
 * Định dạng: `cloudinary://<api_key>:<api_secret>@<cloud_name>`
 * URL API của Node xử lý sẵn phần userinfo nên không cần regex thủ công.
 */
export function parseCloudinaryUrl(raw: string | undefined | null): CloudinaryCredentials | null {
  if (!raw) return null;

  try {
    const url = new URL(raw.trim());
    const cloudName = url.hostname;
    const apiKey = decodeURIComponent(url.username);
    const apiSecret = decodeURIComponent(url.password);

    if (!cloudName || !apiKey || !apiSecret) return null;

    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

export function getCloudinaryCredentials(): CloudinaryCredentials {
  const credentials = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

  if (!credentials) {
    throw new CloudinaryConfigError(
      'Thiếu hoặc sai định dạng CLOUDINARY_URL. Cần dạng: cloudinary://<api_key>:<api_secret>@<cloud_name>'
    );
  }

  return credentials;
}

/** Đã cấu hình Cloudinary hay chưa (dùng để fallback sang Supabase Storage). */
export function hasCloudinaryConfig(): boolean {
  return parseCloudinaryUrl(process.env.CLOUDINARY_URL) !== null;
}

/** Chữ ký Cloudinary: sắp xếp tham số theo alphabet rồi nối `k=v&...` + api_secret. */
function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const raw = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${raw}${apiSecret}`).digest('hex');
}

interface CloudinaryApiResponse {
  secure_url?: string;
  url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: { message?: string };
}

/**
 * Upload một File lên Cloudinary (unsigned = false, có chữ ký).
 * Ném `CloudinaryConfigError` khi thiếu cấu hình, `Error` khi Cloudinary từ chối.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder = 'huongque/products'
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ folder, timestamp }, apiSecret);

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as CloudinaryApiResponse | null;

  if (!response.ok || !body || body.error || !body.secure_url || !body.public_id) {
    throw new Error(
      `Cloudinary từ chối upload: ${body?.error?.message ?? `HTTP ${response.status}`}`
    );
  }

  return {
    url: body.url ?? body.secure_url,
    secureUrl: body.secure_url,
    publicId: body.public_id,
    width: body.width,
    height: body.height,
    bytes: body.bytes,
    format: body.format,
  };
}

/** Xoá ảnh theo public_id (dùng khi admin xoá ảnh). Best-effort: lỗi thì bỏ qua. */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: form,
      cache: 'no-store',
    });

    const body = (await response.json().catch(() => null)) as { result?: string } | null;
    return response.ok && body?.result === 'ok';
  } catch (error) {
    console.warn('[cloudinary] Không xoá được ảnh', publicId, error);
    return false;
  }
}

/**
 * URL tối ưu (f_auto,q_auto) cho một public_id.
 * CHỈ gọi ở server: cloud name nằm trong `CLOUDINARY_URL` (không phải biến public).
 */
export function cloudinaryUrl(publicId: string, transform = 'f_auto,q_auto,w_800'): string {
  const credentials = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  if (!credentials) return '';
  return `https://res.cloudinary.com/${credentials.cloudName}/image/upload/${transform}/${publicId}`;
}
