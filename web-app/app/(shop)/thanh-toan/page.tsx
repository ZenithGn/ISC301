import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ShoppingBag } from 'lucide-react';

import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { getCartAction } from '@/lib/actions/cart';
import { getCurrentUser } from '@/lib/auth';
import type { CheckoutFormValues } from '@/lib/validations/checkout';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thanh toán – Hương Quê',
  description: 'Điền thông tin người nhận và chọn phương thức thanh toán cho đơn quà Tết.',
};

interface ThanhToanPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ThanhToanPage({ searchParams }: ThanhToanPageProps) {
  const params = await searchParams;
  const couponFromUrl = typeof params.coupon === 'string' ? params.coupon : '';

  const [auth, cartResult] = await Promise.all([
    getCurrentUser(),
    getCartAction(couponFromUrl || undefined),
  ]);

  const cart = cartResult.ok && cartResult.cart ? cartResult.cart : null;
  const profile = auth?.profile ?? null;
  const hasUnavailable = Boolean(cart?.items.some((item) => !item.available));

  const initialValues: CheckoutFormValues = {
    recipientName: profile?.full_name ?? '',
    recipientPhone: profile?.phone ?? '',
    customerEmail: profile?.email ?? auth?.user.email ?? '',
    province: '',
    shippingAddress: '',
    note: '',
    giftMessage: '',
    couponCode: cart?.coupon?.valid && cart.coupon.code ? cart.coupon.code : couponFromUrl,
    paymentMethod: 'cod',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Bước 2 / 2
        </span>
        <h1 className="font-serif text-3xl font-black text-stone-100 sm:text-4xl">
          Thanh toán đơn quà Tết
        </h1>
        <p className="text-sm text-stone-400">
          Kiểm tra kỹ tên và số điện thoại người nhận để quà Tết đến đúng tay.
        </p>
      </header>

      {!cart || cart.items.length === 0 ? (
        <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-bold text-stone-100">
            Chưa có sản phẩm để thanh toán
          </h2>
          <p className="mt-2 text-sm text-stone-400">
            Giỏ hàng của bạn đang trống. Hãy chọn vài set quà Tết rồi quay lại bước này.
          </p>
          <Link
            href="/san-pham"
            className="mt-6 inline-flex rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400"
          >
            Khám phá quà Tết
          </Link>
        </div>
      ) : hasUnavailable ? (
        <div className="rounded-3xl border border-red-900/60 bg-red-950/40 p-8">
          <p className="flex items-center gap-2 font-serif text-xl font-bold text-red-100">
            <AlertTriangle className="h-5 w-5" />
            Chưa thể thanh toán
          </p>
          <p className="mt-2 text-sm text-red-200">
            Một số sản phẩm trong giỏ đã hết hàng hoặc vượt tồn kho. Vui lòng điều chỉnh số lượng
            trong giỏ hàng trước khi đặt.
          </p>
          <Link
            href="/gio-hang"
            className="mt-5 inline-flex rounded-xl border border-red-800/60 px-5 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-900/50"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      ) : (
        <CheckoutForm
          initialValues={initialValues}
          cart={cart}
          isLoggedIn={Boolean(auth)}
        />
      )}
    </div>
  );
}
