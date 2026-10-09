import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

/** Cookie phiên giỏ hàng cho khách chưa đăng nhập (do middleware cấp). */
export const CART_SESSION_COOKIE = 'cart_session';
const CART_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

export async function middleware(request: NextRequest) {
  // 1. Cấp cookie giỏ hàng cho khách vãng lai (httpOnly, đọc ở server).
  //    Ghi vào CẢ request (để Server Component/Action đọc được ngay trong chính
  //    request này) LẪN response (để trình duyệt lưu lại cho các request sau).
  const existingCartSession = request.cookies.get(CART_SESSION_COOKIE)?.value;
  const cartSession = existingCartSession ?? crypto.randomUUID();
  if (!existingCartSession) {
    request.cookies.set(CART_SESSION_COOKIE, cartSession);
  }

  const { response, user, unavailable } = await updateSession(request);

  if (!existingCartSession) {
    response.cookies.set(CART_SESSION_COOKIE, cartSession, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_SESSION_MAX_AGE,
    });
  }

  // 2. Chặn sơ bộ /admin khi CHẮC CHẮN chưa đăng nhập.
  //    Nếu lỗi tạm thời (`unavailable`) thì KHÔNG redirect: người dùng vẫn đang
  //    đăng nhập, chỉ là chưa đọc được phiên — requireAdmin() ở server sẽ là chốt cuối.
  //    Quyền admin THẬT vẫn được kiểm tra lại trong requireAdmin() và trong database.
  if (request.nextUrl.pathname.startsWith('/admin') && !user && !unavailable) {
    const url = request.nextUrl.clone();
    url.pathname = '/dang-nhap';
    url.search = '';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Bỏ qua: _next/static, _next/image, favicon.ico và các file ảnh tĩnh.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
