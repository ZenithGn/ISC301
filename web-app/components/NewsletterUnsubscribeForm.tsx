'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, MailX } from 'lucide-react';
import {
  confirmUnsubscribeAction,
  type UnsubscribeState,
} from '@/lib/actions/newsletter';

const initialState: UnsubscribeState = { success: false, message: '' };

const INVALID_MESSAGE = 'Link hủy đăng ký không hợp lệ hoặc đã được sử dụng.';

/**
 * Trang /huy-dang-ky cần một cú bấm xác nhận thay vì hủy ngay khi mở link:
 * tránh việc email client/bot prefetch link làm khách bị hủy đăng ký ngoài ý muốn.
 */
export function NewsletterUnsubscribeForm({ token }: { token: string | null }) {
  const [state, formAction, isPending] = useActionState(confirmUnsubscribeAction, initialState);

  const done = state.message !== '' && state.success;
  const failed = state.message !== '' && !state.success;

  if (done || failed) {
    return (
      <div
        className={`rounded-3xl border p-8 sm:p-10 space-y-6 text-center ${
          done ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-red-950/40 border-red-800/60'
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center border ${
            done
              ? 'bg-emerald-500/10 border-emerald-700/50 text-emerald-400'
              : 'bg-red-500/10 border-red-700/50 text-rose-400'
          }`}
        >
          {done ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-100">
            {done ? 'Đã Hủy Đăng Ký Nhận Tin' : 'Không Thể Hủy Đăng Ký'}
          </h1>
          <p
            className={`text-sm leading-relaxed ${
              done ? 'text-emerald-200/90' : 'text-rose-200/90'
            }`}
          >
            {state.message}
          </p>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
          >
            Về trang chủ
          </Link>
          <Link
            href="/san-pham"
            className="px-6 py-3 rounded-xl border border-stone-700 text-stone-300 font-semibold text-xs hover:bg-stone-900 transition-colors"
          >
            Xem quà Tết
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="rounded-3xl border border-red-800/60 bg-red-950/40 p-8 sm:p-10 space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border border-red-700/50 bg-red-500/10 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif font-black text-stone-100">Không Thể Hủy Đăng Ký</h1>
        <p className="text-sm text-rose-200/90">{INVALID_MESSAGE}</p>
        <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 text-left text-xs text-stone-400 space-y-2">
          <p className="flex items-start gap-2">
            <MailX className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Nếu bạn vẫn nhận được email ngoài ý muốn, hãy liên hệ{' '}
              <a href="mailto:lienhe@huongque.vn" className="text-amber-300 hover:underline">
                lienhe@huongque.vn
              </a>{' '}
              hoặc hotline 0901 000 000 để được hỗ trợ xóa dữ liệu theo Nghị định 13/2023.
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-stone-800 bg-stone-900/70 p-8 sm:p-10 space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border border-amber-700/50 bg-amber-500/10 text-amber-400">
        <MailX className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-stone-100">
          Xác Nhận Hủy Đăng Ký
        </h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          Bạn sắp ngừng nhận email khuyến mãi quà Tết từ Hương Quê. Bấm nút bên dưới để hoàn tất.
        </p>
      </div>

      <form action={formAction} className="pt-2">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 rounded-xl bg-red-800 text-rose-50 font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Đang xử lý…' : 'Xác nhận hủy đăng ký'}
        </button>
      </form>

      <p className="text-[11px] text-stone-500">
        Nếu bạn đổi ý, chỉ cần đóng trang này — đăng ký của bạn vẫn được giữ nguyên.
      </p>
    </div>
  );
}
