import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getBestSellingProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import {
  MapPin,
  Building,
  Tag,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react';

interface SanPhamDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SanPhamDetailPage({ params }: SanPhamDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // Bắt buộc: Trả về 404 khi slug không tồn tại hoặc sản phẩm is_active = false
  if (!product || !product.is_active) {
    notFound();
  }

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : null;

  const regionNames: Record<string, string> = {
    bac: 'Miền Bắc',
    trung: 'Miền Trung',
    nam: 'Miền Nam',
    ba_mien: 'Ba Miền Hội Tụ',
  };

  const relatedProducts = await getBestSellingProducts(4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-400 flex items-center gap-2">
        <Link href="/" className="hover:text-amber-300">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/san-pham" className="hover:text-amber-300">
          Sản phẩm
        </Link>
        <span>/</span>
        <span className="text-amber-400 font-medium truncate max-w-[200px] sm:max-w-none">
          {product.name}
        </span>
      </nav>

      {/* Main Product Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Product Image */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-stone-900 border border-stone-800 shadow-xl">
            <img
              src={product.thumbnail_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {discountPercent && (
              <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Tiết kiệm {discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Right: Details & Order Box */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {regionNames[product.region] || 'Đặc sản vùng miền'}
              </span>
              {product.is_featured && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
                  Quà Tết Tiêu Biểu
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-stone-100 leading-tight">
              {product.name}
            </h1>

            {/* Rating & Sold count */}
            <div className="flex items-center gap-4 text-xs text-stone-400 pt-1">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{product.rating_avg.toFixed(1)}</span>
                <span className="text-stone-500 font-normal">({product.rating_count} đánh giá)</span>
              </div>
              <span>•</span>
              <div>
                Đã bán <strong className="text-stone-200">{product.sold_count}</strong> {product.unit}
              </div>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 flex items-baseline gap-4">
            <div className="text-3xl font-bold font-mono text-amber-400">
              {product.price.toLocaleString('vi-VN')}₫
            </div>
            {product.compare_at_price && (
              <div className="text-sm text-stone-500 line-through">
                {product.compare_at_price.toLocaleString('vi-VN')}₫
              </div>
            )}
            <div className="text-xs text-stone-400">/ 1 {product.unit}</div>
          </div>

          {/* Key Attributes */}
          <div className="grid grid-cols-2 gap-4 py-3 border-y border-stone-800/80 text-xs">
            <div className="space-y-1">
              <span className="text-stone-500 block">Xuất xứ tỉnh/thành:</span>
              <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {product.origin || 'Việt Nam'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-stone-500 block">Cơ sở sản xuất / Đối tác:</span>
              <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-400" />
                {product.producer || 'Hương Quê OCOP'}
              </span>
            </div>
          </div>

          {/* Stock status indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400">Tình trạng tồn kho:</span>
            {product.stock > 0 ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Còn {product.stock} {product.unit} sẵn sàng giao
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-rose-500">
                <XCircle className="w-4 h-4" />
                Hết hàng
              </span>
            )}
          </div>

          {/* Quantity selector (UI for next sprint) */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
              Chọn số lượng:
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-stone-700 rounded-xl bg-stone-900 overflow-hidden">
                <button
                  type="button"
                  className="px-4 py-2.5 hover:bg-stone-800 text-stone-300 transition-colors"
                  aria-label="Giảm"
                >
                  -
                </button>
                <span className="px-4 py-2.5 text-xs font-bold text-stone-100 min-w-[40px] text-center">
                  1
                </span>
                <button
                  type="button"
                  className="px-4 py-2.5 hover:bg-stone-800 text-stone-300 transition-colors"
                  aria-label="Tăng"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md ${
                  product.stock > 0
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 hover:brightness-110 shadow-amber-500/20'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                {product.stock > 0 ? 'Đặt Hộp Quà (Sắp ra mắt giỏ hàng)' : 'Hết Hàng'}
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800/80 space-y-2 text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Cam kết chuẩn vệ sinh ATTP, không chất bảo quản độc hại</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Giao hỏa tốc nội thành 2h, đóng gói hộp Tết cao cấp chống móp méo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-4 pt-10 border-t border-stone-800">
        <h2 className="text-xl font-serif font-bold text-stone-100">
          Mô Tả Chi Tiết & Ý Nghĩa Ngày Tết
        </h2>
        <div className="prose prose-invert max-w-none text-stone-300 text-sm leading-relaxed space-y-4">
          <p>{product.description || product.short_description}</p>
          <p>
            Tết Nguyên Đán là thời khắc sum họp linh thiêng của gia đình Việt. Những món quà biếu không chỉ chứa đựng hương vị tinh túy của đất trời mà còn là thông điệp yêu thương, lời chúc vẹn tròn trao gửi tới người thân, bạn bè và đối tác.
          </p>
        </div>
      </div>

      {/* Related Products */}
      <div className="space-y-6 pt-10 border-t border-stone-800">
        <h2 className="text-xl font-serif font-bold text-stone-100">
          Đặc Sản Bán Chạy Có Thể Bạn Quan Tâm
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts
            .filter((p) => p.product_id !== product.product_id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
        </div>
      </div>
    </div>
  );
}
