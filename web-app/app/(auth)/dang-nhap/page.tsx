'use client';

import { useActionState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, ActionResponse } from '@/lib/actions/auth';
import { Mail, Lock, AlertCircle, ArrowRight, LogIn } from 'lucide-react';

const initialState: ActionResponse = {
  success: false,
};

function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/';

  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif font-black text-stone-100">
          Đăng Nhập Tài Khoản
        </h2>
        <p className="text-xs text-stone-400">
          Đăng nhập để theo dõi đơn hàng và nhận ưu đãi Tết
        </p>
      </div>

      {/* Hiển thị lỗi chung để tránh lộ thông tin người dùng */}
      {state?.message && !state.success && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{state.message}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Hidden next url */}
        <input type="hidden" name="next" value={nextParam} />

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300 block">
            Địa chỉ Email
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              required
              placeholder="ten@vidu.vn"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.email && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-300">
              Mật khẩu
            </label>
            <span className="text-[11px] text-stone-500 hover:text-amber-400 cursor-pointer">
              Quên mật khẩu?
            </span>
          </div>
          <div className="relative">
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.password && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{isPending ? 'Đang xác thực...' : 'Đăng nhập ngay'}</span>
        </button>

        {/* Quick test credentials */}
        <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 text-[11px] text-stone-400 space-y-1.5">
          <div>
            <p className="font-semibold text-stone-300">Tài khoản Quản Trị (Admin & JWT):</p>
            <p className="font-mono text-amber-300/90">
              Email: <span className="text-stone-200">admin@huongque.vn</span> • Mật khẩu: <span className="text-stone-200">admin123</span>
            </p>
          </div>
          <div className="pt-1 border-t border-stone-800/60">
            <p className="font-semibold text-stone-300">Tài khoản Khách Hàng (Customer):</p>
            <p className="font-mono text-emerald-400/90">
              Email: <span className="text-stone-200">khachhang@huongque.vn</span> • Mật khẩu: <span className="text-stone-200">123456</span>
            </p>
          </div>
        </div>
      </form>

      {/* Switch to Register */}
      <div className="text-center pt-2 border-t border-stone-800 text-xs text-stone-400">
        Chưa có tài khoản quà Tết?{' '}
        <Link
          href="/dang-ky"
          className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
        >
          Đăng ký ngay <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function DangNhapPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-stone-400 text-xs">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
