import Link from 'next/link';
import { AlertCircle, PackageSearch, Search } from 'lucide-react';
import { lookupGuestOrder } from '@/lib/actions/customer-orders';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tra cứu đơn hàng – Hương Quê',
  description:
    'Khách vãng lai tra cứu tình trạng đơn quà Tết bằng mã đơn hàng và số điện thoại đặt hàng.',
};

interface TraCuuDonPageProps {
  searchParams: Promise<{ ma?: string; sdt?: string }>;
}

/**
 * Tra cứu đơn cho khách vãng lai: mã đơn + SĐT, không cần đăng nhập.
 * Dùng form GET thuần (không cần JS) -> hoạt động tốt trên mobile;
 * việc tra cứu chạy trong Server Action `lookupGuestOrder` -> RPC `get_order_detail(code, phone)`.
 */
export default async function TraCuuDonPage({ searchParams }: TraCuuDonPageProps) {
  const params = await searchParams;
  const ma = (params.ma ?? '').trim();
  const sdt = (params.sdt ?? '').trim();
  const submitted = ma.length > 0 || sdt.length > 0;

  const result = submitted ? await lookupGuestOrder(ma, sdt) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-3 border-b border-stone-800 pb-6">
        <h1 className="flex items-center gap-2 font-serif text-2xl font-black text-stone-100 sm:text-3xl">
          <PackageSearch className="h-6 w-6 text-amber-400" />
          Tra cứu đơn hàng
        </h1>
        <p className="text-xs text-stone-400 sm:text-sm">
          Nhập <span className="font-semibold text-amber-300">mã đơn hàng</span> và{' '}
          <span className="font-semibold text-amber-300">số điện thoại</span> đã dùng khi đặt hàng
          để theo dõi tình trạng đơn. Không cần đăng nhập.
        </p>
      </div>

      {/* Form tra cứu (GET thuần — chạy được cả khi không có JavaScript) */}
      <form
        action="/tra-cuu-don"
        method="get"
        className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900/80 p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="ma"
              className="block text-xs font-semibold uppercase tracking-wide text-stone-400"
            >
              Mã đơn hàng <span className="text-red-400">*</span>
            </label>
            <input
              id="ma"
              name="ma"
              type="text"
              required
              defaultValue={ma}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="VD: HQ20270101000123"
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 font-mono text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sdt"
              className="block text-xs font-semibold uppercase tracking-wide text-stone-400"
            >
              Số điện thoại đặt hàng <span className="text-red-400">*</span>
            </label>
            <input
              id="sdt"
              name="sdt"
              type="tel"
              required
              inputMode="numeric"
              autoComplete="tel"
              defaultValue={sdt}
              placeholder="VD: 0901234567"
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2.5 font-mono text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/60 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 sm:w-auto"
        >
          <Search className="h-4 w-4" />
          Tra cứu đơn hàng
        </button>
      </form>

      {/* Kết quả */}
      {submitted && result && !result.ok && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-800/60 bg-red-950/40 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <div className="text-xs text-red-200">
            <p className="text-sm font-semibold">
              {result.message ?? 'Không tìm thấy đơn hàng'}
            </p>
            <p className="mt-0.5 text-red-200/80">
              Vui lòng kiểm tra lại mã đơn hàng và số điện thoại. Nếu vẫn không tra cứu được, hãy
              liên hệ hotline của Hương Quê để được hỗ trợ.
            </p>
          </div>
        </div>
      )}

      {submitted && result?.ok && result.order && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3.5">
            <p className="text-sm font-semibold text-emerald-300">
              Đã tìm thấy đơn hàng của bạn.
            </p>
            <p className="text-[11px] text-emerald-200/80">
              Thông tin cá nhân được ẩn bớt khi tra cứu không đăng nhập.
            </p>
          </div>

          <OrderDetailView order={result.order} variant="guest" />
        </div>
      )}

      {/* Gợi ý khi chưa tra cứu */}
      {!submitted && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-4 text-xs text-stone-400">
          <p className="font-semibold text-stone-300">Bạn chưa nhận được mã đơn hàng?</p>
          <p className="mt-1">
            Mã đơn hàng được gửi trong email xác nhận sau khi đặt hàng thành công. Bạn cũng có thể{' '}
            <Link href="/dang-nhap" className="font-medium text-amber-300 hover:text-amber-200">
              đăng nhập
            </Link>{' '}
            để xem toàn bộ đơn hàng trong mục{' '}
            <Link
              href="/tai-khoan/don-hang"
              className="font-medium text-amber-300 hover:text-amber-200"
            >
              Đơn hàng của tôi
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
