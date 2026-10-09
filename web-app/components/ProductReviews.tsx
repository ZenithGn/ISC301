import { Star, MessageSquareQuote } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { ProductReview } from '@/lib/products';

interface ProductReviewsProps {
  reviews: ProductReview[];
  ratingAvg: number;
  ratingCount: number;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}/5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-600'
          }`}
        />
      ))}
    </div>
  );
}

/** C04 – Danh sách đánh giá sản phẩm (RPC `product_reviews`). */
export function ProductReviews({ reviews, ratingAvg, ratingCount }: ProductReviewsProps) {
  const safeAvg = Number.isFinite(ratingAvg) ? ratingAvg : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Khách hàng nói gì
          </span>
          <h2 className="text-xl font-serif font-bold text-stone-100 mt-1">
            Đánh Giá Từ Người Mua
          </h2>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900/70 border border-stone-800">
          <span className="text-2xl font-bold font-mono text-amber-400">{safeAvg.toFixed(1)}</span>
          <div className="space-y-0.5">
            <StarRow rating={Math.round(safeAvg)} />
            <span className="text-[11px] text-stone-400 block">{ratingCount} đánh giá đã xác thực</span>
          </div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <p className="text-sm text-stone-300 font-medium">Chưa có đánh giá nào cho sản phẩm này.</p>
          <p className="text-xs text-stone-500">
            Hãy là người đầu tiên chia sẻ cảm nhận sau khi nhận hộp quà Tết.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.review_id}
              className="p-5 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-300 font-bold text-xs flex items-center justify-center">
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-stone-200">{review.reviewer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StarRow rating={review.rating} />
                  {review.created_at && (
                    <span className="text-[11px] text-stone-500">{formatDate(review.created_at)}</span>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">{review.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
