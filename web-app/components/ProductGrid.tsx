import { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { PackageSearch } from 'lucide-react';
import Link from 'next/link';

interface ProductGridProps {
  products: Product[];
  emptyMessage?: string;
  showBestSellerFallback?: boolean;
  bestSellers?: Product[];
}

export function ProductGrid({
  products,
  emptyMessage = 'Không tìm thấy sản phẩm phù hợp với bộ lọc.',
  showBestSellerFallback = false,
  bestSellers = [],
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center space-y-6 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800 p-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <PackageSearch className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-serif font-bold text-stone-200">{emptyMessage}</h3>
          <p className="text-xs text-stone-400">
            Hãy thử tìm bằng từ khóa khác hoặc xóa bớt các tiêu chí lọc theo miền / mức giá.
          </p>
          <div className="pt-2">
            <Link
              href="/san-pham"
              className="inline-block text-xs font-semibold px-4 py-2 rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>
        </div>

        {/* Fallback to Best Sellers if requested */}
        {showBestSellerFallback && bestSellers.length > 0 && (
          <div className="pt-10 border-t border-stone-800 text-left">
            <h4 className="text-sm font-serif font-bold text-amber-300 uppercase tracking-wider mb-4 text-center">
              Gợi ý đặc sản bán chạy được yêu thích nhất:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.product_id} product={product} />
      ))}
    </div>
  );
}
