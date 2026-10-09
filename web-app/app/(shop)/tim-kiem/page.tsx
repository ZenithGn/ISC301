import { searchProducts, getBestSellingProducts } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';
import { Search } from 'lucide-react';

interface TimKiemPageProps {
  searchParams: Promise<{
    q?: string;
    mien?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function TimKiemPage({ searchParams }: TimKiemPageProps) {
  const params = await searchParams;
  const rawQ = params.q || '';

  const [searchResult, bestSellers] = await Promise.all([
    searchProducts(params),
    getBestSellingProducts(4),
  ]);

  const { products, total } = searchResult;

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
              Kết quả tìm kiếm cho từ khóa: <strong className="text-amber-400 text-sm">"{rawQ}"</strong> (
              {total} sản phẩm)
            </p>
          ) : (
            <p>Hiển thị tất cả sản phẩm đang có</p>
          )}
        </div>
      </div>

      {/* Product Grid with Empty State & Best Seller Fallback */}
      <ProductGrid
        products={products}
        emptyMessage={`Không tìm thấy sản phẩm nào khớp với từ khóa "${rawQ}".`}
        showBestSellerFallback={true}
        bestSellers={bestSellers}
      />
    </div>
  );
}
