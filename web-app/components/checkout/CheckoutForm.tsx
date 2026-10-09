'use client';

import { useState } from 'react';
import { AlertTriangle, Banknote, CreditCard, Gift, Loader2, Lock } from 'lucide-react';

import { placeOrderAction } from '@/lib/actions/orders';
import { formatVND } from '@/lib/format';
import {
  checkoutFormSchema,
  toFieldErrors,
  PAYMENT_METHOD_OPTIONS,
  type CheckoutFormValues,
  type CartView,
} from '@/lib/validations/checkout';

interface CheckoutFormProps {
  initialValues: CheckoutFormValues;
  cart: CartView;
  isLoggedIn: boolean;
}

const inputClassName =
  'w-full rounded-xl border border-stone-700 bg-stone-950 px-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none disabled:opacity-60';

const labelClassName = 'block text-xs font-semibold uppercase tracking-wide text-stone-300';

export function CheckoutForm({ initialValues, cart, isLoggedIn }: CheckoutFormProps) {
  const [values, setValues] = useState<CheckoutFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = checkoutFormSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setFormError('Vui lòng kiểm tra lại các ô được đánh dấu.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const result = await placeOrderAction(values);

    if (result.ok && result.redirectTo) {
      window.location.assign(result.redirectTo);
      return;
    }

    setSubmitting(false);
    setFieldErrors(result.fieldErrors ?? {});
    setFormError(result.error ?? 'Không đặt được hàng. Vui lòng thử lại.');
  }

  const shippingFree = cart.shippingFee <= 0;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12" noValidate>
      <div className="space-y-6 lg:col-span-8">
        <section className="rounded-3xl border border-stone-800 bg-stone-900/60 p-6">
          <h2 className="font-serif text-xl font-bold text-stone-100">Thông tin người nhận</h2>
          <p className="mt-1 text-xs text-stone-400">
            Hương Quê giao tận tay người nhận, kèm thiệp viết tay theo lời chúc của bạn.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="recipientName" className={labelClassName}>
                Họ tên người nhận *
              </label>
              <input
                id="recipientName"
                name="recipientName"
                value={values.recipientName}
                onChange={(event) => update('recipientName', event.target.value)}
                maxLength={100}
                autoComplete="name"
                disabled={submitting}
                className={inputClassName}
                placeholder="Nguyễn Văn An"
              />
              {fieldErrors.recipientName && (
                <p className="text-xs text-red-300">{fieldErrors.recipientName}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="recipientPhone" className={labelClassName}>
                Số điện thoại *
              </label>
              <input
                id="recipientPhone"
                name="recipientPhone"
                value={values.recipientPhone}
                onChange={(event) =>
                  update('recipientPhone', event.target.value.replace(/[^0-9]/g, '').slice(0, 10))
                }
                inputMode="numeric"
                autoComplete="tel"
                disabled={submitting}
                className={inputClassName}
                placeholder="0901234567"
              />
              {fieldErrors.recipientPhone && (
                <p className="text-xs text-red-300">{fieldErrors.recipientPhone}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="customerEmail" className={labelClassName}>
                Email nhận xác nhận đơn {isLoggedIn ? '' : '*'}
              </label>
              <div className="relative">
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={values.customerEmail}
                  onChange={(event) => update('customerEmail', event.target.value)}
                  autoComplete="email"
                  disabled={submitting}
                  className={inputClassName}
                  placeholder="ban@email.com"
                />
                {isLoggedIn && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              {fieldErrors.customerEmail && (
                <p className="text-xs text-red-300">{fieldErrors.customerEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="province" className={labelClassName}>
                Tỉnh / thành phố *
              </label>
              <input
                id="province"
                name="province"
                value={values.province}
                onChange={(event) => update('province', event.target.value)}
                maxLength={100}
                autoComplete="address-level1"
                disabled={submitting}
                className={inputClassName}
                placeholder="Hà Nội"
              />
              {fieldErrors.province && (
                <p className="text-xs text-red-300">{fieldErrors.province}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="shippingAddress" className={labelClassName}>
                Địa chỉ nhận hàng *
              </label>
              <input
                id="shippingAddress"
                name="shippingAddress"
                value={values.shippingAddress}
                onChange={(event) => update('shippingAddress', event.target.value)}
                maxLength={255}
                autoComplete="street-address"
                disabled={submitting}
                className={inputClassName}
                placeholder="Số 12, phố Hàng Mã, quận Hoàn Kiếm"
              />
              {fieldErrors.shippingAddress && (
                <p className="text-xs text-red-300">{fieldErrors.shippingAddress}</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/60 p-6">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-stone-100">
            <Gift className="h-5 w-5 text-amber-400" />
            Thiệp chúc Tết & ghi chú
          </h2>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label htmlFor="giftMessage" className={labelClassName}>
                Lời chúc trên thiệp (tối đa 300 ký tự)
              </label>
              <textarea
                id="giftMessage"
                name="giftMessage"
                value={values.giftMessage}
                onChange={(event) => update('giftMessage', event.target.value.slice(0, 300))}
                rows={3}
                maxLength={300}
                disabled={submitting}
                className={inputClassName}
                placeholder="Kính chúc gia đình năm mới An Khang Thịnh Vượng!"
              />
              <p className="text-right text-[11px] text-stone-500">
                {values.giftMessage.length}/300
              </p>
              {fieldErrors.giftMessage && (
                <p className="text-xs text-red-300">{fieldErrors.giftMessage}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className={labelClassName}>
                Ghi chú cho người bán
              </label>
              <textarea
                id="note"
                name="note"
                value={values.note}
                onChange={(event) => update('note', event.target.value.slice(0, 500))}
                rows={2}
                maxLength={500}
                disabled={submitting}
                className={inputClassName}
                placeholder="Giao buổi sáng, gọi trước khi đến…"
              />
              {fieldErrors.note && <p className="text-xs text-red-300">{fieldErrors.note}</p>}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-800 bg-stone-900/60 p-6">
          <h2 className="font-serif text-xl font-bold text-stone-100">Phương thức thanh toán</h2>

          <div className="mt-5 space-y-3">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const selected = values.paymentMethod === option.value;
              const Icon = option.value === 'cod' ? Banknote : CreditCard;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    selected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-stone-800 bg-stone-950/60 hover:border-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={selected}
                    onChange={() => update('paymentMethod', option.value)}
                    disabled={submitting}
                    className="mt-1 h-4 w-4 accent-amber-500"
                  />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-stone-100">
                      <Icon className="h-4 w-4 text-amber-400" />
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-stone-400">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.paymentMethod && (
            <p className="mt-3 text-xs text-red-300">{fieldErrors.paymentMethod}</p>
          )}
        </section>
      </div>

      <aside className="lg:col-span-4">
        <div className="sticky top-24 space-y-4 rounded-3xl border border-stone-800 bg-stone-900/80 p-6">
          <h2 className="font-serif text-xl font-bold text-stone-100">Đơn hàng của bạn</h2>

          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 text-xs text-stone-300">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 truncate">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-mono text-amber-300">{formatVND(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-stone-800 pt-4">
            <label htmlFor="couponCode" className={labelClassName}>
              Mã giảm giá
            </label>
            <input
              id="couponCode"
              name="couponCode"
              value={values.couponCode}
              onChange={(event) => update('couponCode', event.target.value.toUpperCase().slice(0, 50))}
              maxLength={50}
              disabled={submitting}
              className={inputClassName}
              placeholder="TET2027"
            />
            <p className="text-[11px] text-stone-500">
              Tổng tiền sẽ được tính lại theo mã hợp lệ khi bạn bấm Đặt hàng.
            </p>
          </div>

          <dl className="space-y-2 border-t border-stone-800 pt-4 text-sm">
            <div className="flex items-center justify-between text-stone-300">
              <dt>Tạm tính</dt>
              <dd className="font-mono">{formatVND(cart.subtotal)}</dd>
            </div>
            {cart.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-300">
                <dt>Giảm giá {cart.coupon?.code ? `(${cart.coupon.code})` : ''}</dt>
                <dd className="font-mono">-{formatVND(cart.discountAmount)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between text-stone-300">
              <dt>Phí vận chuyển</dt>
              <dd className="font-mono">{shippingFree ? 'Miễn phí' : formatVND(cart.shippingFee)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-stone-800 pt-3 text-base font-bold text-amber-300">
              <dt>Tổng thanh toán</dt>
              <dd className="font-mono">{formatVND(cart.total)}</dd>
            </div>
          </dl>

          {formError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/50 px-3 py-2 text-xs text-red-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý…
              </>
            ) : (
              'Đặt hàng'
            )}
          </button>

          <p className="text-center text-[11px] text-stone-500">
            Bằng việc đặt hàng, bạn đồng ý với chính sách đổi trả và bảo mật của Hương Quê.
          </p>
        </div>
      </aside>
    </form>
  );
}
