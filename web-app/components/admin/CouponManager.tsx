'use client';

import { useActionState, useState } from 'react';
import { saveCouponAction, toggleCouponActiveAction } from '@/lib/actions/admin/coupons';
import { IDLE_RESULT } from '@/lib/actions/admin/result';
import { Alert, Field, adminCardClass, adminInputClass } from './FormBits';
import { SubmitButton } from './SubmitButton';
import { formatDateTime, formatNumber, formatVND } from '@/lib/format';
import type { AdminCouponRow } from '@/lib/actions/admin/data';

/** Chuyển ISO -> giá trị cho input datetime-local theo giờ Việt Nam. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 16);
}

/** A06 – Quản lý mã giảm giá: tạo/sửa/tắt. Mã đã có đơn chỉ được tắt. */
export function CouponManager({
  coupons,
  totalCount = coupons.length,
  pagination,
}: {
  /** Các mã của TRANG hiện tại (phân trang phía server). */
  coupons: AdminCouponRow[];
  /** Tổng số mã trên toàn hệ thống (không chỉ trang hiện tại). */
  totalCount?: number;
  /** Thanh phân trang do Server Component truyền vào. */
  pagination?: React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [state, formAction] = useActionState(saveCouponAction, IDLE_RESULT);
  const fieldErrors = state.fieldErrors ?? {};

  const editing =
    editingId === null || editingId === 'new'
      ? null
      : coupons.find((coupon) => coupon.id === editingId) ?? null;
  const lockedForEdit = Boolean(editing && editing.usedCount > 0);

  // Khi phân trang, mã đang sửa có thể không còn trong trang hiện tại ⇒ đóng form
  // thay vì gửi `coupon_id = 'new'` (tạo trùng mã).
  const openNew = editingId === 'new';
  const formOpen = openNew || editing !== null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
      <section className={`${adminCardClass} xl:col-span-2 overflow-x-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-100">
            Mã giảm giá ({formatNumber(totalCount)})
          </h3>
          <button
            type="button"
            onClick={() => setEditingId('new')}
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            + Thêm mã
          </button>
        </div>

        <table className="w-full text-left text-xs text-stone-300">
          <thead className="uppercase font-mono tracking-wider text-stone-400 border-b border-stone-800">
            <tr>
              <th className="py-2.5 pr-3">Mã</th>
              <th className="py-2.5 pr-3">Giảm</th>
              <th className="py-2.5 pr-3 text-right">Đã dùng</th>
              <th className="py-2.5 pr-3">Hiệu lực</th>
              <th className="py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-stone-500">
                  Chưa có mã giảm giá nào.
                </td>
              </tr>
            )}
            {coupons.map((coupon) => (
              <tr key={coupon.id ?? coupon.code} className="hover:bg-stone-800/40">
                <td className="py-2.5 pr-3">
                  <p className="font-mono font-bold text-amber-300">{coupon.code}</p>
                  <p className="text-[11px] text-stone-500">
                    Đơn tối thiểu {formatVND(coupon.minOrderValue)}
                  </p>
                </td>
                <td className="py-2.5 pr-3">
                  {coupon.discountType === 'percent'
                    ? `${coupon.discountValue}%`
                    : formatVND(coupon.discountValue)}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono">
                  {formatNumber(coupon.usedCount)}
                  {coupon.usageLimit === null ? ' / ∞' : ` / ${formatNumber(coupon.usageLimit)}`}
                </td>
                <td className="py-2.5 pr-3 text-[11px] text-stone-400">
                  {formatDateTime(coupon.startsAt)} → {formatDateTime(coupon.expiresAt)}
                  <br />
                  {coupon.isActive ? (
                    <span className="text-emerald-400">Đang bật</span>
                  ) : (
                    <span className="text-stone-500">Đã tắt</span>
                  )}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(coupon.id)}
                      disabled={coupon.id === null || coupon.usedCount > 0}
                      title={
                        coupon.usedCount > 0
                          ? 'Mã đã có đơn nên chỉ được tắt, không sửa'
                          : 'Sửa mã'
                      }
                      className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sửa
                    </button>
                    <form action={toggleCouponActiveAction}>
                      <input type="hidden" name="coupon_id" value={String(coupon.id ?? '')} />
                      <input
                        type="hidden"
                        name="next_active"
                        value={coupon.isActive ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800"
                      >
                        {coupon.isActive ? 'Tắt' : 'Bật'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination}
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-100">
            {openNew ? 'Thêm mã giảm giá' : editing ? `Sửa: ${editing.code}` : 'Chọn một mã'}
          </h3>
          {formOpen ? (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="text-[11px] text-stone-400 hover:text-amber-400"
            >
              Đóng
            </button>
          ) : null}
        </div>

        {!formOpen ? (
          <p className="text-xs text-stone-500">Bấm “Sửa” hoặc “Thêm mã” để hiện form.</p>
        ) : lockedForEdit ? (
          <Alert tone="warning">
            Mã <strong>{editing?.code}</strong> đã có {formatNumber(editing?.usedCount ?? 0)} lượt dùng
            nên không được sửa để bảo toàn dữ liệu đối soát. Hãy dùng nút “Tắt” nếu muốn ngừng áp dụng.
          </Alert>
        ) : (
          <form key={editing?.id ?? 'new'} action={formAction} className="space-y-4">
            {state.message ? (
              <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
            ) : null}

            <input type="hidden" name="coupon_id" value={editing ? String(editing.id) : 'new'} />
            <input type="hidden" name="used_count" value={String(editing?.usedCount ?? 0)} />

            <Field
              label="Mã (chữ HOA và số)"
              htmlFor="coupon-code"
              required
              error={fieldErrors.code}
            >
              <input
                id="coupon-code"
                name="code"
                required
                defaultValue={editing?.code ?? ''}
                placeholder="TET2027"
                className={`${adminInputClass} font-mono uppercase`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại giảm" htmlFor="coupon-type" required error={fieldErrors.discount_type}>
                <select
                  id="coupon-type"
                  name="discount_type"
                  defaultValue={editing?.discountType ?? 'percent'}
                  className={adminInputClass}
                >
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Số tiền (VND)</option>
                </select>
              </Field>

              <Field label="Giá trị" htmlFor="coupon-value" required error={fieldErrors.discount_value}>
                <input
                  id="coupon-value"
                  name="discount_value"
                  type="number"
                  min={1}
                  required
                  defaultValue={editing?.discountValue ?? 10}
                  className={adminInputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Đơn tối thiểu (VND)" htmlFor="coupon-min" error={fieldErrors.min_order_amount}>
                <input
                  id="coupon-min"
                  name="min_order_value"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={editing?.minOrderValue ?? 0}
                  className={adminInputClass}
                />
              </Field>

              <Field
                label="Giới hạn lượt (trống = ∞)"
                htmlFor="coupon-limit"
                error={fieldErrors.usage_limit}
              >
                <input
                  id="coupon-limit"
                  name="usage_limit"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={editing?.usageLimit ?? ''}
                  className={adminInputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bắt đầu" htmlFor="coupon-start" error={fieldErrors.starts_at}>
                <input
                  id="coupon-start"
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(editing?.startsAt ?? null)}
                  className={adminInputClass}
                />
              </Field>

              <Field label="Kết thúc" htmlFor="coupon-end" error={fieldErrors.expires_at}>
                <input
                  id="coupon-end"
                  name="expires_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(editing?.expiresAt ?? null)}
                  className={adminInputClass}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-stone-300">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing?.isActive ?? true}
                className="h-4 w-4 rounded border-stone-600 bg-stone-950 accent-amber-500"
              />
              Đang bật
            </label>

            <SubmitButton pendingLabel="Đang lưu…">Lưu mã giảm giá</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
