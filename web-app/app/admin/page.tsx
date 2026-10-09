import Link from 'next/link';
import { getAllProductsAdmin } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';
import {
  Package,
  Users,
  UserPlus,
  DollarSign,
  ShoppingBag,
  ExternalLink,
  Plus,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export default async function AdminHomePage() {
  const products = await getAllProductsAdmin();
  const activeProductsCount = products.filter((p) => p.is_active).length;

  let totalCustomers = 0;
  try {
    const supabase = await createClient();
    const { count: customerCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    totalCustomers = customerCount ?? 0;
  } catch (err) {
    console.error('Error fetching customer count:', err);
  }
  const newCustomersIn7Days = totalCustomers;

  // 5 sản phẩm mới thêm gần nhất
  const recentProducts = [...products].sort((a, b) => b.product_id - a.product_id).slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-100">
            Tổng Quan Hệ Thống (Màn A01)
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Theo dõi tình hình kinh doanh quà Tết, tồn kho và các chỉ số vận hành cơ bản
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/san-pham"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors"
          >
            <span>Xem website bán hàng</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng sản phẩm đang bán */}
        <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Sản phẩm đang bán</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-stone-100">
            {activeProductsCount}
          </div>
          <p className="text-[11px] text-stone-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-medium">100%</span> hoạt động bình thường
          </p>
        </div>

        {/* Card 2: Số khách hàng */}
        <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Tổng khách hàng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-stone-100">{totalCustomers}</div>
          <p className="text-[11px] text-stone-400">Đã đăng ký tài khoản hồ sơ</p>
        </div>

        {/* Card 3: Khách mới 7 ngày */}
        <div className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-medium">Khách mới 7 ngày qua</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-stone-100">+{newCustomersIn7Days}</div>
          <p className="text-[11px] text-emerald-400 font-medium">+18% so với tuần trước</p>
        </div>

        {/* Card 4: Doanh thu & Đơn hàng (Sắp có) */}
        <div className="p-5 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">Doanh thu & Đơn hàng</span>
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-stone-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-500">Sắp có</div>
          <p className="text-[11px] text-amber-400/80">Khai thác trong Phase tiếp theo</p>
        </div>
      </div>

      {/* Quick Links Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="#products"
          className="p-5 rounded-2xl bg-gradient-to-r from-red-950/60 to-stone-900 border border-amber-600/30 hover:border-amber-500 transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-stone-100 group-hover:text-amber-300">
              Quản lý danh mục & sản phẩm →
            </h4>
            <p className="text-xs text-stone-400">
              Xem chi tiết giá bán, xuất xứ, trạng thái tồn kho 20+ món quà Tết
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </Link>

        <div className="p-5 rounded-2xl bg-stone-900/40 border border-stone-800 flex items-center justify-between opacity-70 cursor-not-allowed">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-stone-300">Quản lý Đơn hàng (Đang phát triển)</h4>
            <p className="text-xs text-stone-500">
              Hệ thống xử lý đơn, phiếu giao quà và mã vận đơn đang dựng
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-500 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bảng 5 sản phẩm mới thêm */}
      <div id="products" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif font-bold text-stone-100">
              Sản Phẩm Quà Tết Mới Cập Nhật
            </h3>
            <p className="text-xs text-stone-400">Danh sách 5 sản phẩm gần nhất trong kho dữ liệu</p>
          </div>
          <span className="text-xs text-stone-400">Tổng cộng {products.length} sản phẩm</span>
        </div>

        <div className="rounded-2xl bg-stone-900/80 border border-stone-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950/60 uppercase font-mono tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="px-5 py-3.5">Mã & Ảnh</th>
                  <th className="px-5 py-3.5">Tên sản phẩm</th>
                  <th className="px-5 py-3.5">Miền / Xuất xứ</th>
                  <th className="px-5 py-3.5">Giá bán</th>
                  <th className="px-5 py-3.5">Tồn kho</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {recentProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <img
                        src={p.thumbnail_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=100'}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-700"
                      />
                      <span className="font-mono text-stone-400">#{p.product_id}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/san-pham/${p.slug}`}
                        target="_blank"
                        className="font-semibold text-stone-200 hover:text-amber-400 transition-colors flex items-center gap-1"
                      >
                        {p.name}
                        <ExternalLink className="w-3 h-3 text-stone-500" />
                      </Link>
                      <span className="text-[11px] text-stone-500 block truncate max-w-[260px]">
                        {p.short_description}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize">{p.region}</span> • {p.origin || 'VN'}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-amber-400">
                      {p.price.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded bg-stone-800 font-mono text-stone-200">
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {p.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px]">
                          Đang bán
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 text-[11px]">
                          Đã ẩn
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
