'use client';

import { useActionState, useState } from 'react';
import {
  deleteBannerAction,
  saveBannerAction,
  toggleBannerActiveAction,
} from '@/lib/actions/admin/banners';
import { IDLE_RESULT } from '@/lib/actions/admin/result';
import { Alert, Field, adminCardClass, adminInputClass } from './FormBits';
import { SubmitButton } from './SubmitButton';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { AdminBannerRow } from '@/lib/actions/admin/data';

/** Chuyển ISO -> giá trị cho input datetime-local theo giờ Việt Nam. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 16);
}

/** F11 – Quản lý banner hiển thị ở trang chủ. */
export function BannerManager({
  banners,
  totalCount = banners.length,
  pagination,
}: {
  /** Các banner của TRANG hiện tại (phân trang phía server). */
  banners: AdminBannerRow[];
  /** Tổng số banner trên toàn hệ thống (không chỉ trang hiện tại). */
  totalCount?: number;
  /** Thanh phân trang do Server Component truyền vào. */
  pagination?: React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [state, formAction] = useActionState(saveBannerAction, IDLE_RESULT);
  const [deleteState, deleteAction] = useActionState(deleteBannerAction, IDLE_RESULT);
  const fieldErrors = state.fieldErrors ?? {};

  const editing =
    editingId === null || editingId === 'new'
      ? null
      : banners.find((banner) => banner.banner_id === editingId) ?? null;

  // Khi phân trang, banner đang sửa có thể không còn trong trang hiện tại ⇒ đóng
  // form thay vì gửi `banner_id = 'new'` (tạo trùng banner).
  const openNew = editingId === 'new';
  const formOpen = openNew || editing !== null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
      <section className={`${adminCardClass} xl:col-span-2 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-100">Banner ({formatNumber(totalCount)})</h3>
          <button
            type="button"
            onClick={() => setEditingId('new')}
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            + Thêm banner
          </button>
        </div>

        {deleteState.message ? (
          <Alert tone={deleteState.ok ? 'success' : 'error'}>{deleteState.message}</Alert>
        ) : null}

        <ul className="space-y-3">
          {banners.length === 0 && (
            <li className="py-8 text-center text-xs text-stone-500">Chưa có banner nào.</li>
          )}
          {banners.map((banner) => (
            <li
              key={banner.banner_id}
              className="flex flex-col sm:flex-row gap-3 rounded-xl border border-stone-800 bg-stone-950/50 p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300'}
                alt={banner.title}
                className="h-20 w-full sm:w-32 rounded-lg object-cover border border-stone-800"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-stone-100 truncate">{banner.title}</p>
                {banner.subtitle ? (
                  <p className="text-[11px] text-stone-400 truncate">{banner.subtitle}</p>
                ) : null}
                <p className="text-[11px] text-stone-500 font-mono truncate">
                  {banner.link_url || 'không có liên kết'} · thứ tự {banner.sort_order}
                </p>
                <p className="text-[11px] text-stone-500">
                  {formatDateTime(banner.starts_at)} → {formatDateTime(banner.ends_at)} ·{' '}
                  {banner.is_active ? (
                    <span className="text-emerald-400">Đang hiện</span>
                  ) : (
                    <span>Đã ẩn</span>
                  )}
                </p>
              </div>
              <div className="flex sm:flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingId(banner.banner_id)}
                  className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800"
                >
                  Sửa
                </button>
                <form action={toggleBannerActiveAction}>
                  <input type="hidden" name="banner_id" value={String(banner.banner_id)} />
                  <input
                    type="hidden"
                    name="next_active"
                    value={banner.is_active ? 'false' : 'true'}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800"
                  >
                    {banner.is_active ? 'Ẩn' : 'Hiện'}
                  </button>
                </form>
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm(`Xóa banner "${banner.title}"?`)) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="banner_id" value={String(banner.banner_id)} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-800 bg-red-950/70 px-3 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-red-900"
                  >
                    Xóa
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        {pagination}
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-100">
            {openNew ? 'Thêm banner' : editing ? `Sửa: ${editing.title}` : 'Chọn một banner'}
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
          <p className="text-xs text-stone-500">Bấm “Sửa” hoặc “Thêm banner” để hiện form.</p>
        ) : (
          <form key={editing?.banner_id ?? 'new'} action={formAction} encType="multipart/form-data" className="space-y-4">
            {state.message ? (
              <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
            ) : null}

            <input type="hidden" name="banner_id" value={editing ? String(editing.banner_id) : 'new'} />

            <Field label="Tiêu đề" htmlFor="banner-title" required error={fieldErrors.title}>
              <input
                id="banner-title"
                name="title"
                required
                defaultValue={editing?.title ?? ''}
                maxLength={200}
                className={adminInputClass}
              />
            </Field>

            <Field label="Tiêu đề phụ" htmlFor="banner-subtitle" error={fieldErrors.subtitle}>
              <input
                id="banner-subtitle"
                name="subtitle"
                defaultValue={editing?.subtitle ?? ''}
                maxLength={300}
                className={adminInputClass}
              />
            </Field>

            <Field label="Liên kết" htmlFor="banner-link" error={fieldErrors.link_url}>
              <input
                id="banner-link"
                name="link_url"
                defaultValue={editing?.link_url ?? ''}
                placeholder="/san-pham?danh_muc=hop-qua-tet"
                maxLength={500}
                className={adminInputClass}
              />
            </Field>

            <Field label="URL ảnh" htmlFor="banner-image-url" error={fieldErrors.image_url}>
              <input
                id="banner-image-url"
                name="image_url"
                defaultValue={editing?.image_url ?? ''}
                maxLength={500}
                className={adminInputClass}
              />
            </Field>

            <Field
              label="Hoặc tải ảnh mới"
              htmlFor="banner-image"
              error={fieldErrors.image}
              hint="jpg/png/webp ≤ 5MB"
            >
              <input
                id="banner-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={`${adminInputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-stone-200`}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Thứ tự" htmlFor="banner-sort" error={fieldErrors.sort_order}>
                <input
                  id="banner-sort"
                  name="sort_order"
                  type="number"
                  step={1}
                  defaultValue={editing?.sort_order ?? 0}
                  className={adminInputClass}
                />
              </Field>
              <label className="flex items-center gap-2 text-xs text-stone-300 pb-2 self-end">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing?.is_active ?? true}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-950 accent-amber-500"
                />
                Đang hiện
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Bắt đầu" htmlFor="banner-start" error={fieldErrors.starts_at}>
                <input
                  id="banner-start"
                  name="starts_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(editing?.starts_at ?? null)}
                  className={adminInputClass}
                />
              </Field>
              <Field label="Kết thúc" htmlFor="banner-end" error={fieldErrors.ends_at}>
                <input
                  id="banner-end"
                  name="ends_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(editing?.ends_at ?? null)}
                  className={adminInputClass}
                />
              </Field>
            </div>

            <SubmitButton pendingLabel="Đang lưu…">Lưu banner</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
