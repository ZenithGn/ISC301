'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

/**
 * Error boundary toàn cục.
 *
 * Dùng cho trường hợp `requireUser()`/`requireAdmin()` NÉM `AuthUnavailableError`
 * (không đọc được phiên do mạng chậm/timeout). Đây KHÔNG phải đăng xuất:
 * người dùng vẫn giữ nguyên phiên, chỉ cần bấm "Thử lại".
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isAuthUnavailable = error.name === 'AuthUnavailableError';

  useEffect(() => {
    console.error('[app/error]', error.name, error.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-stone-950 text-stone-100">
      <div className="w-full max-w-lg rounded-3xl border border-stone-800 bg-stone-900/80 p-8 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-700/50 bg-amber-500/10 text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-black">
            {isAuthUnavailable ? 'Chưa kết nối được máy chủ xác thực' : 'Đã xảy ra lỗi'}
          </h1>
          <p className="text-sm text-stone-400">
            {isAuthUnavailable
              ? 'Kết nối tới Supabase đang chậm hoặc chập. Bạn VẪN ĐANG ĐĂNG NHẬP — chỉ cần thử lại, không cần đăng nhập lại.'
              : 'Vui lòng thử lại. Nếu lỗi lặp lại, hãy liên hệ hotline 0901 000 000.'}
          </p>
          {isAuthUnavailable && error.message ? (
            <p className="text-[11px] text-stone-500 font-mono">{error.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400"
          >
            <RefreshCw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-200 hover:border-amber-500/50"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
