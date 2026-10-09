import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import { Profile } from './types';
import { verifyJwt, JWT_COOKIE_NAME, signJwt, JWT_EXPIRES_IN_SECONDS } from './jwt';

export interface AuthUserResult {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, any>;
  };
  profile: Profile | null;
}

/**
 * Lấy user đã xác thực qua JWT token lưu trong Cookie (kết hợp Supabase Auth)
 */
export async function getCurrentUser(): Promise<AuthUserResult | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;

  // 1. Kiểm tra JWT Token trong Cookie trước tiên (cực nhanh, không nghẽn mạng)
  if (token) {
    const payload = await verifyJwt(token);
    if (payload) {
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: {
            full_name: payload.full_name,
            phone: payload.phone,
          },
        },
        profile: {
          id: payload.sub,
          email: payload.email,
          full_name: payload.full_name || '',
          phone: payload.phone || null,
          role: payload.role,
          created_at: new Date(payload.iat ? payload.iat * 1000 : Date.now()).toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
  }

  // 2. Fallback: Nếu chưa có JWT cookie, kiểm tra Supabase Auth Session
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('mock-tet-gift')) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Lấy profile từ bảng profiles (chứa role)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const userProfile = profile as Profile | null;
    const role = userProfile?.role || 'customer';
    const fullName = userProfile?.full_name || (user.user_metadata?.full_name as string) || '';
    const phone = userProfile?.phone || (user.user_metadata?.phone as string) || null;

    // Tự động cấp bù JWT Token vào cookie để các request sau nhanh hơn
    try {
      const jwtToken = await signJwt({
        sub: user.id,
        email: user.email || '',
        role: role,
        full_name: fullName,
        phone: phone,
      });

      cookieStore.set(JWT_COOKIE_NAME, jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: JWT_EXPIRES_IN_SECONDS,
      });
    } catch {
      // Ignored in read-only server component contexts
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata,
      },
      profile: userProfile,
    };
  } catch {
    return null;
  }
}

/**
 * Server guard: Yêu cầu đăng nhập. Nếu chưa đăng nhập thì redirect về /dang-nhap?next=...
 */
export async function requireUser(nextPath?: string): Promise<AuthUserResult> {
  const auth = await getCurrentUser();
  if (!auth) {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    redirect(`/dang-nhap${nextQuery}`);
  }
  return auth;
}

/**
 * Server guard: Yêu cầu quyền admin.
 * - Chưa đăng nhập -> redirect /dang-nhap?next=...
 * - Đã đăng nhập nhưng role = 'customer' -> redirect về '/' (trang chủ)
 */
export async function requireAdmin(nextPath: string = '/admin'): Promise<AuthUserResult> {
  const auth = await getCurrentUser();
  if (!auth) {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    redirect(`/dang-nhap${nextQuery}`);
  }

  if (auth.profile?.role !== 'admin') {
    redirect('/');
  }

  return auth;
}
