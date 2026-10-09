/**
 * Module quản lý JSON Web Token (JWT) cho Web App Hương Quê
 * Sử dụng Web Crypto API tiêu chuẩn (crypto.subtle), hoạt động đồng nhất trên cả Node.js và Edge Runtime
 * Không phụ thuộc vào thư viện ngoài, tối ưu hiệu năng và bảo mật.
 */

export interface JwtUserPayload {
  sub: string; // User ID (UUID)
  email: string;
  role: 'customer' | 'admin';
  full_name?: string;
  phone?: string | null;
  iat?: number; // Issued At (giây)
  exp?: number; // Expiration Time (giây)
}

export const JWT_COOKIE_NAME = 'auth_token';
export const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

function getSecretKey(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'huong-que-tet-secret-key-2027-super-secure'
  );
}

function toBase64Url(input: string | Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input as any).toString('base64url');
  }
  const str = typeof input === 'string' ? input : String.fromCharCode(...input);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64url, 'base64url').toString('utf-8');
  }
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Ký và tạo chuỗi JWT từ thông tin người dùng
 */
export async function signJwt(
  payload: Omit<JwtUserPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = JWT_EXPIRES_IN_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtUserPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const headerB64 = toBase64Url(JSON.stringify(header));
  const payloadB64 = toBase64Url(JSON.stringify(fullPayload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await getCryptoKey(getSecretKey());
  const enc = new TextEncoder();
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(dataToSign)
  );

  const signatureB64 = toBase64Url(new Uint8Array(signatureBuffer));
  return `${dataToSign}.${signatureB64}`;
}

/**
 * Xác thực chuỗi JWT và kiểm tra thời hạn (exp)
 * Trả về payload nếu hợp lệ, ngược lại trả về null
 */
export async function verifyJwt(token: string): Promise<JwtUserPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const key = await getCryptoKey(getSecretKey());
    const enc = new TextEncoder();

    // Decode signature
    const rawSig = typeof Buffer !== 'undefined'
      ? Buffer.from(signatureB64, 'base64url')
      : Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      rawSig,
      enc.encode(dataToSign)
    );

    if (!isValid) return null;

    // Decode và kiểm tra payload
    const payloadJson = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson) as JwtUserPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      // Token đã hết hạn
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Lỗi xác thực JWT:', err);
    return null;
  }
}

/**
 * Đọc nhanh payload từ JWT mà không kiểm tra chữ ký (dùng cho debug/client parse)
 */
export function decodeJwt(token: string): JwtUserPayload | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = fromBase64Url(parts[1]);
    return JSON.parse(payloadJson) as JwtUserPayload;
  } catch {
    return null;
  }
}
