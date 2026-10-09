import Link from 'next/link';
import { getCategories, searchProducts } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';
import { Filter, SlidersHorizontal } from 'lucide-react';

interface SanPhamPageProps {
  searchParams: Promise<{
    mien?: string;
    danh_muc?: string;
    gia_min?: string;
    gia_max?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SanPhamPage({ searchParams }: SanPhamPageProps) {
  const params = await searchParams;
  const currentMien = params.mien || 'all';
  const currentCategory = params.danh_muc || 'all';
  const currentSort = params.sort || 'newest';
  const currentPage = Number(params.page) || 1;

  const [categories, searchResult] = await Promise.all([
    getCategories(),
    searchProducts(params),
  ]);

  const { products, total, totalPages } = searchResult;

  // Helper để tạo URL giữ lại query string
  function buildFilterUrl(newParams: Record<string, string | number | undefined>) {
    const merged = { ...params, ...newParams };
    const query = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 'all') {
        query.set(k, String(v));
      }
    });
    return `/san-pham${query.toString() ? `?${query.toString()}` : ''}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Page Title */}
      <div className="space-y-2 border-b border-stone-800 pb-6">
        <h1 className="text-3xl font-serif font-black text-stone-100">
          Tất Cả Đặc Sản & Quà Tết
        </h1>
        <p className="text-xs sm:text-sm text-stone-400">
          Tìm thấy <span className="text-amber-400 font-semibold">{total}</span> sản phẩm đặc sắc ba miền sẵn sàng phục vụ dịp Tết.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="space-y-6">
          <div className="p-5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-6">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm pb-3 border-b border-stone-800">
              <Filter className="w-4 h-4" />
              <span>Bộ Lọc Sản Phẩm</span>
            </div>

            {/* Filter by Region */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
                Vùng Miền
              </label>
              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'Tất cả vùng miền' },
                  { id: 'bac', label: 'Đặc sản Miền Bắc' },
                  { id: 'trung', label: 'Đặc sản Miền Trung' },
                  { id: 'nam', label: 'Đặc sản Miền Nam' },
                  { id: 'ba_mien', label: 'Hộp quà Ba Miền' },
                ].map((item) => (
                  <Link
                    key={item.id}
                    href={buildFilterUrl({ mien: item.id, page: 1 })}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      currentMien === item.id
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Filter by Category */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
                Danh Mục
              </label>
              <div className="flex flex-col gap-1.5 text-xs">
                <Link
                  href={buildFilterUrl({ danh_muc: 'all', page: 1 })}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentCategory === 'all'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  Tất cả danh mục
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={buildFilterUrl({ danh_muc: cat.slug, page: 1 })}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentCategory === cat.slug
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Filter by Price Range */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
                Khoảng Giá
              </label>
              <div className="flex flex-col gap-1.5 text-xs">
                {[
                  { label: 'Tất cả mức giá', min: undefined, max: undefined },
                  { label: 'Dưới 100.000₫', min: undefined, max: 100000 },
                  { label: '100.000₫ – 300.000₫', min: 100000, max: 300000 },
                  { label: '300.000₫ – 600.000₫', min: 300000, max: 600000 },
                  { label: 'Trên 600.000₫ (Hộp VIP)', min: 600000, max: undefined },
                ].map((item, idx) => {
                  const isActive =
                    String(params.gia_min || '') === String(item.min || '') &&
                    String(params.gia_max || '') === String(item.max || '');

                  return (
                    <Link
                      key={idx}
                      href={buildFilterUrl({
                        gia_min: item.min,
                        gia_max: item.max,
                        page: 1,
                      })}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Reset Filters button */}
            <div className="pt-2">
              <Link
                href="/san-pham"
                className="block text-center text-xs text-stone-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
              >
                Xóa tất cả bộ lọc
              </Link>
            </div>
          </div>
        </aside>

        {/* Product Grid & Sorting */}
        <section className="lg:col-span-3 space-y-6">
          {/* Top Sort Bar */}
          <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="text-stone-400">
              Trang <strong className="text-amber-400">{currentPage}</strong> / {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-300">Sắp xếp:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'newest', label: 'Mới nhất' },
                  { id: 'price-asc', label: 'Giá tăng dần' },
                  { id: 'price-desc', label: 'Giá giảm dần' },
                  { id: 'featured', label: 'Nổi bật' },
                ].map((s) => (
                  <Link
                    key={s.id}
                    href={buildFilterUrl({ sort: s.id, page: 1 })}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      currentSort === s.id
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Grid list */}
          <ProductGrid products={products} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNum = index + 1;
                return (
                  <Link
                    key={pageNum}
                    href={buildFilterUrl({ page: pageNum })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-amber-500 text-stone-950 shadow-md'
                        : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
