'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPasswordAction, ActionResponse } from '@/lib/actions/auth';
import { Lock, AlertCircle, CheckCircle2, LogIn } from 'lucide-react';

const initialState: ActionResponse = { success: false };

export default function DatLaiMatKhauPage() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif font-black text-stone-100">Đặt Lại Mật Khẩu</h2>
        <p className="text-xs text-stone-400">
          Nhập mật khẩu mới cho tài khoản của bạn
        </p>
      </div>

      {state?.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            state.success
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-rose-300'
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {state?.success ? (
        <div className="text-center pt-2 border-t border-stone-800">
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold"
          >
            <LogIn className="w-3.5 h-3.5" /> Đăng nhập ngay
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300 block">
              Mật khẩu mới (tối thiểu 8 ký tự, có cả chữ và số)
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
              />
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            </div>
            {state?.fieldErrors?.password && (
              <p className="text-[11px] text-rose-400">{state.fieldErrors.password[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300 block">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type="password"
                name="confirmPassword"
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
              />
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            </div>
            {state?.fieldErrors?.confirmPassword && (
              <p className="text-[11px] text-rose-400">{state.fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{isPending ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
