import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeNextUrl } from '@/lib/validations';

/**
 * Trao đổi `code` (PKCE) hoặc `token_hash` từ email của Supabase thành session,
 * rồi chuyển người dùng về `?next=` (chỉ nhận đường dẫn nội bộ).
 *
 * Dùng cho: xác nhận đăng ký, đặt lại mật khẩu, magic link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = sanitizeNextUrl(searchParams.get('next'));

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('[auth/callback] exchangeCodeForSession lỗi:', error.message);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'recovery' | 'email' | 'email_change' | 'invite' | 'magiclink',
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('[auth/callback] verifyOtp lỗi:', error.message);
    }
  } catch (error) {
    console.error('[auth/callback] lỗi không mong đợi:', error);
  }

  return NextResponse.redirect(
    `${origin}/dang-nhap?error=link-khong-hop-le`
  );
}
