import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { findPayosOrderCodeByOrderCode, reconcilePayosOrder } from '@/lib/payos-reconcile';

/**
 * Đối soát PayOS theo yêu cầu (khi webhook bị lỡ).
 *
 * Dùng cho: C07 hết 60 giây poll, hoặc nút "Tôi đã thanh toán – kiểm tra lại".
 *
 * Quy tắc an toàn:
 *  - Phải có quyền xem đơn: gọi `get_payment_status(order, phone)` bằng phiên người
 *    dùng trước (chủ đơn / khớp SĐT / admin). Không qua được ⇒ 404.
 *  - Query string KHÔNG bao giờ được dùng để đánh dấu đã thanh toán; chỉ PayOS API +
 *    RPC `record_payos_result` mới xác nhận.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  order: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{4,32}$/, { message: 'Mã đơn hàng không hợp lệ' }),
  phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{9}$/, { message: 'Số điện thoại không hợp lệ' })
    .optional(),
});

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    order: url.searchParams.get('order') ?? '',
    phone: url.searchParams.get('phone') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Tham số không hợp lệ.' }, { status: 400 });
  }

  const { order, phone } = parsed.data;

  try {
    // 1. Kiểm tra quyền xem đơn bằng chính phiên người dùng.
    const supabase = await createClient();
    const { data: status, error } = await supabase.rpc('get_payment_status', {
      p_order_code: order,
      p_phone: phone ?? null,
    });

    if (error || !status) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    const view = status as {
      status?: string;
      payment_status?: string;
    };

    // 2. Đã trả tiền rồi thì không cần hỏi PayOS.
    if (view.payment_status === 'paid') {
      return NextResponse.json({ ok: true, result: 'ALREADY_PAID', payment_status: 'paid' });
    }

    // 3. Chỉ đối soát đơn PayOS đang chờ thanh toán.
    if (view.status !== 'pending_payment') {
      return NextResponse.json({
        ok: true,
        result: 'NOT_PENDING',
        status: view.status,
        payment_status: view.payment_status,
      });
    }

    const payosOrderCode = await findPayosOrderCodeByOrderCode(order);
    if (!payosOrderCode) {
      return NextResponse.json({ error: 'Đơn này không có mã PayOS để đối soát.' }, { status: 409 });
    }

    const reconcile = await reconcilePayosOrder(payosOrderCode);
    console.info('[payos:reconcile] đơn', order, '→', reconcile.result);

    return NextResponse.json(
      {
        ok: reconcile.ok,
        result: reconcile.result,
        message: reconcile.message,
        amountPaid: reconcile.amountPaid ?? null,
      },
      { status: reconcile.result === 'COOLDOWN' ? 429 : 200 }
    );
  } catch (error) {
    console.error('[payos:reconcile] lỗi cho đơn', order, error);
    return NextResponse.json({ error: 'Không đối soát được lúc này.' }, { status: 500 });
  }
}
