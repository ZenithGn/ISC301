'use client';

import { useActionState } from 'react';
import { ActionResult, IDLE_RESULT } from '@/lib/actions/admin/result';

type ServerAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Form nhỏ cho các thao tác trên một dòng (đổi trạng thái, xóa, sắp xếp).
 * Dùng chung để mỗi form có state thông báo riêng và luôn hiện lỗi tiếng Việt
 * (ví dụ lỗi khóa ngoại khi xóa danh mục còn sản phẩm).
 */
export function ActionForm({
  action,
  hidden = {},
  children,
  className,
  confirmText,
  tone = 'ghost',
  messageClassName,
}: {
  action: ServerAction;
  hidden?: Record<string, string | number | boolean>;
  children: React.ReactNode;
  className?: string;
  /** Nếu có, hỏi xác nhận trước khi gửi. */
  confirmText?: string;
  tone?: 'ghost' | 'danger';
  messageClassName?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_RESULT);

  const buttonTone =
    tone === 'danger'
      ? 'border border-red-800 bg-red-950/70 text-rose-200 hover:bg-red-900'
      : 'border border-stone-700 text-stone-300 hover:bg-stone-800';

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={
        confirmText
          ? (event) => {
              if (!window.confirm(confirmText)) event.preventDefault();
            }
          : undefined
      }
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={String(value)} />
      ))}
      <div className={className === 'inline' ? 'inline-flex' : undefined}>
        <button type="submit" className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${buttonTone}`}>
          {children}
        </button>
      </div>
      {state.message ? (
        <p
          className={
            messageClassName ??
            `mt-1 text-[11px] ${state.ok ? 'text-emerald-400' : 'text-rose-400'}`
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
