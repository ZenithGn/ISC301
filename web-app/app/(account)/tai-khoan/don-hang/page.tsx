import Link from 'next/link';
import { AlertTriangle, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import { listUserOrders } from '@/lib/actions/customer-orders';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatDateTime, formatTimeLeft, formatVND, paymentMethodLabel } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Đơn hàng của tôi – Hương Quê',
};

/** C12 — Danh sách đơn hàng của khách đang đăng nhập. */
export default async function DonHangPage() {
  const { orders, migrationPending, message } = await listUserOrders();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Tiêu đề + breadcrumb */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-xs text-stone-400">
          <Link href="/" className="hover:text-amber-300">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/tai-khoan" className="hover:text-amber-300">
            Tài khoản
          </Link>
          <span>/</span>
          <span className="font-medium text-amber-400">Đơn hàng</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-800 pb-6">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-black text-stone-100 sm:text-3xl">
              <ShoppingBag className="h-6 w-6 text-amber-400" />
              Đơn hàng của tôi
            </h1>
            <p className="mt-1 text-xs text-stone-400 sm:text-sm">
              Theo dõi trạng thái và chi tiết các đơn quà Tết bạn đã đặt.
            </p>
          </div>
          <Link
            href="/san-pham"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-stone-950"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>

      {migrationPending && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-700/50 bg-amber-950/30 px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="text-xs text-amber-200">
            <p className="font-semibold">Cần chạy migration</p>
            <p className="mt-0.5 text-amber-200/80">
              Hàm <span className="font-mono">fn_list_user_orders()</span> chưa tồn tại trong cơ sở
              dữ liệu nên chưa thể liệt kê danh sách đơn. Vui lòng chạy migration PayOS rồi tải lại
              trang.
            </p>
          </div>
        </div>
      )}

      {message && !migrationPending && (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3.5 text-xs text-red-300">
          {message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 px-6 py-14 text-center">
          <span className="rounded-full bg-stone-800 p-3 text-stone-400">
            <Package className="h-6 w-6" />
          </span>
          <div>
            <p className="font-serif text-lg font-bold text-stone-100">Chưa có đơn hàng nào</p>
            <p className="mt-1 text-xs text-stone-400">
              Khám phá các hộp quà Tết và đặc sản ba miền của Hương Quê.
            </p>
          </div>
          <Link
            href="/san-pham"
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            Xem sản phẩm
          </Link>
        </div>
      ) : (
        <>
          {/* Bảng (màn hình rộng) */}
          <div className="hidden overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/80 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950/60 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã đơn</th>
                  <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Thanh toán</th>
                  <th className="px-5 py-3 text-right font-semibold">Tổng tiền</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {orders.map((order) => (
                  <tr key={order.orderCode} className="transition-colors hover:bg-stone-800/40">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold text-amber-300">
                        {order.orderCode}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-stone-500">
                        {order.itemCount} mặt hàng
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-300">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={order.status} />
                      {order.status === 'pending_payment' && order.expiresAt && (
                        <span className="mt-1 block text-[11px] text-amber-300/80">
                          {formatTimeLeft(order.expiresAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-300">
                      {paymentMethodLabel(order.paymentMethod)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-sm font-bold text-amber-400">
                      {formatVND(order.total)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/tai-khoan/don-hang/${encodeURIComponent(order.orderCode)}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-stone-950"
                      >
                        Xem chi tiết
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thẻ (di động) */}
          <ul className="space-y-3 md:hidden">
            {orders.map((order) => (
              <li
                key={order.orderCode}
                className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-amber-300">{order.orderCode}</p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>
                    {paymentMethodLabel(order.paymentMethod)} · {order.itemCount} mặt hàng
                  </span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {formatVND(order.total)}
                  </span>
                </div>

                {order.status === 'pending_payment' && order.expiresAt && (
                  <p className="text-[11px] text-amber-300/80">
                    Hạn thanh toán: {formatTimeLeft(order.expiresAt)}
                  </p>
                )}

                <Link
                  href={`/tai-khoan/don-hang/${encodeURIComponent(order.orderCode)}`}
                  className="flex items-center justify-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-stone-950"
                >
                  Xem chi tiết
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
