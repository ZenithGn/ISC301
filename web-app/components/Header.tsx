import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import { ShoppingBag, Search, User as UserIcon, Shield, Sparkles, LogOut } from 'lucide-react';

export async function Header() {
  const auth = await getCurrentUser();
  const user = auth?.user;
  const profile = auth?.profile;
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 bg-red-950/95 backdrop-blur-md border-b border-amber-600/30 text-amber-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Slogan */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-red-950 font-bold shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 fill-red-950" />
            </div>
            <div>
              <span className="text-2xl font-serif font-bold tracking-wider text-amber-300 group-hover:text-amber-200 transition-colors block">
                HƯƠNG QUÊ
              </span>
              <span className="block text-[11px] text-amber-100/70 font-sans tracking-widest uppercase">
                Tinh Hoa Quà Tết Ba Miền
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-8 font-medium text-sm tracking-wide">
            <Link
              href="/"
              className="text-amber-100 hover:text-amber-300 transition-colors relative py-1"
            >
              Trang Chủ
            </Link>
            <Link
              href="/san-pham"
              className="text-amber-100 hover:text-amber-300 transition-colors relative py-1"
            >
              Tất Cả Sản Phẩm
            </Link>
            <Link
              href="/san-pham?mien=bac"
              className="text-amber-100/80 hover:text-amber-300 transition-colors"
            >
              Vị Bắc
            </Link>
            <Link
              href="/san-pham?mien=trung"
              className="text-amber-100/80 hover:text-amber-300 transition-colors"
            >
              Vị Trung
            </Link>
            <Link
              href="/san-pham?mien=nam"
              className="text-amber-100/80 hover:text-amber-300 transition-colors"
            >
              Vị Nam
            </Link>
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Link
              href="/tim-kiem"
              className="p-2.5 rounded-full hover:bg-red-900/60 text-amber-200 transition-colors"
              title="Tìm kiếm đặc sản quà Tết"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Admin Badge/Link if user is admin */}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-semibold text-xs tracking-wide shadow hover:brightness-110 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Quản Trị</span>
              </Link>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-3 ml-1 pl-3 border-l border-amber-600/30">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-amber-300 font-semibold truncate max-w-[140px]">
                    {profile?.full_name || user.email}
                  </p>
                  <p className="text-[10px] text-amber-200/60">
                    {isAdmin ? 'Quản trị viên' : 'Khách hàng thân thiết'}
                  </p>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-red-900/60 text-amber-200 text-xs font-medium transition-all"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1 pl-3 border-l border-amber-600/30">
                <Link
                  href="/dang-nhap"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-amber-200 hover:bg-red-900/60 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-red-950 hover:bg-amber-400 shadow-sm transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
