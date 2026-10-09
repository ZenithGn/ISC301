'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgePercent,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';

import {
  getCartAction,
  mergeGuestCartAction,
  removeFromCartAction,
  setQuantityAction,
} from '@/lib/actions/cart';
import { formatVND } from '@/lib/format';
import type { CartItemView, CartView } from '@/lib/validations/checkout';

interface CartViewProps {
  initialCart: CartView;
  isLoggedIn: boolean;
}

function CartRow({
  item,
  busy,
  onQuantityChange,
  onRemove,
}: {
  item: CartItemView;
  busy: boolean;
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center border-b border-stone-800 last:border-b-0">
      <div className="flex flex-1 items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-stone-800 bg-stone-950">
          <img
            src={
              item.thumbnailUrl ||
              'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&auto=format&fit=crop&q=80'
            }
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          {item.slug ? (
            <Link
              href={`/san-pham/${item.slug}`}
              className="font-serif text-base font-bold text-stone-100 hover:text-amber-300"
            >
              {item.name}
            </Link>
          ) : (
            <span className="font-serif text-base font-bold text-stone-100">
              {item.name}
            </span>
          )}

          <p className="mt-1 text-xs text-stone-400">
            {formatVND(item.price)}
            {item.unit ? ` / ${item.unit}` : ''}
          </p>

          {!item.available && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-red-950/70 px-2 py-1 text-[11px] font-medium text-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Tạm hết hàng hoặc không đủ số lượng — vui lòng giảm số lượng hoặc xoá dòng này
              trước khi thanh toán.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center rounded-xl border border-stone-700 bg-stone-950">
          <button
            type="button"
            aria-label={`Giảm số lượng ${item.name}`}
            onClick={() => onQuantityChange(item.productId, Math.max(0, item.quantity - 1))}
            disabled={busy}
            className="px-3 py-2 text-stone-300 hover:text-amber-300 disabled:opacity-50"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-10 text-center text-sm font-semibold text-amber-200">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label={`Tăng số lượng ${item.name}`}
            onClick={() => onQuantityChange(item.productId, Math.min(99, item.quantity + 1))}
            disabled={busy}
            className="px-3 py-2 text-stone-300 hover:text-amber-300 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <span className="w-28 text-right font-mono text-sm font-bold text-amber-400">
          {formatVND(item.lineTotal)}
        </span>

        <button
          type="button"
          aria-label={`Xoá ${item.name} khỏi giỏ`}
          onClick={() => onRemove(item.productId)}
          disabled={busy}
          className="rounded-lg border border-stone-800 p-2 text-stone-400 hover:border-red-800 hover:text-red-300 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CartView({ initialCart, isLoggedIn }: CartViewProps) {
  const [cart, setCart] = useState<CartView>(initialCart);
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [couponInput, setCouponInput] = useState(initialCart.coupon?.code ?? '');
  const [couponBusy, setCouponBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mergedRef = useRef(false);

  // Server Component cấp lại giỏ hàng sau mỗi lần revalidatePath.
  // Đồng bộ ngay trong lúc render (mẫu "adjusting state when a prop changes" của React)
  // thay vì setState trong useEffect để tránh cascading render.
  const [syncedCartSource, setSyncedCartSource] = useState(initialCart);
  if (syncedCartSource !== initialCart) {
    setSyncedCartSource(initialCart);
    setCart(initialCart);
  }

  // Sau khi đăng nhập, gộp giỏ của khách vãng lai vào tài khoản.
  // Chỉ gọi khi thực sự có hàng trong giỏ (tránh RPC vô ích) và mỗi lần tải trang một lần.
  const cartItemCount = cart.items.length;
  useEffect(() => {
    if (!isLoggedIn) {
      mergedRef.current = false;
      return;
    }
    if (cartItemCount === 0 || mergedRef.current) return;
    mergedRef.current = true;
    void (async () => {
      const result = await mergeGuestCartAction();
      if (result.ok && result.cart) setCart(result.cart);
    })();
  }, [isLoggedIn, cartItemCount]);

  async function handleQuantityChange(productId: number, quantity: number) {
    setError(null);
    setBusyProductId(productId);
    const result = await setQuantityAction(productId, quantity);
    setBusyProductId(null);
    if (result.ok && result.cart) setCart(result.cart);
    else setError(result.error ?? 'Không cập nhật được số lượng.');
  }

  async function handleRemove(productId: number) {
    setError(null);
    setBusyProductId(productId);
    const result = await removeFromCartAction(productId);
    setBusyProductId(null);
    if (result.ok && result.cart) setCart(result.cart);
    else setError(result.error ?? 'Không xoá được sản phẩm khỏi giỏ.');
  }

  async function handleApplyCoupon() {
    setError(null);
    setCouponBusy(true);
    const result = await getCartAction(couponInput);
    setCouponBusy(false);
    if (result.ok && result.cart) setCart(result.cart);
    else setError(result.error ?? 'Không kiểm tra được mã giảm giá.');
  }

  const hasUnavailable = cart.items.some((item) => !item.available);
  const remainingForFreeShipping = Math.max(0, cart.freeShippingFrom - cart.subtotal);
  const checkoutHref = cart.coupon?.valid && cart.coupon.code
    ? `/thanh-toan?coupon=${encodeURIComponent(cart.coupon.code)}`
    : '/thanh-toan';

  if (cart.items.length === 0) {
    return (
      <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-bold text-stone-100">
          Giỏ hàng đang trống
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          Hãy chọn vài set quà Tết ba miền để gửi trọn nghĩa tình nhé.
        </p>
        <Link
          href="/san-pham"
          className="mt-6 inline-flex rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400"
        >
          Khám phá quà Tết
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <div className="rounded-3xl border border-stone-800 bg-stone-900/60 px-5 py-2 sm:px-6">
          {cart.items.map((item) => (
            <CartRow
              key={item.productId}
              item={item}
              busy={busyProductId === item.productId}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
          <label
            htmlFor="coupon"
            className="flex items-center gap-2 text-sm font-semibold text-stone-200"
          >
            <BadgePercent className="h-4 w-4 text-amber-400" />
            Mã giảm giá
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="coupon"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              placeholder="VD: TET2027"
              maxLength={50}
              className="flex-1 rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponBusy}
              className="rounded-xl border border-amber-500/40 px-5 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-500 hover:text-stone-950 disabled:opacity-60"
            >
              {couponBusy ? 'Đang kiểm tra…' : 'Áp dụng'}
            </button>
          </div>

          {cart.coupon && (
            <p
              className={`mt-3 text-xs ${
                cart.coupon.valid ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {cart.coupon.valid
                ? cart.coupon.message ||
                  `Đã áp dụng mã ${cart.coupon.code}.`
                : cart.coupon.message ||
                  `Mã ${cart.coupon.code} không hợp lệ hoặc đã hết hạn.`}
            </p>
          )}
        </div>
      </section>

      <aside className="lg:col-span-4">
        <div className="sticky top-24 space-y-4 rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="font-serif text-xl font-bold text-stone-100">Tóm tắt đơn hàng</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-stone-300">
              <dt>Tạm tính ({cart.itemCount} phần)</dt>
              <dd className="font-mono">{formatVND(cart.subtotal)}</dd>
            </div>
            {cart.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-300">
                <dt>Giảm giá</dt>
                <dd className="font-mono">-{formatVND(cart.discountAmount)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between text-stone-300">
              <dt>Phí vận chuyển</dt>
              <dd className="font-mono">
                {cart.shippingFee > 0 ? formatVND(cart.shippingFee) : 'Miễn phí'}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-stone-800 pt-3 text-base font-bold text-amber-300">
              <dt>Tổng cộng</dt>
              <dd className="font-mono">{formatVND(cart.total)}</dd>
            </div>
          </dl>

          {cart.freeShippingFrom > 0 && remainingForFreeShipping > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              Còn {formatVND(remainingForFreeShipping)} để được miễn phí ship.
            </p>
          )}
          {cart.freeShippingFrom > 0 && remainingForFreeShipping <= 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              Đơn hàng đã được miễn phí vận chuyển.
            </p>
          )}

          {hasUnavailable ? (
            <div className="rounded-xl border border-red-900/60 bg-red-950/50 px-3 py-3 text-xs text-red-200">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Chưa thể thanh toán
              </p>
              <p className="mt-1">
                Một số dòng hàng tạm hết hoặc vượt tồn kho. Vui lòng điều chỉnh giỏ hàng trước.
              </p>
            </div>
          ) : (
            <Link
              href={checkoutHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-stone-950 hover:bg-amber-400"
            >
              Tiến hành thanh toán
            </Link>
          )}

          <Link
            href="/san-pham"
            className="block text-center text-xs font-medium text-stone-400 hover:text-amber-300"
          >
            Tiếp tục chọn quà Tết
          </Link>
        </div>
      </aside>
    </div>
  );
}
