/**
 * Tiện ích PHÂN TRANG cho khu vực quản trị (A02, A04, A05, A06, F11).
 *
 * File này CHỈ chứa hàm thuần (không import `next/headers`, Supabase hay bất kỳ
 * module server-only nào) nên vừa dùng được ở Server Component (page) vừa dùng
 * được ở phía client cho phần hiển thị.
 *
 * Quy ước URL: `?trang=2` — trang 1 được lược bỏ khỏi URL cho gọn, và MỌI tham
 * số lọc hiện có (trạng thái / phương thức / từ khóa / khoảng ngày…) luôn được
 * giữ nguyên khi chuyển trang.
 */

/** Số dòng mỗi trang (nằm trong khoảng 10–20 theo yêu cầu). */
export const ADMIN_PAGE_SIZE = 15;

/** Tên tham số truy vấn dùng cho số trang. */
export const ADMIN_PAGE_PARAM = 'trang';

/** Giá trị `searchParams` của Next.js (có thể là mảng khi lặp tham số). */
export type SearchParamValue = string | string[] | undefined;

/** Lấy giá trị đầu tiên của một tham số truy vấn. */
export function firstParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Đọc số trang từ `searchParams`. Giá trị sai/âm/rỗng → 1.
 * Khi biết `totalPages`, số trang được kẹp vào khoảng hợp lệ.
 */
export function parseAdminPage(value: SearchParamValue, totalPages?: number): number {
  const raw = (firstParam(value) ?? '').trim();
  const parsed = /^\d+$/.test(raw) ? Number(raw) : 1;
  const page = parsed >= 1 ? parsed : 1;
  if (typeof totalPages === 'number' && totalPages > 0) return Math.min(page, totalPages);
  return page;
}

export interface AdminPage<T> {
  /** Dữ liệu của riêng trang hiện tại. */
  rows: T[];
  /** Tổng số dòng sau khi lọc (không phải số dòng của trang). */
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Vị trí dòng đầu/cuối của trang (1-based) để hiện "1–15 / 42". */
  from: number;
  to: number;
}

/**
 * Cắt một mảng đã lọc thành một trang.
 * Luôn trả về `totalPages >= 1` để UI không phải xử lý trường hợp 0 trang.
 */
export function paginateAdmin<T>(
  rows: T[],
  page = 1,
  pageSize: number = ADMIN_PAGE_SIZE
): AdminPage<T> {
  const size = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : ADMIN_PAGE_SIZE;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * size;
  const pageRows = rows.slice(start, start + size);

  return {
    rows: pageRows,
    total,
    page: safePage,
    pageSize: size,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: start + pageRows.length,
  };
}

/**
 * Dựng query string từ `searchParams` hiện tại, ghi đè bằng `overrides`.
 *
 * - Mọi tham số cũ được giữ nguyên (trừ những khóa có trong `overrides`).
 * - Giá trị rỗng/undefined bị bỏ ⇒ `trang=1` và `id=` không xuất hiện trên URL.
 * - Trả về chuỗi bắt đầu bằng `?`, hoặc chuỗi rỗng nếu không còn tham số nào.
 */
export function buildAdminQuery(
  params: Record<string, SearchParamValue> = {},
  overrides: Record<string, string | number | undefined | null> = {}
): string {
  const search = new URLSearchParams();
  const overridden = new Set(Object.keys(overrides));

  for (const [key, value] of Object.entries(params)) {
    if (overridden.has(key)) continue;
    const flat = firstParam(value);
    if (flat === undefined || flat === '') continue;
    search.set(key, flat);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}
