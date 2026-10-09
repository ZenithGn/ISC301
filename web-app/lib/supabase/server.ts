import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Timeout cho mỗi request tới Supabase (Auth + Postgres).
 *
 * TRƯỚC ĐÂY là 6000ms cứng ⇒ mạng chậm/cold start là request bị cắt, `getUser()`
 * ném lỗi và người dùng đang đăng nhập bị coi như "chưa đăng nhập" (tự logout).
 * Nay đặt mặc định 20s và cho phép cấu hình qua biến môi trường.
 */
const SUPABASE_FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS ?? 20000);

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
      global: {
        fetch: (url, options = {}) => {
          // KHÔNG ép `Connection: close`: keep-alive giúp tái sử dụng TLS,
          // tránh mỗi request Supabase phải bắt tay lại (nguyên nhân chậm > 6s).
          return fetch(url, {
            ...options,
            cache: 'no-store',
            signal:
              options.signal ??
              AbortSignal.timeout(
                Number.isFinite(SUPABASE_FETCH_TIMEOUT_MS) && SUPABASE_FETCH_TIMEOUT_MS > 0
                  ? SUPABASE_FETCH_TIMEOUT_MS
                  : 20000
              ),
          });
        },
      },
    }
  );
}
