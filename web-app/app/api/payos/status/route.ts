import { createClient } from '@/lib/supabase/server';
import { paymentStatusQuerySchema } from '@/lib/validations/checkout';

/**
 * Trạng thái thanh toán cho C07 – client polling mỗi 3 giây.
 *
 * Dùng client theo session người dùng (RPC `get_payment_status` tự giới hạn dữ
 * liệu trả về: mã đơn, trạng thái, tổng tiền, phương thức, hạn thanh toán).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const parsed = paymentStatusQuerySchema.safeParse({
    order: url.searchParams.get('order') ?? '',
    phone: url.searchParams.get('phone') || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: 'Tham số không hợp lệ. Cần tham số ?order=<mã đơn>.' },
      { status: 400 }
    );
  }

  const { order, phone } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_payment_status', {
      p_order_code: order,
      p_phone: phone ?? null,
    });

    if (error) {
      console.error('[payos:status] get_payment_status lỗi cho đơn', order, '-', error.message);
      return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    if (!data) {
      return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error('[payos:status] lỗi không xác định cho đơn', order, error);
    return Response.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
  }
}
