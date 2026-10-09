'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  /** Cho phép tuỳ biến khung ngoài (navbar dùng mặc định). */
  className?: string;
}

/**
 * Ô tìm kiếm trên navbar: bấm icon để mở (slide width 0 → 16rem kèm opacity),
 * nhập từ khóa rồi Enter (hoặc bấm nút) sẽ điều hướng sang `/san-pham?q=<từ khóa>`
 * — trang `/san-pham` lọc theo `q` qua `searchProducts()` trong `lib/products.ts`.
 *
 * Ô nhập tự focus khi mở, đóng khi bấm Esc hoặc click ra ngoài vùng search.
 */
export function SearchBox({ className = '' }: SearchBoxProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự focus vào ô nhập ngay khi mở.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Đóng khi bấm Esc hoặc click ra ngoài vùng search.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = keyword.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }

    setOpen(false);
    router.push(`/san-pham?q=${encodeURIComponent(query)}`);
  }

  return (
    <div ref={containerRef} className={`flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Đóng ô tìm kiếm' : 'Tìm kiếm đặc sản quà Tết'}
        aria-expanded={open}
        title="Tìm kiếm đặc sản quà Tết"
        className="p-2.5 rounded-full hover:bg-red-900/60 text-amber-200 transition-colors shrink-0"
      >
        <Search className="w-5 h-5" />
      </button>

      <form
        role="search"
        onSubmit={handleSubmit}
        className={`relative flex items-center overflow-hidden transition-all duration-300 ease-out ${
          open ? 'w-40 sm:w-64 opacity-100 ml-1' : 'w-0 opacity-0 ml-0 pointer-events-none'
        }`}
      >
        <input
          ref={inputRef}
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          tabIndex={open ? 0 : -1}
          maxLength={100}
          placeholder="Tìm quà Tết, đặc sản…"
          aria-label="Từ khóa tìm kiếm sản phẩm"
          className="w-full min-w-0 px-3.5 py-2 pr-9 rounded-full bg-red-900/70 border border-amber-500/40 text-amber-50 placeholder-amber-200/50 focus:outline-none focus:border-amber-400 text-xs transition-colors"
        />
        <button
          type="submit"
          aria-label="Tìm kiếm"
          title="Tìm kiếm"
          className="absolute right-1 p-1.5 rounded-full text-amber-200 hover:bg-red-950/70 hover:text-amber-300 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
