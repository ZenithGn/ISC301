import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Gift,
  MapPin,
  Package,
  Phone,
  StickyNote,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import {
  ORDER_STATUS_STYLES,
  formatDateTime,
  formatTimeLeft,
  formatVND,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from '@/lib/format';
import {
  canPayOrder,
  hasReviewedProduct,
  isOrderCancellable,
  isPaymentExpired,
  maskPhone,
  type OrderDetailView as OrderDetail,
} from '@/components/orders/order-detail';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { CancelOrderDialog } from '@/components/orders/CancelOrderDialog';
import { ReviewModal } from '@/components/ReviewModal';

interface OrderDetailViewProps {
  order: OrderDetail;
  /** `owner`: đơn của chính người dùng (có hành động). `guest`: tra cứu vãng lai (chỉ đọc, che SĐT). */
  variant?: 'owner' | 'guest';
}

/** Chỉ cho phép mở link http(s) — chặn `javascript:` hay URL lạ từ dữ liệu. */
function isSafeHttpUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function OrderDetailView({ order, variant = 'owner' }: OrderDetailViewProps) {
  const isGuest = variant === 'guest';
  const cancellable = !isGuest && isOrderCancellable(order.status);
  // Khách vãng lai vẫn được thanh toán đơn PayOS của chính mình (đã xác thực bằng mã đơn + SĐT);
  // hủy đơn và đánh giá thì bắt buộc đăng nhập.
  const payable = canPayOrder(order);
  const paymentExpired = isPaymentExpired(order.expiresAt);
  const canReview = !isGuest && order.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Tổng quan đơn */}
      <section className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-stone-500">Mã đơn hàng</p>
            <h1 className="font-mono text-xl font-bold text-amber-300 sm:text-2xl">
              {order.orderCode}
            </h1>
            <p className="text-xs text-stone-400">
              Đặt lúc <span className="text-stone-300">{formatDateTime(order.createdAt)}</span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <OrderStatusBadge status={order.status} />
            {order.paymentStatus && (
              <span className="text-[11px] text-stone-400">
                Thanh toán:{' '}
                <span className="font-medium text-stone-300">
                  {paymentStatusLabel(order.paymentStatus)}
                </span>
              </span>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-stone-800 pt-5 sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500">
              <CreditCard className="h-3.5 w-3.5" /> Phương thức thanh toán
            </dt>
            <dd className="mt-1 text-sm text-stone-200">
              {paymentMethodLabel(order.paymentMethod)}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500">
              <Package className="h-3.5 w-3.5" /> Số mặt hàng
            </dt>
            <dd className="mt-1 text-sm text-stone-200">{order.items.length} món</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500">
              <CreditCard className="h-3.5 w-3.5" /> Tổng thanh toán
            </dt>
            <dd className="mt-1 font-mono text-base font-bold text-amber-400">
              {formatVND(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Hạn thanh toán + nút thanh toán PayOS */}
      {order.status === 'pending_payment' && (order.expiresAt || payable) && (
        <section
          className={`rounded-2xl border p-4 sm:p-5 ${
            paymentExpired
              ? 'border-stone-800 bg-stone-900/60'
              : 'border-amber-700/50 bg-amber-950/30'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 rounded-full p-2 ${
                  paymentExpired ? 'bg-stone-800 text-stone-400' : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {paymentExpired ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-100">
                  {paymentExpired ? 'Đã hết hạn thanh toán' : 'Đơn hàng đang chờ thanh toán'}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  {order.expiresAt
                    ? `Hạn thanh toán: ${formatDateTime(order.expiresAt)}${
                        paymentExpired ? '' : ` (${formatTimeLeft(order.expiresAt)})`
                      }`
                    : 'Vui lòng hoàn tất thanh toán để đơn được xử lý.'}
                </p>
              </div>
            </div>

            {payable && order.payosCheckoutUrl && isSafeHttpUrl(order.payosCheckoutUrl) && (
              <a
                href={order.payosCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 shadow-sm transition-all hover:bg-amber-400"
              >
                Thanh toán ngay
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Danh sách món */}
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/80">
        <header className="flex items-center gap-2 border-b border-stone-800 px-5 py-4">
          <Package className="h-4 w-4 text-amber-400" />
          <h2 className="font-serif text-base font-bold text-stone-100">Sản phẩm trong đơn</h2>
        </header>

        {order.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-stone-400">
            Không có thông tin chi tiết sản phẩm cho đơn này.
          </p>
        ) : (
          <ul className="divide-y divide-stone-800">
            {order.items.map((item, index) => (
              <li
                key={`${item.productId ?? 'item'}-${index}`}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-stone-800 bg-stone-950">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-600">
                      <Gift className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-[160px] flex-1">
                  {item.slug ? (
                    <Link
                      href={`/san-pham/${item.slug}`}
                      className="line-clamp-2 text-sm font-semibold text-stone-100 transition-colors hover:text-amber-300"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-semibold text-stone-100">{item.name}</p>
                  )}
                  <p className="mt-1 text-xs text-stone-400">
                    {formatVND(item.unitPrice)} × {item.quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {formatVND(item.lineTotal)}
                  </span>
                  {canReview && item.productId !== null && (
                    <ReviewModal
                      productId={item.productId}
                      productName={item.name}
                      orderCode={order.orderCode}
                      alreadyReviewed={hasReviewedProduct(order, item.productId)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tổng kết tiền */}
      <section className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6">
        <h2 className="font-serif text-base font-bold text-stone-100">Chi tiết thanh toán</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-stone-400">Tiền hàng</dt>
            <dd className="font-mono text-stone-200">{formatVND(order.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-stone-400">Phí vận chuyển</dt>
            <dd className="font-mono text-stone-200">
              {order.shippingFee > 0 ? formatVND(order.shippingFee) : 'Miễn phí'}
            </dd>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-stone-400">Giảm giá</dt>
              <dd className="font-mono text-emerald-400">-{formatVND(order.discount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-stone-800 pt-3">
            <dt className="font-semibold text-stone-100">Tổng cộng</dt>
            <dd className="font-mono text-lg font-bold text-amber-400">
              {formatVND(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Người nhận */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-base font-bold text-stone-100">
            <Truck className="h-4 w-4 text-amber-400" /> Thông tin nhận hàng
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
              <span className="text-stone-200">{order.receiverName || '—'}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
              <span className="font-mono text-stone-200">
                {isGuest ? maskPhone(order.receiverPhone) : order.receiverPhone || '—'}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
              <span className="text-stone-200">{order.shippingAddress || '—'}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-base font-bold text-stone-100">
            <StickyNote className="h-4 w-4 text-amber-400" /> Ghi chú & lời chúc
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-stone-500">Ghi chú</p>
              <p className="mt-1 whitespace-pre-line text-stone-200">{order.note || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-stone-500">Lời chúc Tết</p>
              <p className="mt-1 whitespace-pre-line text-amber-200/90">{order.greeting || '—'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline trạng thái */}
      <section className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6">
        <h2 className="font-serif text-base font-bold text-stone-100">Lịch sử trạng thái</h2>

        {order.history.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">Chưa có lịch sử trạng thái.</p>
        ) : (
          <ol className="mt-5 space-y-0">
            {order.history.map((entry, index) => {
              const isLast = index === order.history.length - 1;
              const style =
                ORDER_STATUS_STYLES[entry.status] ?? 'bg-stone-800 text-stone-300 border-stone-700';
              return (
                <li key={`${entry.status}-${entry.at ?? index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                        isLast ? 'border-amber-400 bg-amber-400' : 'border-stone-600 bg-stone-900'
                      }`}
                    />
                    {!isLast && <span className="w-px flex-1 bg-stone-800" />}
                  </div>
                  <div className={isLast ? 'pb-0' : 'pb-6'}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style}`}
                      >
                        {orderStatusLabel(entry.status)}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {formatDateTime(entry.at)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-1.5 text-xs text-stone-400">{entry.note}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Hành động */}
      {cancellable && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/80 p-5">
          <div>
            <p className="text-sm font-semibold text-stone-100">Cần thay đổi?</p>
            <p className="text-xs text-stone-400">
              Bạn có thể hủy đơn khi đơn còn ở trạng thái chờ thanh toán hoặc đã xác nhận.
            </p>
          </div>
          <CancelOrderDialog orderCode={order.orderCode} />
        </section>
      )}

      {!isGuest && order.status === 'completed' && order.items.length > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Đơn đã hoàn tất — bạn có thể đánh giá từng sản phẩm bằng nút “Đánh giá”.
        </p>
      )}
    </div>
  );
}
