'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { AddToCartButton } from '@/components/AddToCartButton';
import { formatVND } from '@/lib/format';

interface ProductPurchasePanelProps {
  productId: number;
  stock: number;
  price: number;
  unit: string;
}

/**
 * C04 – Chọn số lượng rồi thêm vào giỏ hàng.
 * Stepper nằm ở đây (KHÔNG nằm trong AddToCartButton) để tránh 2 stepper trùng nhau;
 * số lượng được truyền xuống qua prop tùy chọn `quantity`.
 */
export function ProductPurchasePanel({ productId, stock, price, unit }: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);

  const outOfStock = stock <= 0;
  const maxQuantity = Math.max(1, stock);

  function decrease() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increase() {
    setQuantity((current) => Math.min(maxQuantity, current + 1));
  }

  return (
    <div className="space-y-3 pt-2">
      <label className="text-xs font-bold uppercase tracking-wider text-stone-300 block">
        Chọn số lượng:
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center border border-stone-700 rounded-xl bg-stone-900 overflow-hidden">
          <button
            type="button"
            onClick={decrease}
            disabled={outOfStock || quantity <= 1}
            className="px-4 py-2.5 hover:bg-stone-800 text-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Giảm số lượng"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span
            className="px-4 py-2.5 text-sm font-bold text-stone-100 min-w-[48px] text-center"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={increase}
            disabled={outOfStock || quantity >= maxQuantity}
            className="px-4 py-2.5 hover:bg-stone-800 text-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Tăng số lượng"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-stone-400">
          Thành tiền:{' '}
          <span className="text-base font-bold font-mono text-amber-400">
            {formatVND(price * quantity)}
          </span>
        </div>
      </div>

      <AddToCartButton
        productId={productId}
        stock={stock}
        quantity={quantity}
        className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-xs tracking-wider uppercase transition-all bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 disabled:bg-stone-800 disabled:text-stone-500 disabled:shadow-none disabled:cursor-not-allowed"
      />

      {outOfStock ? (
        <p className="text-[11px] text-rose-400">
          Sản phẩm tạm hết hàng, bạn có thể để lại đánh giá hoặc xem các hộp quà tương tự bên dưới.
        </p>
      ) : stock <= 5 ? (
        <p className="text-[11px] text-amber-400">
          Chỉ còn {stock} {unit} trong kho – đặt sớm để kịp giao trước Tết.
        </p>
      ) : null}
    </div>
  );
}
