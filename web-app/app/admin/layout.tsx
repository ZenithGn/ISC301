import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
  ChevronRight,
  Shield,
  Sparkles,
  Home,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SERVER GUARD BẮT BUỘC:
  // - Khách chưa đăng nhập -> chuyển sang /dang-nhap?next=/admin
  // - Customer thường cố vào /admin -> chuyển về '/' (trang chủ)
  const auth = await requireAdmin('/admin');
  const profile = auth.profile;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col md:flex-row text-stone-100">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 border-r border-stone-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Header */}
          <div className="p-6 border-b border-stone-800">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-black tracking-wider text-amber-300 text-base block">
                  HƯƠNG QUÊ
                </span>
                <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">
                  ADMIN PORTAL
                </span>
              </div>
            </Link>
          </div>

          {/* Admin Navigation */}
          <nav className="p-4 space-y-1.5 text-xs font-medium">
            <Link
              href="/admin"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan (A01)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
              Quản lý bán hàng
            </div>

            <Link
              href="/admin#products"
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-stone-300 hover:bg-stone-800 hover:text-amber-300 transition-colors"
            >
              <Package className="w-4 h-4 text-amber-500" />
              <span>Sản phẩm & Tồn kho</span>
            </Link>

            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-500 cursor-not-allowed"
              title="Đang phát triển cho tuần tới"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Đơn hàng Tết</span>
              </div>
              <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">
                Sắp có
              </span>
            </div>

            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-500 cursor-not-allowed"
              title="Đang phát triển cho tuần tới"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Khách hàng</span>
              </div>
              <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">
                Sắp có
              </span>
            </div>
          </nav>
        </div>

        {/* User Info & Switch to Shop */}
        <div className="p-4 border-t border-stone-800 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-stone-950/70 border border-stone-800 text-xs">
            <p className="text-amber-400 font-semibold truncate">
              {profile?.full_name || auth.user.email}
            </p>
            <p className="text-[10px] text-stone-400">Quyền: Quản trị viên tối cao</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về shop</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2 rounded-xl border border-stone-700 hover:bg-red-950/80 hover:text-rose-300 text-stone-400 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-stone-800 px-6 sm:px-8 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>Bảng điều khiển</span>
            <span>/</span>
            <span className="text-amber-400 font-medium">Trung tâm Quản trị</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Hệ thống RLS đã kích hoạt
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
