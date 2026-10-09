'use client';

import { useActionState, useState } from 'react';
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
} from '@/lib/actions/admin/categories';
import { IDLE_RESULT } from '@/lib/actions/admin/result';
import { ActionForm } from './ActionForm';
import { Alert, Field, adminCardClass, adminInputClass } from './FormBits';
import { SubmitButton } from './SubmitButton';
import { formatNumber } from '@/lib/format';
import type { Category } from '@/lib/types';

/** A04 – Quản lý danh mục: thêm/sửa, sắp xếp, xóa (chặn nếu còn sản phẩm). */
export function CategoryManager({
  categories,
  totalCount = categories.length,
  pagination,
}: {
  /** Các danh mục của TRANG hiện tại (phân trang phía server). */
  categories: Category[];
  /** Tổng số danh mục trên toàn hệ thống (không chỉ trang hiện tại). */
  totalCount?: number;
  /** Thanh phân trang do Server Component truyền vào. */
  pagination?: React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [state, formAction] = useActionState(saveCategoryAction, IDLE_RESULT);
  const fieldErrors = state.fieldErrors ?? {};

  const editing = editingId === null || editingId === 'new'
    ? null
    : categories.find((category) => category.category_id === editingId) ?? null;

  // Khi phân trang/đổi bộ lọc, dòng đang sửa có thể không còn trong trang hiện
  // tại ⇒ đóng form thay vì gửi `category_id = 'new'` (tạo trùng danh mục).
  const openNew = editingId === 'new';
  const formOpen = openNew || editing !== null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
      <section className={`${adminCardClass} xl:col-span-2 overflow-x-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-100">
            Danh sách danh mục ({formatNumber(totalCount)})
          </h3>
          <button
            type="button"
            onClick={() => setEditingId('new')}
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 transition-colors"
          >
            + Thêm danh mục
          </button>
        </div>

        <table className="w-full text-left text-xs text-stone-300">
          <thead className="uppercase font-mono tracking-wider text-stone-400 border-b border-stone-800">
            <tr>
              <th className="py-2.5 pr-3">#</th>
              <th className="py-2.5 pr-3">Tên / slug</th>
              <th className="py-2.5 pr-3 text-right">Thứ tự</th>
              <th className="py-2.5 pr-3">Trạng thái</th>
              <th className="py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800">
            {categories.map((category) => (
              <tr key={category.category_id} className="hover:bg-stone-800/40">
                <td className="py-2.5 pr-3 font-mono text-stone-500">{category.category_id}</td>
                <td className="py-2.5 pr-3">
                  <p className="font-semibold text-stone-200">{category.name}</p>
                  <p className="text-[11px] text-stone-500 font-mono">/{category.slug}</p>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono">{category.sort_order}</td>
                <td className="py-2.5 pr-3">
                  {category.is_active ? (
                    <span className="rounded-full border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[11px] text-emerald-400">
                      Hiện
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] text-stone-400">
                      Ẩn
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(category.category_id)}
                      className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800"
                    >
                      Sửa
                    </button>
                    <ActionForm action={moveCategoryAction} hidden={{ category_id: category.category_id, direction: 'up' }}>
                      ↑
                    </ActionForm>
                    <ActionForm action={moveCategoryAction} hidden={{ category_id: category.category_id, direction: 'down' }}>
                      ↓
                    </ActionForm>
                    <ActionForm
                      action={deleteCategoryAction}
                      hidden={{ category_id: category.category_id }}
                      tone="danger"
                      confirmText={`Xóa danh mục "${category.name}"? Thao tác này bị chặn nếu danh mục còn sản phẩm.`}
                    >
                      Xóa
                    </ActionForm>
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
            {openNew ? 'Thêm danh mục' : editing ? `Sửa: ${editing.name}` : 'Chọn một danh mục'}
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
          <p className="text-xs text-stone-500">
            Bấm “Sửa” hoặc “Thêm danh mục” để hiện form.
          </p>
        ) : (
          <form key={editing?.category_id ?? 'new'} action={formAction} className="space-y-4">
            {state.message ? (
              <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
            ) : null}

            <input
              type="hidden"
              name="category_id"
              value={editing ? String(editing.category_id) : 'new'}
            />

            <Field label="Tên danh mục" htmlFor="category-name" required error={fieldErrors.name}>
              <input
                id="category-name"
                name="name"
                required
                defaultValue={editing?.name ?? ''}
                maxLength={100}
                className={adminInputClass}
              />
            </Field>

            <Field label="Slug" htmlFor="category-slug" error={fieldErrors.slug} hint="Bỏ trống để tự sinh từ tên.">
              <input
                id="category-slug"
                name="slug"
                defaultValue={editing?.slug ?? ''}
                maxLength={120}
                className={adminInputClass}
              />
            </Field>

            <Field label="Mô tả" htmlFor="category-description" error={fieldErrors.description}>
              <textarea
                id="category-description"
                name="description"
                rows={3}
                maxLength={300}
                defaultValue={editing?.description ?? ''}
                className={adminInputClass}
              />
            </Field>

            <Field label="URL ảnh" htmlFor="category-image" error={fieldErrors.image_url}>
              <input
                id="category-image"
                name="image_url"
                defaultValue={editing?.image_url ?? ''}
                maxLength={500}
                className={adminInputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label="Thứ tự" htmlFor="category-sort" error={fieldErrors.sort_order}>
                <input
                  id="category-sort"
                  name="sort_order"
                  type="number"
                  step={1}
                  defaultValue={editing?.sort_order ?? 0}
                  className={adminInputClass}
                />
              </Field>

              <label className="flex items-center gap-2 text-xs text-stone-300 pb-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing?.is_active ?? true}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-950 accent-amber-500"
                />
                Đang hiện
              </label>
            </div>

            <SubmitButton pendingLabel="Đang lưu…">Lưu danh mục</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
