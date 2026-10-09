import Link from 'next/link';
import { PackageX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-red-950/80 border border-red-800 text-amber-400 flex items-center justify-center shadow-lg">
        <PackageX className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-black text-stone-100">
          Không Tìm Thấy Sản Phẩm
        </h1>
        <p className="text-sm text-stone-400">
          Sản phẩm bạn đang tìm kiếm hiện không tồn tại hoặc đã tạm ngừng kinh doanh trong mùa Tết này.
        </p>
      </div>

      <div className="pt-4 flex items-center justify-center gap-4">
        <Link
          href="/san-pham"
          className="px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
        >
          Khám phá sản phẩm khác
        </Link>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl border border-stone-800 text-stone-300 font-semibold text-xs hover:bg-stone-900 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
