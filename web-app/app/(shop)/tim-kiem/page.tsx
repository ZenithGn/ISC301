import Link from 'next/link';
import { searchProducts, getBestSellingProducts } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';
import { Search } from 'lucide-react';

interface TimKiemPageProps {
  searchParams: Promise<{
    q?: string;
    mien?: string;
    danh_muc?: string;
    gia_min?: string;
    gia_max?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function TimKiemPage({ searchParams }: TimKiemPageProps) {
  const params = await searchParams;
  const rawQ = params.q || '';
  const currentPage = Number(params.page) || 1;

  const [searchResult, bestSellers] = await Promise.all([
    searchProducts(params),
    getBestSellingProducts(4),
  ]);

  const { products, total } = searchResult;

  // Trang vượt quá dữ liệu (ví dụ ?page=99): báo rõ và cho đường về trang 1.
  const isOutOfRangePage = products.length === 0 && currentPage > 1;

  // Mọi bộ lọc nằm trên query string để link chia sẻ được giữ nguyên điều kiện lọc.
  function buildSearchUrl(newParams: Record<string, string | number | undefined>) {
    const merged = { ...params, ...newParams };
    const query = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 'all') {
        query.set(key, String(value));
      }
    });
    return `/tim-kiem${query.toString() ? `?${query.toString()}` : ''}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Search Header Form */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-3xl font-serif font-black text-stone-100">
          Tìm Kiếm Quà Tết & Đặc Sản
        </h1>
        <p className="text-xs text-stone-400">
          Nhập tên món quà, loại bánh mứt, trà hoặc địa danh xuất xứ để tìm kiếm nhanh chóng.
        </p>

        <form action="/tim-kiem" method="GET" className="relative flex items-center shadow-lg">
          <input
            type="text"
            name="q"
            defaultValue={rawQ}
            maxLength={100}
            placeholder="Tìm 'Trà sen', 'Bánh pía', 'Hạt điều', 'Hà Nội'..."
            className="w-full px-5 py-4 pl-12 rounded-2xl bg-stone-900 border border-amber-600/30 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-400 text-sm"
          />
          {/* Giữ nguyên bộ lọc hiện có khi tìm kiếm lại */}
          {params.mien && <input type="hidden" name="mien" value={params.mien} />}
          {params.danh_muc && <input type="hidden" name="danh_muc" value={params.danh_muc} />}
          {params.gia_min && <input type="hidden" name="gia_min" value={params.gia_min} />}
          {params.gia_max && <input type="hidden" name="gia_max" value={params.gia_max} />}
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          <Search className="w-5 h-5 text-amber-400 absolute left-4" />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors"
          >
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Results Overview */}
      <div className="border-b border-stone-800 pb-4 flex items-center justify-between text-xs text-stone-400">
        <div>
          {rawQ ? (
            <p>
              Kết quả tìm kiếm cho từ khóa:{' '}
              <strong className="text-amber-400 text-sm">&ldquo;{rawQ}&rdquo;</strong> ({total} sản phẩm)
            </p>
          ) : (
            <p>Hiển thị tất cả sản phẩm đang có</p>
          )}
        </div>
      </div>

      {/* Product Grid with Empty State & Best Seller Fallback */}
      {isOutOfRangePage ? (
        <div className="py-12 text-center space-y-4 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800 p-8">
          <h3 className="text-lg font-serif font-bold text-stone-200">
            Không còn sản phẩm ở trang này
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Trang <strong className="text-amber-400">{currentPage}</strong> đã vượt quá kết quả hiện có.
            Hãy quay lại trang đầu để xem đầy đủ danh sách.
          </p>
          <Link
            href={buildSearchUrl({ page: 1 })}
            className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors"
          >
            Về trang 1
          </Link>
        </div>
      ) : (
        <ProductGrid
          products={products}
          emptyMessage={`Không tìm thấy sản phẩm nào khớp với từ khóa "${rawQ}".`}
          showBestSellerFallback={true}
          bestSellers={bestSellers}
        />
      )}
    </div>
  );
}
