import Link from 'next/link';
import {
  getOrderDetail,
  listOrdersPaged,
  type OrderFilters,
} from '@/lib/actions/admin/data';
import {
  ADMIN_PAGE_SIZE,
  buildAdminQuery,
  parseAdminPage,
} from '@/lib/actions/admin/pagination';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { OrderActionPanel } from '@/components/admin/OrderActionPanel';
import {
  Alert,
  SectionTitle,
  adminCardClass,
  adminInputClass,
} from '@/components/admin/FormBits';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDateTime,
  formatNumber,
  formatTimeLeft,
  formatVND,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/format';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Đơn hàng – Quản trị Hương Quê' };

const STATUS_OPTIONS = ['pending_payment', 'confirmed', 'shipping', 'completed', 'cancelled'];
const METHOD_OPTIONS = ['cod', 'payos', 'bank_transfer'];

/** `searchParams` của A05: bộ lọc + `trang` (phân trang) + `id` (đơn đang mở). */
type OrdersSearchParams = {
  trang?: string;
  trang_thai?: string;
  phuong_thuc?: string;
  tu_ngay?: string;
  den_ngay?: string;
  q?: string;
  id?: string;
};

function needsManualRefund(note: string | null): boolean {
  if (!note) return false;
  return /hoàn tiền|nhận tiền sau khi đơn đã hủy/i.test(note);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  const params = await searchParams;

  const filters: OrderFilters = {
    status: params.trang_thai ?? 'all',
    method: params.phuong_thuc ?? 'all',
    from: params.tu_ngay,
    to: params.den_ngay,
    keyword: params.q,
  };

  const { data: page, error, needsServiceRole } = await listOrdersPaged(
    filters,
    parseAdminPage(params.trang)
  );
  const orders = page.rows;

  const selectedId = params.id ? Number(params.id) : null;
  const detail =
    selectedId && Number.isInteger(selectedId) && selectedId > 0
      ? await getOrderDetail(selectedId)
      : null;

  return (
    <div className="space-y-6 max-w-7xl">
      <SectionTitle
        code="A05"
        title="Quản lý đơn hàng"
        description="Lọc, xem chi tiết, đổi trạng thái và đối soát PayOS thủ công cho từng đơn."
      />

      <ConfigNotice />
      {error && !needsServiceRole ? <Alert tone="error">{error}</Alert> : null}

      <form method="get" className={`${adminCardClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`}>
        <div className="relative lg:col-span-2">
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Mã đơn, tên người nhận hoặc SĐT…"
            className={`${adminInputClass} pl-9`}
          />
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
        </div>

        <select name="trang_thai" defaultValue={filters.status} className={adminInputClass}>
          <option value="all">Mọi trạng thái</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>

        <select name="phuong_thuc" defaultValue={filters.method} className={adminInputClass}>
          <option value="all">Mọi phương thức</option>
          {METHOD_OPTIONS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method] ?? method}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            name="tu_ngay"
            defaultValue={params.tu_ngay ?? ''}
            className={adminInputClass}
            aria-label="Từ ngày"
          />
          <input
            type="date"
            name="den_ngay"
            defaultValue={params.den_ngay ?? ''}
            className={adminInputClass}
            aria-label="Đến ngày"
          />
        </div>

        <button
          type="submit"
          className="sm:col-span-2 lg:col-span-1 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
        >
          Lọc đơn
        </button>
      </form>

      {detail && (
        <section className={`${adminCardClass} space-y-5`}>
          {detail.errors.length > 0 ? (
            <Alert tone="warning">
              <ul className="list-disc list-inside space-y-0.5">
                {detail.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {!detail.order ? (
            <p className="text-xs text-stone-400">Không tìm thấy đơn hàng này.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-stone-100 font-mono">
                    {detail.order.code}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {formatDateTime(detail.order.createdAt)} · {detail.order.customerName} ·{' '}
                    {detail.order.customerPhone} · {detail.order.province}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono text-amber-400">
                    {formatVND(detail.order.total)}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {orderStatusLabel(detail.order.status)} ·{' '}
                    {paymentMethodLabel(detail.order.paymentMethod)} ·{' '}
                    {paymentStatusLabel(detail.order.paymentStatus)}
                  </p>
                  {detail.order.status === 'pending_payment' && detail.order.expiresAt ? (
                    <p className="text-[11px] text-amber-300 mt-1">
                      Hạn thanh toán: {formatTimeLeft(detail.order.expiresAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="space-y-3 lg:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Sản phẩm ({detail.items.length})
                  </h4>
                  <div className="rounded-xl border border-stone-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-stone-300">
                      <thead className="bg-stone-950/60 text-stone-400 font-mono uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2">Sản phẩm</th>
                          <th className="px-3 py-2 text-right">SL</th>
                          <th className="px-3 py-2 text-right">Đơn giá</th>
                          <th className="px-3 py-2 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800">
                        {detail.items.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-stone-500">
                              Không đọc được dòng sản phẩm.
                            </td>
                          </tr>
                        )}
                        {detail.items.map((item, index) => (
                          <tr key={`${item.productId ?? 'x'}-${index}`}>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2 text-right font-mono">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatVND(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-mono text-amber-400">
                              {formatVND(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 pt-2">
                    Lịch sử trạng thái
                  </h4>
                  {detail.history.length === 0 ? (
                    <p className="text-xs text-stone-500">Chưa có lịch sử.</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.history.map((entry, index) => (
                        <li
                          key={`${entry.createdAt ?? 'x'}-${index}`}
                          className="rounded-xl border border-stone-800 bg-stone-950/50 px-3 py-2"
                        >
                          <p className="text-xs text-stone-200">
                            {orderStatusLabel(entry.status)}
                            {needsManualRefund(entry.note) ? (
                              <span className="ml-2 rounded-full border border-amber-700/60 bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-300">
                                Cần hoàn tiền thủ công
                              </span>
                            ) : null}
                          </p>
                          {entry.note ? (
                            <p className="text-[11px] text-stone-500 mt-0.5">{entry.note}</p>
                          ) : null}
                          <p className="text-[10px] text-stone-600 mt-0.5">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 pt-2">
                    Nhật ký thanh toán ({detail.payments.length})
                  </h4>
                  {detail.payments.length === 0 ? (
                    <p className="text-xs text-stone-500">Chưa có bản ghi thanh toán.</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.payments.map((payment, index) => (
                        <li
                          key={`${payment.id ?? 'x'}-${index}`}
                          className={`rounded-xl border px-3 py-2 text-xs ${
                            payment.isSuccess
                              ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-200'
                              : 'border-red-800/60 bg-red-950/40 text-rose-200'
                          }`}
                        >
                          <p className="font-mono">
                            {paymentMethodLabel(payment.provider)} · {formatVND(payment.amount)} ·{' '}
                            {payment.isSuccess ? 'thành công' : 'SAI SỐ TIỀN / thất bại'}
                          </p>
                          <p className="text-[11px] opacity-80">
                            {payment.reference ?? 'không có mã giao dịch'} ·{' '}
                            {formatDateTime(payment.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Thao tác
                  </h4>
                  <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-4">
                    <OrderActionPanel
                      orderId={detail.order.id ?? 0}
                      currentStatus={detail.order.status}
                      paymentMethod={detail.order.paymentMethod}
                      hasPayosCode={Boolean(detail.order.payosOrderCode)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <div className={`${adminCardClass} overflow-x-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-stone-100">
            {formatNumber(page.total)} đơn hàng khớp bộ lọc
          </h3>
          <p className="text-[11px] text-stone-500">
            Trang {page.page}/{page.totalPages} · bấm mã đơn để mở chi tiết và đối soát PayOS.
          </p>
        </div>

        <table className="w-full text-left text-xs text-stone-300">
          <thead className="uppercase font-mono tracking-wider text-stone-400 border-b border-stone-800">
            <tr>
              <th className="py-2.5 pr-3">Mã đơn</th>
              <th className="py-2.5 pr-3">Ngày</th>
              <th className="py-2.5 pr-3">Người nhận</th>
              <th className="py-2.5 pr-3">Thanh toán</th>
              <th className="py-2.5 pr-3">Trạng thái</th>
              <th className="py-2.5 text-right">Tổng tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-500">
                  Không có đơn hàng nào khớp bộ lọc.
                </td>
              </tr>
            )}
            {orders.map((order, index) => {
              const key = order.id ?? `${order.code}-${index}`;
              return (
                <tr key={key} className="hover:bg-stone-800/40 transition-colors">
                  <td className="py-2.5 pr-3">
                    {order.id ? (
                      <Link
                        href={`/admin/don-hang${buildAdminQuery(params, { id: order.id })}`}
                        className="font-mono font-semibold text-amber-400 hover:text-amber-300"
                      >
                        {order.code}
                      </Link>
                    ) : (
                      <span className="font-mono text-stone-400">{order.code}</span>
                    )}
                    {order.payosOrderCode ? (
                      <span className="ml-2 text-[10px] text-stone-500 font-mono">
                        PayOS #{order.payosOrderCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-stone-400">{formatDateTime(order.createdAt)}</td>
                  <td className="py-2.5 pr-3">
                    <p className="text-stone-200">{order.customerName}</p>
                    <p className="text-[11px] text-stone-500">
                      {order.customerPhone} · {order.province}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <p>{paymentMethodLabel(order.paymentMethod)}</p>
                    <p className="text-[11px] text-stone-500">
                      {paymentStatusLabel(order.paymentStatus)}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3">{orderStatusLabel(order.status)}</td>
                  <td className="py-2.5 text-right font-mono text-amber-400">
                    {formatVND(order.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <AdminPagination
          page={page.page}
          totalItems={page.total}
          pageSize={ADMIN_PAGE_SIZE}
          basePath="/admin/don-hang"
          // Giữ nguyên bộ lọc nhưng bỏ `id`: chi tiết đang mở không nhất thiết
          // nằm trong trang mới.
          params={{ ...params, id: undefined }}
          itemLabel="đơn hàng"
        />
      </div>
    </div>
  );
}
