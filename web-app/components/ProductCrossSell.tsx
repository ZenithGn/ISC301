import Link from 'next/link';
import { ArrowUpRight, PackagePlus, TrendingUp } from 'lucide-react';
import { formatVND } from '@/lib/format';
import type { CrossSellProduct, UpsellProduct } from '@/lib/products';

interface ProductCrossSellProps {
  items: CrossSellProduct[];
  /** true khi dữ liệu lấy từ sản phẩm cùng danh mục thay vì RPC mua kèm. */
  isCategoryFallback?: boolean;
}

/** C04 – "Thường mua kèm" (RPC `product_cross_sell`, rỗng thì fallback cùng danh mục). */
export function ProductCrossSell({ items, isCategoryFallback = false }: ProductCrossSellProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          {isCategoryFallback ? 'Cùng danh mục' : 'Gợi ý combo tiết kiệm'}
        </span>
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-amber-400" />
          Thường Được Mua Kèm
        </h2>
        <p className="text-xs text-stone-400">
          {isCategoryFallback
            ? 'Các hộp quà cùng nhóm đang được khách chọn nhiều trong mùa Tết này.'
            : 'Khách hàng thường thêm những món này vào cùng đơn để hộp quà thêm đủ đầy.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="group flex flex-col bg-stone-900/90 rounded-2xl border border-stone-800 hover:border-amber-500/50 transition-all overflow-hidden"
          >
            <Link
              href={`/san-pham/${item.slug}`}
              className="relative aspect-square w-full overflow-hidden bg-stone-950 block"
            >
              <img
                src={item.thumbnail_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'}
                alt={item.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {item.times_bought_together > 0 && (
                <span className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-red-950/90 text-amber-300 border border-amber-700/40">
                  <TrendingUp className="w-3 h-3" />
                  {item.times_bought_together} lượt mua kèm
                </span>
              )}
            </Link>

            <div className="p-4 flex flex-col flex-1 justify-between gap-3">
              <h3 className="font-serif font-bold text-sm text-stone-100 line-clamp-2 leading-snug">
                <Link href={`/san-pham/${item.slug}`} className="hover:text-amber-300 transition-colors">
                  {item.name}
                </Link>
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-amber-400">{formatVND(item.price)}</span>
                <Link
                  href={`/san-pham/${item.slug}`}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-stone-950 transition-all flex items-center gap-1"
                >
                  Xem <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProductUpsellProps {
  items: UpsellProduct[];
}

/** C04 – "Nâng cấp hộp quà" (RPC `product_upsell`). */
export function ProductUpsell({ items }: ProductUpsellProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Nâng cấp hộp quà
        </span>
        <h2 className="text-xl font-serif font-bold text-stone-100">
          Lên Đời Hộp Quà Cao Cấp Hơn
        </h2>
        <p className="text-xs text-stone-400">
          Chỉ thêm một khoản nhỏ để hộp quà thêm sang trọng, phù hợp biếu đối tác và người thân.
        </p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.product_id}
            className="flex items-center gap-4 p-4 rounded-2xl bg-stone-900/70 border border-stone-800 hover:border-amber-500/40 transition-colors"
          >
            <Link
              href={`/san-pham/${item.slug}`}
              className="w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0"
            >
              <img
                src={item.thumbnail_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80'}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </Link>

            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-sm text-stone-100 truncate">
                <Link href={`/san-pham/${item.slug}`} className="hover:text-amber-300 transition-colors">
                  {item.name}
                </Link>
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Giá nâng cấp:{' '}
                <span className="text-amber-300 font-semibold">
                  {item.price_difference > 0 ? `+${formatVND(item.price_difference)}` : 'Không đổi'}
                </span>
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm font-bold font-mono text-amber-400 block">{formatVND(item.price)}</span>
              <Link
                href={`/san-pham/${item.slug}`}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
              >
                Xem hộp quà <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
