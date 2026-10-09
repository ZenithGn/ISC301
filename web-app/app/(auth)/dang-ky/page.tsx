'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, ActionResponse } from '@/lib/actions/auth';
import { User, Mail, Phone, Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const initialState: ActionResponse = {
  success: false,
};

export default function DangKyPage() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-serif font-black text-stone-100">
          Đăng Ký Thành Viên
        </h2>
        <p className="text-xs text-stone-400">
          Tạo tài khoản để nhận ưu đãi Tết và lưu sổ địa chỉ giao quà
        </p>
      </div>

      {/* Thông báo kết quả */}
      {state?.message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            state.success
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-rose-300'
          }`}
        >
          {state.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      <form action={formAction} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300 block">
            Họ và tên
          </label>
          <div className="relative">
            <input
              type="text"
              name="fullName"
              required
              placeholder="Nguyễn Văn An"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.fullName && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.fullName[0]}</p>
          )}
        </div>

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
              placeholder="an.nguyen@vidu.vn"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.email && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300 block">
            Số điện thoại nhận hàng (10 số, bắt đầu 0)
          </label>
          <div className="relative">
            <input
              type="tel"
              name="phone"
              required
              placeholder="0912345678"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.phone && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.phone[0]}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300 block">
            Mật khẩu (tối thiểu 8 ký tự, có cả chữ và số)
          </label>
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

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-stone-300 block">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <input
              type="password"
              name="confirmPassword"
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
            <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
          </div>
          {state?.fieldErrors?.confirmPassword && (
            <p className="text-[11px] text-rose-400">{state.fieldErrors.confirmPassword[0]}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-2"
        >
          {isPending ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2 border-t border-stone-800 text-xs text-stone-400">
        Đã có tài khoản?{' '}
        <Link
          href="/dang-nhap"
          className="text-amber-400 font-semibold hover:underline inline-flex items-center gap-1"
        >
          Đăng nhập tại đây <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
