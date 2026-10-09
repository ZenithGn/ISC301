'use server';

/**
 * C14 — Server Action gửi đánh giá sản phẩm.
 *
 * RPC: `submit_review(p_product_id, p_rating, p_comment)` — CHÍNH XÁC 3 tham số này,
 * KHÔNG có p_order_id (đã kiểm chứng qua hint của PostgREST). RPC cần đăng nhập.
 *
 * Nếu DB báo đã đánh giá rồi, action trả `alreadyReviewed: true` để UI hiển thị
 * "Bạn đã đánh giá sản phẩm này" và khóa nút gửi.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export interface ReviewActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  alreadyReviewed?: boolean;
}

const MAX_COMMENT_LENGTH = 500;

/** Chỉ dùng để revalidate cache — không phải dữ liệu tin cậy cho nghiệp vụ. */
function safeOrderCode(value: string): string | null {
  const code = value.trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : null;
}

export async function submitReviewAction(
  prevState: ReviewActionState | null,
  formData: FormData
): Promise<ReviewActionState> {
  await requireUser();

  const productIdRaw = formData.get('productId');
  const productId = Number(productIdRaw);
  if (!Number.isInteger(productId) || productId <= 0) {
    return { status: 'error', message: 'Sản phẩm không hợp lệ.' };
  }

  const rating = Number(formData.get('rating'));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: 'error', message: 'Vui lòng chọn từ 1 đến 5 sao.' };
  }

  const comment = String(formData.get('comment') ?? '').trim();
  if (comment.length > MAX_COMMENT_LENGTH) {
    return {
      status: 'error',
      message: `Nhận xét tối đa ${MAX_COMMENT_LENGTH} ký tự.`,
    };
  }

  const orderCode = safeOrderCode(String(formData.get('orderCode') ?? ''));

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('submit_review', {
      p_product_id: productId,
      p_rating: rating,
      p_comment: comment,
    });

    if (error) {
      const message = (error.message ?? '').toLowerCase();

      if (message.includes('đã đánh giá') || message.includes('already')) {
        return {
          status: 'error',
          alreadyReviewed: true,
          message: 'Bạn đã đánh giá sản phẩm này.',
        };
      }

      if (message.includes('permission denied') || message.includes('not authenticated')) {
        return {
          status: 'error',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        };
      }

      console.error('[reviews] submit_review lỗi:', error.message);

      const serverMessage = (error.message ?? '').trim();
      const isFriendly =
        serverMessage.length > 0 &&
        serverMessage.length <= 200 &&
        /[àáảãạăâđêôơư]/i.test(serverMessage) &&
        !/\b(relation|column|permission|syntax|constraint|violates|function)\b/i.test(
          serverMessage
        );

      return {
        status: 'error',
        message: isFriendly ? serverMessage : 'Không gửi được đánh giá. Vui lòng thử lại sau.',
      };
    }

    if (orderCode) {
      revalidatePath(`/tai-khoan/don-hang/${orderCode}`);
    }
    revalidatePath('/tai-khoan/don-hang');
    revalidatePath('/tra-cuu-don');

    return { status: 'success', message: 'Cảm ơn bạn đã đánh giá sản phẩm!' };
  } catch (error) {
    console.error('[reviews] submitReviewAction lỗi:', error);
    return { status: 'error', message: 'Không gửi được đánh giá. Vui lòng thử lại sau.' };
  }
}
