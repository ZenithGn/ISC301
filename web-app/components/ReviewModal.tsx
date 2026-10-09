'use client';

/**
 * C14 — Modal đánh giá sản phẩm (1–5 sao + nhận xét ≤ 500 ký tự).
 *
 * Gửi qua Server Action `submitReviewAction` -> RPC `submit_review(p_product_id, p_rating, p_comment)`.
 * Nếu server báo đã đánh giá thì khóa form và hiển thị "Bạn đã đánh giá sản phẩm này".
 */

import { useActionState, useState } from 'react';
import { Star, X, CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitReviewAction, type ReviewActionState } from '@/lib/actions/reviews';

const MAX_COMMENT_LENGTH = 500;

interface ReviewModalProps {
  productId: number;
  productName: string;
  /** Dùng để revalidate cache trang chi tiết đơn (không phải dữ liệu nghiệp vụ). */
  orderCode?: string;
  /** Biết trước từ dữ liệu đơn hàng (nếu RPC trả về danh sách đánh giá). */
  alreadyReviewed?: boolean;
}

export function ReviewModal({
  productId,
  productName,
  orderCode,
  alreadyReviewed = false,
}: ReviewModalProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');

  const [state, formAction, isPending] = useActionState<ReviewActionState | null, FormData>(
    submitReviewAction,
    null
  );

  const succeeded = state?.status === 'success';
  const locked = alreadyReviewed || succeeded || state?.alreadyReviewed === true;
  const activeStars = hovered || rating;

  function closeModal() {
    setOpen(false);
    setHovered(0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={alreadyReviewed}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-stone-950 disabled:cursor-not-allowed disabled:border-stone-700 disabled:bg-stone-800 disabled:text-stone-500"
      >
        {alreadyReviewed ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đã đánh giá
          </>
        ) : (
          <>
            <Star className="h-3.5 w-3.5" />
            Đánh giá
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Đánh giá ${productName}`}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-stone-800 bg-stone-900 p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-100">Đánh giá sản phẩm</h2>
                <p className="mt-0.5 line-clamp-2 text-xs text-stone-400">{productName}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {locked ? (
              <div className="space-y-4 pt-5">
                <p className="flex items-center gap-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-3 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {state?.alreadyReviewed || alreadyReviewed
                    ? 'Bạn đã đánh giá sản phẩm này.'
                    : state?.message ?? 'Cảm ơn bạn đã đánh giá sản phẩm!'}
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-700"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-5 pt-5">
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="rating" value={rating} />
                {orderCode ? <input type="hidden" name="orderCode" value={orderCode} /> : null}

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Chất lượng sản phẩm
                  </span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        aria-label={`${star} sao`}
                        aria-pressed={rating === star}
                        className="rounded-lg p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= activeStars
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-1 text-xs text-stone-400">
                      {rating > 0 ? `${rating}/5 sao` : 'Chọn số sao'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={`review-comment-${productId}`}
                    className="block text-xs font-semibold uppercase tracking-wide text-stone-400"
                  >
                    Nhận xét của bạn
                  </label>
                  <textarea
                    id={`review-comment-${productId}`}
                    name="comment"
                    rows={4}
                    maxLength={MAX_COMMENT_LENGTH}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Chia sẻ cảm nhận về hương vị, đóng gói, dịch vụ giao hàng…"
                    className="w-full resize-none rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
                  />
                  <p className="text-right text-[11px] text-stone-500">
                    {comment.length}/{MAX_COMMENT_LENGTH} ký tự
                  </p>
                </div>

                {state?.status === 'error' && state.message && (
                  <p className="rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-2.5 text-xs text-red-300">
                    {state.message}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || rating === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-stone-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Gửi đánh giá
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
