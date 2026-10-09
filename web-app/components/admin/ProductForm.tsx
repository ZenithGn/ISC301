'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { saveProductAction } from '@/lib/actions/admin/products';
import { IDLE_RESULT, REGION_VALUES } from '@/lib/actions/admin/result';
import { Alert, Field, adminInputClass, adminCardClass } from './FormBits';
import { SubmitButton } from './SubmitButton';
import type { Category, Product } from '@/lib/types';

const REGION_LABELS: Record<string, string> = {
  bac: 'Miền Bắc',
  trung: 'Miền Trung',
  nam: 'Miền Nam',
  ba_mien: 'Ba miền',
};

/**
 * A03 – Form thêm/sửa sản phẩm.
 * `product_id` rỗng hoặc "new" ⇒ tạo mới. Ảnh: jpg/png/webp ≤ 5MB.
 */
export function ProductForm({
  product,
  categories,
}: {
  product: Product | null;
  categories: Category[];
}) {
  const [state, formAction] = useActionState(saveProductAction, IDLE_RESULT);
  const fieldErrors = state.fieldErrors ?? {};

  /**
   * Preview ảnh: chọn file mới thì hiện NGAY ảnh vừa chọn và ĐÈ lên ảnh cũ.
   * `objectUrl` là URL tạm trong trình duyệt (chưa upload) — phải revoke khi đổi ảnh/unmount.
   */
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (!file) {
      setObjectUrl(null);
      setNewFileName(null);
      return;
    }
    setObjectUrl(URL.createObjectURL(file));
    setNewFileName(file.name);
  }

  function clearNewImage() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setNewFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  /** Ảnh đang hiển thị: ảnh mới chọn (nếu có) đè lên ảnh hiện tại của sản phẩm. */
  const previewSrc = objectUrl ?? product?.thumbnail_url ?? null;
  const previewIsNew = Boolean(objectUrl);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6 max-w-4xl">
      {state.message ? (
        <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert>
      ) : null}

      <input type="hidden" name="product_id" value={product ? String(product.product_id) : 'new'} />

      <section className={`${adminCardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-stone-100">Thông tin cơ bản</h3>

        <Field label="Tên sản phẩm" htmlFor="name" required error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name ?? ''}
            maxLength={200}
            className={adminInputClass}
          />
        </Field>

        <Field
          label="Slug (bỏ trống để tự sinh từ tên)"
          htmlFor="slug"
          error={fieldErrors.slug}
          hint="Chỉ dùng chữ thường, số và dấu gạch ngang. Hệ thống tự thêm hậu tố nếu trùng."
        >
          <input
            id="slug"
            name="slug"
            defaultValue={product?.slug ?? ''}
            maxLength={220}
            className={adminInputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Danh mục" htmlFor="category_id" required error={fieldErrors.category_id}>
            <select
              id="category_id"
              name="category_id"
              defaultValue={product ? String(product.category_id) : ''}
              className={adminInputClass}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((category) => (
                <option key={category.category_id} value={String(category.category_id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Miền" htmlFor="region" required error={fieldErrors.region}>
            <select
              id="region"
              name="region"
              defaultValue={product?.region ?? 'bac'}
              className={adminInputClass}
            >
              {REGION_VALUES.map((region) => (
                <option key={region} value={region}>
                  {REGION_LABELS[region]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Đơn vị" htmlFor="unit" required error={fieldErrors.unit}>
            <input
              id="unit"
              name="unit"
              required
              defaultValue={product?.unit ?? 'hộp'}
              maxLength={50}
              className={adminInputClass}
            />
          </Field>
        </div>
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-stone-100">Giá và tồn kho</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Giá bán (VND)" htmlFor="price" required error={fieldErrors.price}>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              step={1000}
              required
              defaultValue={product?.price ?? ''}
              className={adminInputClass}
            />
          </Field>

          <Field
            label="Giá gốc (VND)"
            htmlFor="compare_at_price"
            error={fieldErrors.compare_at_price}
            hint="Phải lớn hơn giá bán; bỏ trống nếu không giảm giá."
          >
            <input
              id="compare_at_price"
              name="compare_at_price"
              type="number"
              min={0}
              step={1000}
              defaultValue={product?.compare_at_price ?? ''}
              className={adminInputClass}
            />
          </Field>

          <Field label="Tồn kho" htmlFor="stock" required error={fieldErrors.stock}>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={product?.stock ?? 0}
              className={adminInputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-xs text-stone-300">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured ?? false}
              className="w-4 h-4 rounded border-stone-600 bg-stone-950 accent-amber-500"
            />
            Sản phẩm nổi bật (hiện ở trang chủ)
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-300">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="w-4 h-4 rounded border-stone-600 bg-stone-950 accent-amber-500"
            />
            Đang bán
          </label>
        </div>
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-stone-100">Nguồn gốc & mô tả</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Xuất xứ" htmlFor="origin" error={fieldErrors.origin}>
            <input
              id="origin"
              name="origin"
              defaultValue={product?.origin ?? ''}
              maxLength={100}
              className={adminInputClass}
            />
          </Field>
          <Field label="Nhà sản xuất" htmlFor="producer" error={fieldErrors.producer}>
            <input
              id="producer"
              name="producer"
              defaultValue={product?.producer ?? ''}
              maxLength={200}
              className={adminInputClass}
            />
          </Field>
        </div>

        <Field label="Mô tả ngắn" htmlFor="short_description" error={fieldErrors.short_description}>
          <textarea
            id="short_description"
            name="short_description"
            rows={2}
            maxLength={300}
            defaultValue={product?.short_description ?? ''}
            className={adminInputClass}
          />
        </Field>

        <Field label="Mô tả chi tiết" htmlFor="description" error={fieldErrors.description}>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={product?.description ?? ''}
            className={adminInputClass}
          />
        </Field>
      </section>

      <section className={`${adminCardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-stone-100">Ảnh sản phẩm</h3>

        <Field label="URL ảnh hiện tại" htmlFor="thumbnail_url" error={fieldErrors.thumbnail_url}>
          <input
            id="thumbnail_url"
            name="thumbnail_url"
            defaultValue={product?.thumbnail_url ?? ''}
            maxLength={500}
            className={adminInputClass}
          />
        </Field>

        {previewSrc ? (
          <div className="space-y-2">
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc}
                alt={previewIsNew ? 'Ảnh mới sẽ upload' : product?.name ?? 'Ảnh sản phẩm'}
                className={`w-40 h-40 rounded-xl object-cover border ${
                  previewIsNew ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-stone-700'
                }`}
              />
              {previewIsNew ? (
                <span className="absolute -top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                  Ảnh mới
                </span>
              ) : null}
            </div>

            <p className="text-[11px] text-stone-400">
              {previewIsNew
                ? 'Sẽ thay thế ảnh hiện tại khi bấm "Lưu sản phẩm"'
                : 'Ảnh hiện tại của sản phẩm'}
              {previewIsNew && newFileName ? (
                <span className="text-stone-500"> — {newFileName}</span>
              ) : null}
            </p>

            {previewIsNew ? (
              <button
                type="button"
                onClick={clearNewImage}
                className="rounded-lg border border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-300 hover:bg-stone-800"
              >
                Bỏ ảnh mới, giữ ảnh cũ
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-[11px] text-stone-500">Sản phẩm chưa có ảnh.</p>
        )}

        <Field
          label="Tải ảnh mới"
          htmlFor="image"
          error={fieldErrors.image}
          hint="Chỉ nhận jpg, png, webp — tối đa 5MB. Ảnh chọn ở đây hiện ngay bên trên và thay thế ảnh hiện tại khi lưu."
        >
          <input
            id="image"
            ref={fileInputRef}
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className={`${adminInputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-1.5 file:text-stone-200`}
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Đang lưu…">Lưu sản phẩm</SubmitButton>
        <Link
          href="/admin/san-pham"
          className="px-5 py-2.5 rounded-xl border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-stone-800 transition-colors"
        >
          Quay lại danh sách
        </Link>
      </div>
    </form>
  );
}
