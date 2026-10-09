'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, ShoppingCart } from 'lucide-react';

import { addToCartAction } from '@/lib/actions/cart';
import { useToast } from '@/components/Toaster';

interface AddToCartButtonProps {
  productId: number;
  stock: number;
  className?: string;
  /** Số lượng thêm vào giỏ, mặc định 1 (ProductPurchasePanel có thể truyền stepper riêng). */
  quantity?: number;
  /** Tên sản phẩm – chỉ dùng cho nội dung toast, không bắt buộc. */
  productName?: string;
}

/**
 * Nút "Thêm vào giỏ" dùng chung cho ProductCard / C04.
 * Vô hiệu hoá khi hết hàng, hiện trạng thái đang xử lý, báo lỗi tại chỗ và phát toast
 * qua ToastProvider (app/(shop)/layout.tsx).
 */
export function AddToCartButton({
  productId,
  stock,
  className,
  quantity = 1,
  productName,
}: AddToCartButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { toast } = useToast();

  const outOfStock = stock <= 0;
  const disabled = outOfStock || pending;

  function handleAddToCart() {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction(productId, quantity);
      if (result.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);

        const details: string[] = [];
        if (productName) details.push(productName);
        const itemCount = result.cart?.itemCount;
        if (typeof itemCount === 'number' && itemCount > 0) {
          details.push(`Giỏ hàng hiện có ${itemCount} sản phẩm.`);
        }
        toast({
          tone: 'success',
          title: 'Đã thêm vào giỏ',
          description: details.length > 0 ? details.join(' • ') : undefined,
        });
      } else {
        const message = result.error ?? 'Không thêm được sản phẩm vào giỏ hàng.';
        setError(message);
        toast({
          tone: 'error',
          title: 'Không thêm được vào giỏ',
          description: productName ? `${productName} • ${message}` : message,
        });
      }
    });
  }

  const baseClassName =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60';

  const stateClassName = outOfStock
    ? 'bg-stone-800 text-stone-400 border border-stone-700'
    : 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/20 hover:bg-amber-400';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={disabled}
        aria-busy={pending}
        className={className ?? `${baseClassName} ${stateClassName}`}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang thêm…
          </>
        ) : outOfStock ? (
          <>
            <ShoppingCart className="h-4 w-4" />
            Tạm hết hàng
          </>
        ) : added ? (
          <>
            <Check className="h-4 w-4" />
            Đã thêm vào giỏ
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            Thêm vào giỏ
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
