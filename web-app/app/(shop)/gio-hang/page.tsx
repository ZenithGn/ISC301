import type { Metadata } from 'next';

import { CartView } from '@/components/cart/CartView';
import { getCartAction } from '@/lib/actions/cart';
import { getCurrentUser } from '@/lib/auth';
import { DEFAULT_FREE_SHIPPING_FROM, type CartView as CartViewData } from '@/lib/validations/checkout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Giỏ hàng – Hương Quê',
  description: 'Xem lại set quà Tết đã chọn, áp mã giảm giá và tiến hành thanh toán.',
};

const EMPTY_CART: CartViewData = {
  items: [],
  subtotal: 0,
  discountAmount: 0,
  shippingFee: 0,
  total: 0,
  coupon: null,
  freeShippingFrom: DEFAULT_FREE_SHIPPING_FROM,
  itemCount: 0,
};

export default async function GioHangPage() {
  const [auth, cartResult] = await Promise.all([getCurrentUser(), getCartAction()]);
  const cart = cartResult.ok && cartResult.cart ? cartResult.cart : EMPTY_CART;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Bước 1 / 2
        </span>
        <h1 className="font-serif text-3xl font-black text-stone-100 sm:text-4xl">
          Giỏ hàng của bạn
        </h1>
        <p className="text-sm text-stone-400">
          Kiểm tra số lượng, áp mã ưu đãi và xem phí vận chuyển trước khi đặt quà Tết.
        </p>
      </header>

      {!cartResult.ok && cartResult.error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
        >
          {cartResult.error}
        </p>
      )}

      <CartView initialCart={cart} isLoggedIn={Boolean(auth)} />
    </div>
  );
}
