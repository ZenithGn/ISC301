import Link from 'next/link';
import { getSessionState } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import { SearchBox } from '@/components/SearchBox';
import {
  ShoppingBag,
  User as UserIcon,
  Shield,
  Sparkles,
  LogOut,
  Loader2,
} from 'lucide-react';

export async function Header() {
  const session = await getSessionState();
  const isAuthenticated = session.status === 'authenticated';
  const user = isAuthenticated ? session.auth.user : null;
  const profile = isAuthenticated ? session.auth.profile : null;
  const isAdmin = profile?.role === 'admin';
  /** Lỗi tạm thời khi đọc phiên: KHÔNG hiện như khách vãng lai để tránh cảm giác "bị đăng xuất oan". */
  const sessionUnknown = session.status === 'unavailable';

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

          {/*
            Nav: "Tra cứu đơn" chỉ dành cho khách vãng lai (kể cả khi chưa đọc được
            phiên — đây là trang tra cứu công khai). Khách đã đăng nhập thay bằng
            "Đơn hàng" + "Tài khoản"; nút "Đơn hàng" ở khu vực bên phải đã bỏ.
          */}
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
            {isAuthenticated ? (
              <>
                <Link
                  href="/tai-khoan/don-hang"
                  className="text-amber-100 hover:text-amber-300 transition-colors relative py-1"
                >
                  Đơn hàng
                </Link>
                <Link
                  href="/tai-khoan"
                  className="text-amber-100 hover:text-amber-300 transition-colors relative py-1"
                >
                  Tài khoản
                </Link>
              </>
            ) : (
              <Link
                href="/tra-cuu-don"
                className="text-amber-100/80 hover:text-amber-300 transition-colors"
              >
                Tra cứu đơn
              </Link>
            )}
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center gap-3">
            {/* Search: icon mở rộng thành ô nhập, Enter điều hướng sang /san-pham?q=... */}
            <SearchBox />

            {/* Cart */}
            <Link
              href="/gio-hang"
              className="p-2.5 rounded-full hover:bg-red-900/60 text-amber-200 transition-colors"
              title="Giỏ hàng của bạn"
            >
              <ShoppingBag className="w-5 h-5" />
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
            {sessionUnknown ? (
              <div
                className="flex items-center gap-2 ml-1 pl-3 border-l border-amber-600/30 text-[11px] text-amber-200/80"
                title="Chưa đọc được phiên đăng nhập do kết nối chậm — bạn vẫn đang đăng nhập"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang kết nối…</span>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3 ml-1 pl-3 border-l border-amber-600/30">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-amber-300 font-semibold truncate max-w-[140px]">
                    {profile?.full_name || user.email}
                  </p>
                  <p className="text-[10px] text-amber-200/60">
                    {isAdmin ? 'Quản trị viên' : 'Khách hàng thân thiết'}
                  </p>
                </div>
                <Link
                  href="/tai-khoan"
                  className="p-2 rounded-lg border border-amber-500/30 hover:bg-red-900/60 text-amber-200 transition-all"
                  title="Tài khoản của tôi"
                >
                  <UserIcon className="w-4 h-4" />
                </Link>
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
