'use client';

import { useActionState } from 'react';
import {
  updateProfileAction,
  changePasswordAction,
  ActionResponse,
} from '@/lib/actions/auth';
import { User, Phone, Lock, AlertCircle, CheckCircle2, Save, MapPin } from 'lucide-react';

const initialState: ActionResponse = { success: false };

function Feedback({ state }: { state: ActionResponse }) {
  if (!state?.message) return null;
  return (
    <div
      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
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
  );
}

const inputClass =
  'w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 text-xs transition-colors';

export function ProfileForm({
  defaultFullName,
  defaultPhone,
  defaultAddress,
  email,
}: {
  defaultFullName: string;
  defaultPhone: string;
  defaultAddress: string;
  email: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">Email (không đổi được)</label>
        <input
          type="email"
          value={email}
          disabled
          className={`${inputClass} opacity-60 cursor-not-allowed`}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">Họ và tên</label>
        <div className="relative">
          <input
            type="text"
            name="fullName"
            required
            defaultValue={defaultFullName}
            placeholder="Nguyễn Văn An"
            className={inputClass}
          />
          <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        </div>
        {state?.fieldErrors?.fullName && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.fullName[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">
          Số điện thoại (10 số, bắt đầu 0)
        </label>
        <div className="relative">
          <input
            type="tel"
            name="phone"
            required
            defaultValue={defaultPhone}
            placeholder="0912345678"
            className={inputClass}
          />
          <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        </div>
        {state?.fieldErrors?.phone && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.phone[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">
          Địa chỉ mặc định (không bắt buộc)
        </label>
        <div className="relative">
          <input
            type="text"
            name="defaultAddress"
            defaultValue={defaultAddress}
            maxLength={300}
            placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
            className={inputClass}
          />
          <MapPin className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        </div>
        <p className="text-[11px] text-stone-500">
          Dùng để điền sẵn địa chỉ khi đặt quà Tết.
        </p>
        {state?.fieldErrors?.defaultAddress && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.defaultAddress[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">Mật khẩu hiện tại</label>
        <div className="relative">
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className={inputClass}
          />
          <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        </div>
        {state?.fieldErrors?.currentPassword && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.currentPassword[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">
          Mật khẩu mới (tối thiểu 8 ký tự, có chữ và số)
        </label>
        <div className="relative">
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            className={inputClass}
          />
          <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-stone-300 block">Xác nhận mật khẩu mới</label>
        <div className="relative">
          <input
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            className={inputClass}
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
        className="px-5 py-2.5 rounded-xl bg-stone-800 text-stone-100 font-bold text-xs hover:bg-stone-700 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <Lock className="w-3.5 h-3.5" />
        {isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}
