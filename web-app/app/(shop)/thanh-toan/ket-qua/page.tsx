import type { Metadata } from 'next';
import Link from 'next/link';
import { ReceiptText } from 'lucide-react';

import { PaymentResult } from '@/components/checkout/PaymentResult';
import { paymentStatusQuerySchema } from '@/lib/validations/checkout';
import { createClient } from '@/lib/supabase/server';
import { findPayosOrderCodeByOrderCode, reconcilePayosOrder } from '@/lib/payos-reconcile';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kết quả thanh toán – Hương Quê',
  description: 'Theo dõi trạng thái thanh toán đơn quà Tết của bạn.',
  robots: { index: false, follow: false },
};

interface KetQuaPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function KetQuaPage({ searchParams }: KetQuaPageProps) {
  const params = await searchParams;
  const rawOrder = typeof params.order === 'string' ? params.order : '';
  const rawPhone = typeof params.phone === 'string' ? params.phone : '';
  const cancelled = params.huy === '1' || params.huy === 'true';

  // PayOS gắn thêm các tham số này vào returnUrl khi chuyển khách về.
  const payosCode = typeof params.code === 'string' ? params.code : '';
  const payosStatus = typeof params.status === 'string' ? params.status : '';
  const payosReportedSuccess = payosCode === '00' || payosStatus.toUpperCase() === 'PAID';

  const parsed = paymentStatusQuerySchema.safeParse({
    order: rawOrder,
    phone: rawPhone || undefined,
  });

  /**
   * TỰ ĐỐI SOÁT MỘT LẦN khi khách quay về từ PayOS.
   *
   * Vì sao cần: webhook có thể không tới được server (dev dùng localhost, URL chưa
   * đăng ký…). Nếu chỉ dựa vào webhook thì đơn kẹt "chưa thanh toán" dù PayOS đã thu tiền.
   *
   * An toàn:
   *  - Phải xem được đơn qua `get_payment_status` bằng phiên người dùng (chủ đơn /
   *    khớp SĐT / admin) ⇒ không ai dò được đơn người khác.
   *  - Chỉ đối soát đơn đang `pending_payment`; việc xác nhận do PayOS API + RPC
   *    `record_payos_result` quyết định, KHÔNG tin tham số trên URL.
   *  - Có cooldown 10 giây/đơn trong `lib/payos-reconcile.ts`.
   */
  if (parsed.success && !cancelled && payosReportedSuccess) {
    try {
      const supabase = await createClient();
      const { data: statusRow } = await supabase.rpc('get_payment_status', {
        p_order_code: parsed.data.order,
        p_phone: parsed.data.phone ?? null,
      });

      const current = statusRow as { status?: string; payment_status?: string } | null;

      if (current && current.payment_status !== 'paid' && current.status === 'pending_payment') {
        const payosOrderCode = await findPayosOrderCodeByOrderCode(parsed.data.order);
        if (payosOrderCode) {
          const result = await reconcilePayosOrder(payosOrderCode);
          console.info('[C07] tự đối soát đơn', parsed.data.order, '→', result.result);
        }
      }
    } catch (error) {
      // Không được làm hỏng trang kết quả chỉ vì bước đối soát lỗi.
      console.error('[C07] đối soát tự động lỗi:', error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {parsed.success ? (
        <PaymentResult
          orderCode={parsed.data.order}
          phone={parsed.data.phone}
          cancelled={cancelled}
        />
      ) : (
        <div className="mx-auto max-w-2xl rounded-3xl border border-stone-800 bg-stone-900/80 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <ReceiptText className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-stone-100">
            Thiếu hoặc sai mã đơn hàng
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Đường dẫn không kèm mã đơn hợp lệ. Bạn có thể tra cứu đơn hàng bằng mã đơn và số điện
            thoại đã dùng khi đặt.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/tra-cuu-don"
              className="inline-flex justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400"
            >
              Tra cứu đơn hàng
            </Link>
            <Link
              href="/san-pham"
              className="inline-flex justify-center rounded-xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-200 hover:border-amber-500/50"
            >
              Về trang sản phẩm
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
