import Link from 'next/link';
import { getCategories, getFeaturedProducts } from '@/lib/products';
import { getCurrentUser } from '@/lib/auth';
import { ProductCard } from '@/components/ProductCard';
import { Sparkles, Gift, ArrowRight, ShieldCheck, Truck, Clock, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const auth = await getCurrentUser();
  const user = auth?.user;
  const profile = auth?.profile;
  const isAdmin = profile?.role === 'admin';

  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
  ]);

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-950 via-red-900 to-stone-950 text-amber-50 pt-12 pb-24 border-b border-amber-900/30">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Personalized Greeting Banner based on auth state */}
          {user ? (
            <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center">
                  {(profile?.full_name || user.email || 'K')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-200">
                    Chào mừng trở lại, {profile?.full_name || user.email}!
                  </p>
                  <p className="text-xs text-amber-200/70">
                    Đã lưu sẵn địa chỉ giao quà Tết & mã ưu đãi tri ân thành viên.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold shadow hover:bg-amber-400 transition-all"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Vào trang quản trị
                  </Link>
                )}
                <Link
                  href="/san-pham"
                  className="px-4 py-2 rounded-xl bg-stone-900/80 border border-amber-500/30 text-amber-200 text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Đơn hàng của tôi
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Khai Xuân Như Ý • Quà Tết Đắc Lộc 2027</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 leading-tight">
                Gói Trọn Nghĩa Tình, <br />
                Đậm Đà Vị Tết Ba Miền
              </h1>

              <p className="text-base sm:text-lg text-amber-100/80 max-w-2xl leading-relaxed">
                Tuyển chọn những thức quà quý OCOP từ Bắc tới Nam: Trà Thái Nguyên thơm búp, Ô mai Hà Thành, Mè xửng Cung Đình, Bánh Pía Sóc Trăng, gửi gắm ước nguyện một năm mới An Khang Thịnh Vượng.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  href="/san-pham"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Khám phá Quà Tết
                </Link>
                <Link
                  href="/san-pham?mien=ba_mien"
                  className="px-6 py-3.5 rounded-xl border border-amber-500/40 hover:bg-red-900/60 text-amber-200 font-semibold text-sm transition-all"
                >
                  Hộp Quà Ba Miền
                </Link>
              </div>
            </div>

            {/* Banner Feature Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl bg-gradient-to-tr from-stone-900 to-red-950 p-3">
                <img
                  src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80"
                  alt="Hộp quà Tết An Khang"
                  className="w-full h-80 object-cover rounded-2xl"
                />
                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Bộ sưu tập giới hạn
                  </span>
                  <h3 className="text-xl font-serif font-bold text-stone-100">
                    Hộp Quà Tết Thịnh Vượng (Hộp Gỗ Sơn Mài VIP)
                  </h3>
                  <p className="text-xs text-stone-300">
                    8 vật phẩm thượng hạng: Trà sen Tây Hồ, Mắc ca Đắk Nông, Nước mắm cốt Phú Quốc.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-amber-300 font-mono">1.190.000₫</span>
                    <Link
                      href="/san-pham/hop-qua-tet-thinh-vuong"
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      Xem ngay <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VALUE PROPOSITIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-100">100% Chính Gốc</h4>
              <p className="text-xs text-stone-400">Nông sản OCOP trứ danh</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-100">Thiết Kế Đẳng Cấp</h4>
              <p className="text-xs text-stone-400">Kèm thiệp viết tay thư pháp</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-100">Giao Quà Toàn Quốc</h4>
              <p className="text-xs text-stone-400">Bọc chống sốc chuyên dụng</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-100">Hỗ Trợ 24/7</h4>
              <p className="text-xs text-stone-400">Tư vấn quà biếu tặng tận tâm</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. DANH MỤC QUÀ TẾT & ĐẶC SẢN VÙNG MIỀN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Khám Phá Hương Vị
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-100 mt-1">
              Danh Mục Đặc Sản Ngày Tết
            </h2>
          </div>
          <Link
            href="/san-pham"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
          >
            Xem tất cả danh mục <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.category_id}
              href={`/san-pham?danh_muc=${cat.slug}`}
              className="group p-4 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-800/80 transition-all text-center flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-stone-700 group-hover:scale-105 transition-transform">
                <img
                  src={cat.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300'}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-200 group-hover:text-amber-300 transition-colors">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. SẢN PHẨM NỔI BẬT (is_featured = true) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Được Yêu Thích Nhất
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-100 mt-1">
              Quà Tết Nổi Bật & Bán Chạy
            </h2>
          </div>
          <Link
            href="/san-pham?sort=featured"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
          >
            Xem thêm sản phẩm <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. KHỐI ĐĂNG KÝ NHẬN ƯU ĐÃI (DÀNH CHO KHÁCH) */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 p-8 sm:p-12 border border-amber-600/30 text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Đặc Quyền Hội Viên
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-amber-100">
              Đăng Ký Tài Khoản Nhận Ngay Ưu Đãi Giảm 10% Cho Đơn Hàng Đầu Tiên
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-xl mx-auto">
              Nhận thông báo sớm nhất về các set quà Tết giới hạn, lịch trình giao hàng dịp Tết và mã giảm giá vận chuyển miễn phí.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                href="/dang-ky"
                className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-sm shadow hover:bg-amber-400 transition-colors"
              >
                Đăng ký nhận ưu đãi
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
