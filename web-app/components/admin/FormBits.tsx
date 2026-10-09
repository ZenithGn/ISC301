/**
 * Mảnh UI dùng chung cho khu vực quản trị (không chứa hook, không import
 * module server-only nên dùng được ở cả Server và Client Component).
 */

export const adminInputClass =
  'w-full rounded-xl bg-stone-950/70 border border-stone-700 px-3 py-2 text-sm text-stone-100 ' +
  'placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-500/60 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export const adminLabelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1.5';

export const adminCardClass = 'rounded-2xl bg-stone-900/80 border border-stone-800 p-5';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={adminLabelClass} htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-amber-400"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-stone-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] font-medium text-rose-400">{error}</p> : null}
    </div>
  );
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error' | 'warning';
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    info: 'bg-stone-800/70 border-stone-700 text-stone-200',
    success: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200',
    error: 'bg-red-950/70 border-red-800/70 text-rose-200',
    warning: 'bg-amber-950/60 border-amber-700/60 text-amber-200',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${tones[tone]}`} role="status">
      {children}
    </div>
  );
}

export function SectionTitle({
  code,
  title,
  description,
}: {
  code?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-serif font-bold text-stone-100">
        {code ? <span className="text-amber-400 font-mono text-xs mr-2">{code}</span> : null}
        {title}
      </h2>
      {description ? <p className="text-xs text-stone-400 mt-1">{description}</p> : null}
    </div>
  );
}
