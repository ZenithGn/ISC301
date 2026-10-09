import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ADMIN_PAGE_PARAM,
  ADMIN_PAGE_SIZE,
  buildAdminQuery,
  type SearchParamValue,
} from '@/lib/actions/admin/pagination';
import { formatNumber } from '@/lib/format';

/**
 * Thanh phân trang dùng chung cho MỌI bảng dữ liệu quản trị (A02, A04, A05, A06, F11).
 *
 * Đây là Server Component thuần link (`next/link`), không dùng hook, nên:
 * - phân trang chạy phía server qua `searchParams` (`?trang=2`);
 * - mọi tham số LỌC hiện có (trạng thái / phương thức / từ khóa / khoảng ngày…)
 *   được giữ nguyên khi bấm Trước/Sau;
 * - hoạt động cả trên desktop lẫn mobile (bố cục wrap).
 */
export function AdminPagination({
  page,
  totalItems,
  pageSize = ADMIN_PAGE_SIZE,
  basePath = '',
  params = {},
  pageParam = ADMIN_PAGE_PARAM,
  itemLabel = 'dòng',
  className = '',
}: {
  /** Trang hiện tại (1-based). */
  page: number;
  /** Tổng số dòng sau khi lọc. */
  totalItems: number;
  pageSize?: number;
  /** Đường dẫn trang, ví dụ `/admin/don-hang`. Bỏ trống thì dùng URL tương đối. */
  basePath?: string;
  /** `searchParams` hiện tại để giữ nguyên bộ lọc. */
  params?: Record<string, SearchParamValue>;
  pageParam?: string;
  itemLabel?: string;
  className?: string;
}) {
  const size = pageSize >= 1 ? Math.floor(pageSize) : ADMIN_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const from = totalItems === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(current * size, totalItems);

  const hrefFor = (target: number) =>
    `${basePath}${buildAdminQuery(params, { [pageParam]: target > 1 ? target : undefined })}`;

  const navButton =
    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors';

  return (
    <nav
      aria-label="Phân trang"
      className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${className}`}
    >
      <p className="text-[11px] text-stone-400">
        Trang <strong className="font-mono text-stone-200">{current}</strong>/
        <span className="font-mono">{totalPages}</span> · tổng{' '}
        <strong className="font-mono text-stone-200">{formatNumber(totalItems)}</strong> {itemLabel}
        {totalItems > 0 ? (
          <span className="text-stone-500">
            {' '}
            (đang xem {formatNumber(from)}–{formatNumber(to)})
          </span>
        ) : null}
      </p>

      <div className="flex items-center gap-2">
        {current > 1 ? (
          <Link
            href={hrefFor(current - 1)}
            rel="prev"
            className={`${navButton} border-stone-700 text-stone-200 hover:bg-stone-800`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Trước
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${navButton} border-stone-800 text-stone-600 cursor-not-allowed`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Trước
          </span>
        )}

        {current < totalPages ? (
          <Link
            href={hrefFor(current + 1)}
            rel="next"
            className={`${navButton} border-stone-700 text-stone-200 hover:bg-stone-800`}
          >
            Sau
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={`${navButton} border-stone-800 text-stone-600 cursor-not-allowed`}
          >
            Sau
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
