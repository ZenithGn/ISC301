import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client KHÔNG dùng cookie/session — chỉ đọc dữ liệu công khai
 * (sản phẩm, danh mục, banner…) trong ngữ cảnh không có request:
 * `sitemap.ts`, `robots.ts`, script, hoặc prerender tĩnh.
 *
 * Dùng client này thay cho `createClient()` của `@/lib/supabase/server` khi
 * KHÔNG cần danh tính người dùng, để route có thể render TĨNH (nhanh, cache được)
 * thay vì bị coi là dynamic chỉ vì có gọi `cookies()`.
 */

let cached: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (cached) return cached;

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'X-Client-Info': 'huongque-web/public' },
    },
  });

  return cached;
}
