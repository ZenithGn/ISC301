import { parsePayosWebhook } from '@/lib/payos';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendOrderConfirmationEmail, type OrderEmailItem } from '@/lib/email';
import { pickString } from '@/lib/json-utils';

/**
 * Webhook PayOS – xác thực chữ ký, ghi nhận kết quả thanh toán qua service_role.
 *
 * Quy ước phản hồi:
 *   - 400: sai chữ ký / body không phải JSON.
 *   - 200 + {ok:true}: webhook thử khi đăng ký, giao dịch không thành công, hoặc đã xử lý xong.
 *   - 500: lỗi DB khi ghi nhận kết quả ⇒ để PayOS gửi lại.
 *
 * Ghi log CHỈ mã đơn/phiên PayOS và kết quả — không log khóa, chữ ký hay toàn bộ payload.
 *
 * Khớp với `huongque_db_full.sql`:
 *   - `record_payos_result(p_payos_order_code, p_amount, p_reference, p_raw)` — 4 tham số,
 *     KHÔNG có `p_paid_at` (hàm tự đặt `paid_at = now()` khi xác nhận).
 *   - `get_order_detail` KHÔNG trả `customer_email`, nên email xác nhận đọc thẳng bảng
 *     `orders` + `order_items` bằng service_role.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(payload: unknown, status: number): Response {
  return Response.json(payload, { status });
}

interface OrderRowForEmail {
  order_id: number;
  order_code: string;
  customer_email: string | null;
  recipient_name: string | null;
  province: string | null;
  shipping_address: string | null;
  total: number | null;
  payment_method: string | null;
}

/** Gửi email xác nhận cho đơn vừa được CONFIRMED. Mọi lỗi đều bị nuốt (chỉ ghi log). */
async function sendPaidOrderEmail(payosOrderCode: number): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: order, error } = await admin
    .from('orders')
    .select(
      'order_id, order_code, customer_email, recipient_name, province, shipping_address, total, payment_method'
    )
    .eq('payos_order_code', payosOrderCode)
    .maybeSingle<OrderRowForEmail>();

  if (error || !order) {
    console.warn('[payos:webhook] không đọc được đơn cho phiên', payosOrderCode);
    return;
  }

  const email = typeof order.customer_email === 'string' ? order.customer_email.trim() : '';
  if (!email) {
    console.warn('[payos:webhook] đơn', order.order_code, 'không có email — bỏ qua gửi xác nhận');
    return;
  }

  const { data: itemRows } = await admin
    .from('order_items')
    .select('product_name, unit_price, quantity')
    .eq('order_id', order.order_id);

  const items: OrderEmailItem[] = (itemRows ?? []).map((item) => ({
    name: String((item as { product_name?: unknown }).product_name ?? 'Sản phẩm'),
    quantity: Number((item as { quantity?: unknown }).quantity ?? 1) || 1,
    price: Number((item as { unit_price?: unknown }).unit_price ?? 0) || 0,
  }));

  const addressParts = [order.shipping_address, order.province].filter(
    (part): part is string => Boolean(part && String(part).trim())
  );

  const sent = await sendOrderConfirmationEmail({
    to: email,
    orderCode: String(order.order_code),
    total: Number(order.total ?? 0),
    paymentMethod: order.payment_method ?? 'payos',
    recipientName: order.recipient_name,
    shippingAddress: addressParts.length > 0 ? addressParts.join(', ') : null,
    items,
    paid: true,
  });

  console.info(
    '[payos:webhook] email xác nhận đơn',
    order.order_code,
    sent.sent ? 'đã gửi' : `bỏ qua (${sent.reason ?? 'unknown'})`
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const parsed = parsePayosWebhook(body);

  if (!parsed.valid) {
    console.warn('[payos:webhook] từ chối payload có chữ ký không hợp lệ');
    return json({ error: 'invalid signature' }, 400);
  }

  // Webhook thử khi đăng ký URL: chữ ký hợp lệ nhưng không có giao dịch thật.
  if (parsed.orderCode === null) {
    return json({ ok: true }, 200);
  }

  if (!parsed.success) {
    return json({ ok: true, ignored: true }, 200);
  }

  const payosOrderCode = parsed.orderCode;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    console.error('[payos:webhook] thiếu cấu hình service_role');
    return json({ error: 'server misconfigured' }, 500);
  }

  const { data, error } = await admin.rpc('record_payos_result', {
    p_payos_order_code: payosOrderCode,
    p_amount: Math.round(parsed.amount),
    p_reference: parsed.data?.reference ?? null,
    p_raw: (body ?? {}) as Record<string, unknown>,
  });

  if (error) {
    console.error(
      '[payos:webhook] record_payos_result lỗi cho phiên',
      payosOrderCode,
      '-',
      error.message
    );
    return json({ error: 'database error' }, 500);
  }

  const result =
    typeof data === 'string' ? data : pickString(data, ['result', 'status']) ?? 'UNKNOWN';

  console.info('[payos:webhook] phiên', payosOrderCode, '→', result);

  if (result === 'CONFIRMED') {
    try {
      await sendPaidOrderEmail(payosOrderCode);
    } catch (mailError) {
      // Email không bao giờ được làm hỏng phản hồi cho PayOS.
      console.error('[payos:webhook] gửi email lỗi cho phiên', payosOrderCode, mailError);
    }
  }

  return json({ ok: true, result }, 200);
}
