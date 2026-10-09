import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { Star, MapPin, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const regionBadge = {
    bac: { text: 'Miền Bắc', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50' },
    trung: { text: 'Miền Trung', bg: 'bg-amber-950/80 text-amber-300 border-amber-700/50' },
    nam: { text: 'Miền Nam', bg: 'bg-rose-950/80 text-rose-300 border-rose-700/50' },
    ba_mien: { text: 'Ba Miền', bg: 'bg-purple-950/80 text-purple-300 border-purple-700/50' },
  }[product.region] || { text: 'Đặc sản', bg: 'bg-stone-800 text-stone-200 border-stone-600' };

  return (
    <div className="group relative flex flex-col bg-stone-900/90 rounded-2xl border border-stone-800 hover:border-amber-500/50 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-amber-500/5 overflow-hidden">
      {/* Product Image & Badges */}
      <Link href={`/san-pham/${product.slug}`} className="relative aspect-square w-full overflow-hidden bg-stone-950">
        <img
          src={product.thumbnail_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Region Badge */}
        <span
          className={`absolute top-3 left-3 text-[11px] font-medium px-2.5 py-1 rounded-full border backdrop-blur-md ${regionBadge.bg}`}
        >
          {regionBadge.text}
        </span>

        {/* Discount Badge */}
        {discountPercent && (
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white shadow-sm flex items-center gap-1">
            <Tag className="w-3 h-3" />
            -{discountPercent}%
          </span>
        )}

        {/* Stock status indicator */}
        {product.stock <= 0 ? (
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-red-800 text-white text-xs font-bold uppercase tracking-wider">
              Tạm hết hàng
            </span>
          </div>
        ) : product.stock <= 5 ? (
          <span className="absolute bottom-3 left-3 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-600/90 text-white">
            Chỉ còn {product.stock} hộp
          </span>
        ) : null}
      </Link>

      {/* Info & Pricing */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Origin & Rating */}
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
              {product.origin || 'Việt Nam'}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Star className="w-3 h-3 fill-amber-400" />
              {product.rating_avg.toFixed(1)}
              <span className="text-stone-500">({product.rating_count})</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif font-bold text-stone-100 group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
            <Link href={`/san-pham/${product.slug}`}>
              {product.name}
            </Link>
          </h3>

          {/* Short description */}
          {product.short_description && (
            <p className="text-xs text-stone-400 line-clamp-2 mt-1.5 leading-relaxed">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Price & Action */}
        <div className="pt-2 border-t border-stone-800/80 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-amber-400 font-mono">
                {product.price.toLocaleString('vi-VN')}₫
              </span>
              <span className="text-[11px] text-stone-400">/{product.unit}</span>
            </div>
            {product.compare_at_price && (
              <span className="text-xs text-stone-500 line-through">
                {product.compare_at_price.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>

          <Link
            href={`/san-pham/${product.slug}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-stone-950 transition-all"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}
