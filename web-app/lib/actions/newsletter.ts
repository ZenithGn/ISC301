'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendNewsletterWelcomeEmail } from '@/lib/email';

/**
 * F06 – Đăng ký / hủy đăng ký bản tin.
 *
 * RPC đã xác nhận tồn tại trên Supabase thật:
 * - subscribe_newsletter(p_email, p_consent)
 * - unsubscribe_newsletter(p_token)   (p_token là UUID ⇒ phải validate trước khi gọi,
 *   token sai định dạng làm Postgres ném 22P02 "invalid input syntax for type uuid")
 */

export type NewsletterStatus = 'subscribed' | 'already' | 'error';

export interface NewsletterActionState {
  success: boolean;
  status: NewsletterStatus;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** Thông báo dùng chung cho token sai / đã dùng / hết hạn (tránh rò rỉ thông tin). */
const INVALID_UNSUBSCRIBE_MESSAGE = 'Link hủy đăng ký không hợp lệ hoặc đã được sử dụng.';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Địa chỉ email không hợp lệ' });

const unsubscribeTokenSchema = z.uuid({ message: 'Token hủy đăng ký không phải UUID hợp lệ' });

interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
}

/** RPC là nguồn duy nhất quyết định; coi `error` là thất bại, còn lại là thành công. */
function isDuplicateSubscription(error: RpcErrorLike | null | undefined): boolean {
  const message = (error?.message ?? '').toLowerCase();
  return (
    error?.code === '23505' ||
    message.includes('duplicate') ||
    message.includes('already') ||
    message.includes('đã đăng ký') ||
    message.includes('exists')
  );
}

/** Kết quả RPC: `hq_subscribe_newsletter` trả thẳng UUID, bản cũ có thể trả object/array. */
function extractUnsubscribeToken(data: unknown): string | null {
  if (typeof data === 'string' && data.trim() !== '') return data.trim();

  const candidates: unknown[] = Array.isArray(data) ? data : [data];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const row = candidate as Record<string, unknown>;

    for (const key of ['unsubscribe_token', 'token', 'unsubscribe_id', 'id']) {
      const value = row[key];
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
    }
  }

  return null;
}

/**
 * F06 – Server Action đăng ký bản tin.
 * Checkbox đồng ý là BẮT BUỘC (yêu cầu pháp lý); chỉ khi đã tick mới gửi p_consent = true.
 */
export async function subscribeNewsletterAction(
  prevState: NewsletterActionState | null,
  formData: FormData
): Promise<NewsletterActionState> {
  const rawEmail = formData.get('email');
  const consent = formData.get('consent') === 'on';

  const parsedEmail = emailSchema.safeParse(typeof rawEmail === 'string' ? rawEmail : '');

  if (!parsedEmail.success) {
    return {
      success: false,
      status: 'error',
      message: 'Vui lòng nhập địa chỉ email hợp lệ để nhận tin khuyến mãi.',
      fieldErrors: { email: parsedEmail.error.issues.map((issue) => issue.message) },
    };
  }

  if (!consent) {
    return {
      success: false,
      status: 'error',
      message: 'Bạn cần đồng ý nhận email trước khi đăng ký (bắt buộc theo quy định bảo vệ dữ liệu cá nhân).',
      fieldErrors: { consent: ['Vui lòng tick vào ô đồng ý nhận email.'] },
    };
  }

  const email = parsedEmail.data;

  try {
    const supabase = await createClient();

    // `hq_subscribe_newsletter` = gọi `subscribe_newsletter` gốc (trả VOID) rồi
    // trả về `unsubscribe_token` để app gửi kèm link hủy đăng ký trong email
    // (yêu cầu pháp lý). Xem supabase/migrations/05_orders_and_newsletter_rpc.sql.
    const { data, error } = await supabase.rpc('hq_subscribe_newsletter', {
      p_email: email,
      p_consent: true,
    });

    if (error) {
      if (isDuplicateSubscription(error)) {
        return {
          success: true,
          status: 'already',
          message: 'Email này đã đăng ký nhận tin trước đó. Bạn không cần đăng ký lại.',
        };
      }

      console.error('subscribe_newsletter RPC error:', error.code, error.message);
      return {
        success: false,
        status: 'error',
        message: 'Chưa thể đăng ký nhận tin lúc này. Vui lòng thử lại sau ít phút.',
      };
    }

    // Gửi email chào mừng kèm link hủy đăng ký (best-effort, không làm hỏng luồng đăng ký).
    const token = extractUnsubscribeToken(data);
    if (token) {
      try {
        await sendNewsletterWelcomeEmail(email, token);
      } catch (emailError) {
        console.error('sendNewsletterWelcomeEmail failed:', emailError);
      }
    } else {
      console.warn('subscribe_newsletter: không tìm thấy token hủy đăng ký trong kết quả RPC.');
    }

    return {
      success: true,
      status: 'subscribed',
      message: 'Đăng ký thành công! Hương Quê sẽ gửi ưu đãi quà Tết sớm nhất tới email của bạn.',
    };
  } catch (err) {
    console.error('subscribeNewsletterAction exception:', err);
    return {
      success: false,
      status: 'error',
      message: 'Có lỗi xảy ra khi đăng ký nhận tin. Vui lòng thử lại sau.',
    };
  }
}

/**
 * F06 – Hủy đăng ký theo token UUID trong link email.
 * Token sai định dạng / không tồn tại / đã dùng đều trả về thông báo chung.
 */
export async function unsubscribeNewsletterByToken(
  rawToken: string
): Promise<{ success: boolean; message: string }> {
  const parsedToken = unsubscribeTokenSchema.safeParse(rawToken);

  if (!parsedToken.success) {
    return { success: false, message: INVALID_UNSUBSCRIBE_MESSAGE };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc('unsubscribe_newsletter', {
      p_token: parsedToken.data,
    });

    if (error) {
      console.warn('unsubscribe_newsletter RPC error:', error.code, error.message);
      return { success: false, message: INVALID_UNSUBSCRIBE_MESSAGE };
    }

    return {
      success: true,
      message:
        'Bạn đã hủy đăng ký nhận email khuyến mãi từ Hương Quê. Chúng tôi lấy làm tiếc và mong được phục vụ bạn trong những dịp khác.',
    };
  } catch (err) {
    console.error('unsubscribeNewsletterByToken exception:', err);
    return {
      success: false,
      message: 'Chưa thể xử lý yêu cầu hủy đăng ký lúc này. Vui lòng thử lại sau ít phút.',
    };
  }
}

export interface UnsubscribeState {
  success: boolean;
  message: string;
}

/**
 * F06 – Xác nhận hủy đăng ký bằng nút bấm (an toàn hơn gọi RPC ngay khi GET).
 *
 * Lý do: link trong email có thể bị trình duyệt/email client prefetch, nếu tự
 * hủy ngay khi mở trang thì khách có thể bị hủy ngoài ý muốn. Vì vậy trang
 * /huy-dang-ky chỉ hỏi xác nhận, còn thao tác hủy thật do action này thực hiện.
 */
export async function confirmUnsubscribeAction(
  _prev: UnsubscribeState | null,
  formData: FormData
): Promise<UnsubscribeState> {
  const rawToken = formData.get('token');
  return unsubscribeNewsletterByToken(typeof rawToken === 'string' ? rawToken : '');
}
