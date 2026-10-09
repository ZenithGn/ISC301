/**
 * Tiện ích đọc JSON từ RPC Postgres một cách PHÒNG THỦ.
 *
 * Lý do tồn tại: hình dạng JSON của một số RPC (get_order_detail, get_cart items,
 * admin_*) chưa được khoá lại bằng schema dump. Trong lúc chờ, mọi nơi đọc JSON
 * nên đi qua các helper này để không vỡ khi PayOS/Postgres trả key hơi khác
 * (`order_code` vs `orderCode` vs `order-code`).
 *
 * Khi có schema dump, hãy khoá lại key thật và có thể bỏ dần các alias.
 */

/** Chuẩn hoá tên key: bỏ mọi ký tự không phải chữ/số, viết thường. */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Đọc giá trị theo danh sách key (không phân biệt hoa/thường và dấu gạch) ở cấp gốc. */
export function getByKeys<T = unknown>(
  source: unknown,
  keys: readonly string[]
): T | undefined {
  if (!isPlainObject(source)) return undefined;
  const wanted = new Set(keys.map(normalizeKey));

  for (const [key, value] of Object.entries(source)) {
    if (wanted.has(normalizeKey(key)) && value !== null && value !== undefined) {
      return value as T;
    }
  }
  return undefined;
}

/** Như getByKeys nhưng trả về cả giá trị null/undefined (để phân biệt "không có key"). */
export function hasKey(source: unknown, keys: readonly string[]): boolean {
  if (!isPlainObject(source)) return false;
  const wanted = new Set(keys.map(normalizeKey));
  return Object.keys(source).some((key) => wanted.has(normalizeKey(key)));
}

/**
 * Tìm giá trị theo key ở bất kỳ độ sâu nào (duyệt object và mảng theo thứ tự).
 * Dùng khi không biết giá trị nằm ở gốc hay trong object lồng như `order`, `data`.
 */
export function getByKeysDeep<T = unknown>(
  source: unknown,
  keys: readonly string[],
  maxDepth: number = 4
): T | undefined {
  const visited = new Set<unknown>();

  const walk = (node: unknown, depth: number): T | undefined => {
    if (depth > maxDepth || node === null || node === undefined) return undefined;
    if (typeof node !== 'object') return undefined;
    if (visited.has(node)) return undefined;
    visited.add(node);

    const direct = getByKeys<T>(node, keys);
    if (direct !== undefined) return direct;

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found !== undefined) return found;
      }
      return undefined;
    }

    for (const value of Object.values(node as Record<string, unknown>)) {
      const found = walk(value, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  return walk(source, 0);
}

/** Trả về mảng đầu tiên tìm thấy theo danh sách key (ở gốc hoặc lồng bên trong). */
export function getArrayByKeys(source: unknown, keys: readonly string[]): unknown[] {
  const value = getByKeysDeep<unknown>(source, keys);
  return Array.isArray(value) ? value : [];
}

/** Chuỗi an toàn: null/undefined → null, còn lại ép về string. */
export function pickString(
  source: unknown,
  keys: readonly string[]
): string | null {
  const value = getByKeysDeep(source, keys);
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/** Số an toàn: chuỗi số của Postgres (`numeric`) vẫn được chuyển đúng. */
export function pickNumber(
  source: unknown,
  keys: readonly string[],
  fallback: number = 0
): number {
  const value = getByKeysDeep(source, keys);
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Bool an toàn (Postgres có thể trả 'true'/'t' dạng chuỗi). */
export function pickBoolean(
  source: unknown,
  keys: readonly string[],
  fallback: boolean = false
): boolean {
  const value = getByKeysDeep(source, keys);
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === 't';
  return Boolean(value);
}
