import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { safeCompare } from '@/lib/payos';
import { pickNumber } from '@/lib/json-utils';

/**
 * Cron: huỷ các đơn quá hạn thanh toán (Vercel Cron gọi mỗi 5 phút).
 *
 * Bảo vệ bằng `Authorization: Bearer $CRON_SECRET`; RPC `cancel_expired_orders`
 * chỉ cấp EXECUTE cho service_role nên phải dùng getSupabaseAdmin().
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret || !authorization || !safeCompare(`Bearer ${secret}`, authorization)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    console.error('[cron:cancel-expired] thiếu cấu hình service_role');
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }

  const { data, error } = await admin.rpc('cancel_expired_orders');

  if (error) {
    console.error('[cron:cancel-expired] RPC lỗi:', error.message);
    return Response.json({ error: 'database error' }, { status: 500 });
  }

  const cancelled =
    typeof data === 'number' ? data : pickNumber(data, ['cancelled', 'count'], 0);

  console.info('[cron:cancel-expired] đã huỷ', cancelled, 'đơn quá hạn');

  return Response.json({ cancelled }, { status: 200 });
}
