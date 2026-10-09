import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Làm mới session Supabase trong middleware (@supabase/ssr).
 * Middleware là nơi DUY NHẤT có thể ghi cookie auth đã refresh trong luồng request.
 *
 * Trả về:
 *  - `user`        : người dùng hiện tại (null nếu không có phiên)
 *  - `unavailable` : true khi KHÔNG đọc được phiên do lỗi tạm thời (mạng/timeout).
 *    Khi đó KHÔNG được coi là "chưa đăng nhập" và KHÔNG được redirect về /dang-nhap.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
  unavailable: boolean;
}> {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null, unavailable: false };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Cập nhật request để các Server Component đọc được cookie mới trong cùng request
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error && error.name !== 'AuthSessionMissingError') {
      // Lỗi tạm thời (timeout/mạng): giữ nguyên cookie phiên, đánh dấu unavailable.
      console.error('[middleware] Không đọc được phiên:', error.message);
      return { response, user: null, unavailable: true };
    }

    return { response, user: data.user ?? null, unavailable: false };
  } catch (error) {
    console.error('[middleware] Lỗi khi đọc phiên:', error);
    return { response, user: null, unavailable: true };
  }
}
