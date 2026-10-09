'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { subscribeNewsletterAction, type NewsletterActionState } from '@/lib/actions/newsletter';

const initialState: NewsletterActionState = {
  success: false,
  status: 'error',
  message: '',
};

interface NewsletterFormProps {
  /** Cho phép tuỳ biến khung ngoài (trang chủ dùng khối lớn, footer dùng khối nhỏ). */
  className?: string;
  heading?: string;
  description?: string;
}

/**
 * F06 – Form đăng ký nhận bản tin.
 * Checkbox đồng ý nhận email là BẮT BUỘC (yêu cầu pháp lý – Nghị định 13/2023).
 */
export function NewsletterForm({ className = '', heading, description }: NewsletterFormProps) {
  const [state, formAction, isPending] = useActionState(subscribeNewsletterAction, initialState);

  const hasMessage = Boolean(state?.message);
  const isSuccess = state?.success === true;

  return (
    <div className={className || 'space-y-4'}>
      {heading && (
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-bold text-amber-200">{heading}</h3>
          {description && <p className="text-xs text-stone-300 leading-relaxed">{description}</p>}
        </div>
      )}

      {hasMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isSuccess
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-rose-300'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="newsletter-email" className="text-xs font-semibold text-amber-100 block">
            Địa chỉ email
          </label>
          <div className="relative">
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="an.nguyen@vidu.vn"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950/80 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.email && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-[11px] text-stone-300 leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 w-4 h-4 shrink-0 accent-amber-500 cursor-pointer"
          />
          <span>
            Tôi đồng ý nhận email thông báo ưu đãi, bộ sưu tập quà Tết và lịch giao hàng từ Hương Quê.
            Mỗi email đều kèm link hủy đăng ký, tôi có thể rút lại sự đồng ý bất cứ lúc nào.
          </span>
        </label>
        {state?.fieldErrors?.consent && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.consent[0]}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Đang đăng ký...' : 'Đăng ký nhận tin'}
        </button>
      </form>

      <p className="text-[11px] text-stone-400 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
        <span>
          Email chỉ dùng để gửi bản tin khuyến mãi. Xem chi tiết tại{' '}
          <Link href="/chinh-sach-bao-mat" className="text-amber-300 hover:underline">
            Chính sách bảo mật
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
