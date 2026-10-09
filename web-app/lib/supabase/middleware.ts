import { NextResponse, type NextRequest } from 'next/server';
import { verifyJwt, JWT_COOKIE_NAME } from '@/lib/jwt';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // Bảo vệ route /admin với JWT Token
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get(JWT_COOKIE_NAME)?.value;

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/dang-nhap';
      url.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      // Token không hợp lệ hoặc hết hạn -> xóa cookie và yêu cầu đăng nhập lại
      const url = request.nextUrl.clone();
      url.pathname = '/dang-nhap';
      url.searchParams.set('next', request.nextUrl.pathname);
      const redirectRes = NextResponse.redirect(url);
      redirectRes.cookies.delete(JWT_COOKIE_NAME);
      return redirectRes;
    }

    if (payload.role !== 'admin') {
      // Người dùng không có quyền quản trị viên -> chuyển về trang chủ
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
