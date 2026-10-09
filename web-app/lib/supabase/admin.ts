import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client dùng service_role – BỎ QUA RLS.
 *
 * CHỈ ĐƯỢC GỌI Ở SERVER trong các ngữ cảnh tin cậy:
 *   - Route Handler webhook PayOS (/api/payos/webhook)
 *   - Cron (/api/cron/cancel-expired)
 *   - Server Action gọi các RPC chỉ cấp EXECUTE cho service_role
 *
 * TUYỆT ĐỐI không import file này vào Client Component và không đưa
 * SUPABASE_SERVICE_ROLE_KEY ra biến NEXT_PUBLIC_*.
 */

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY. ' +
        'Biến này chỉ được cấu hình ở server (Vercel Environment Variables / .env.local).'
    );
  }

  if (cached) return cached;

  cached = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'huongque-web/service-role' },
    },
  });

  return cached;
}

/** Có đủ cấu hình service_role hay không (dùng để hiện hướng dẫn thay vì crash). */
export function hasSupabaseAdminConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
