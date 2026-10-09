'use client';

import { useFormStatus } from 'react-dom';

/** Nút submit hiển thị trạng thái đang xử lý của form Server Action. */
export function SubmitButton({
  children,
  pendingLabel = 'Đang lưu…',
  className = '',
  variant = 'primary',
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: 'primary' | 'ghost' | 'danger';
  /** Cho phép nhiều nút trong cùng form: mỗi nút gửi `name=value` khác nhau. */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  const variants: Record<string, string> = {
    primary:
      'bg-amber-500 text-stone-950 hover:bg-amber-400 font-bold disabled:bg-amber-500/50',
    ghost:
      'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700 font-medium disabled:opacity-50',
    danger:
      'bg-red-950 text-rose-200 hover:bg-red-900 border border-red-800 font-medium disabled:opacity-50',
  };

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs transition-colors disabled:cursor-wait ${variants[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
