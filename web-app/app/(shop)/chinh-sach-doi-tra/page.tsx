import type { Metadata } from 'next';
import Link from 'next/link';
import { RotateCcw, Clock, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách đổi trả & hoàn tiền | Hương Quê',
  description:
    'Điều kiện, thời hạn 48 giờ và quy trình đổi trả – hoàn tiền cho hộp quà Tết mua tại Hương Quê.',
};

const ELIGIBLE_CASES = [
  'Hộp quà bị móp méo, rách hộp hoặc hư hỏng trong quá trình vận chuyển.',
  'Giao sai sản phẩm, sai số lượng hoặc thiếu phụ kiện so với đơn đã đặt.',
  'Sản phẩm bên trong hết hạn sử dụng, mốc, biến chất hoặc có mùi lạ khi vừa nhận hàng.',
  'Hộp quà không đúng loại/mẫu mà khách đã chọn trên website.',
];

const INELIGIBLE_CASES = [
  'Quá 48 giờ kể từ thời điểm nhận hàng (theo xác nhận của đơn vị vận chuyển).',
  'Sản phẩm đã bị mở túi hút chân không, đã sử dụng hoặc bảo quản sai hướng dẫn (nắng nóng, ẩm ướt).',
  'Hư hỏng do lỗi của khách hàng khi vận chuyển, bảo quản hoặc do thiên tai, hỏa hoạn.',
  'Quà tặng khuyến mãi, phiếu quà tặng và sản phẩm ghi rõ "không đổi trả" khi mua.',
  'Khách đổi ý sau khi đã nhận hàng (trường hợp này Hương Quê hỗ trợ thu hồi và hoàn tiền tối đa 70% giá trị sản phẩm còn nguyên seal).',
];

const STEPS = [
  {
    title: 'Bước 1 – Liên hệ trong 48 giờ',
    detail:
      'Gọi hotline 0901 000 000 hoặc email lienhe@huongque.vn kèm mã đơn hàng, số điện thoại đặt hàng và mô tả sự cố.',
  },
  {
    title: 'Bước 2 – Cung cấp bằng chứng',
    detail:
      'Gửi ảnh hoặc video tình trạng hộp quà (ảnh toàn bộ hộp, ảnh tem niêm phong và ảnh chi tiết chỗ hư hỏng) để Hương Quê đối chiếu với đơn vị vận chuyển.',
  },
  {
    title: 'Bước 3 – Xác nhận phương án',
    detail:
      'Trong vòng 24 giờ làm việc, Hương Quê xác nhận một trong ba phương án: đổi mới sản phẩm tương đương, gửi bù phần thiếu, hoặc hoàn tiền 100%.',
  },
  {
    title: 'Bước 4 – Thực hiện đổi trả/hoàn tiền',
    detail:
      'Đổi mới: giao trong 1–3 ngày làm việc. Hoàn tiền COD: chuyển khoản trong 3–5 ngày làm việc. Hoàn tiền PayOS: hoàn về tài khoản/ví đã thanh toán trong 5–7 ngày làm việc.',
  },
];

export default function ChinhSachDoiTraPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-stone-800 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Chính sách mua hàng
        </span>
        <h1 className="text-3xl font-serif font-black text-stone-100">
          Chính Sách Đổi Trả &amp; Hoàn Tiền
        </h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          Hương Quê cam kết mọi hộp quà Tết đều được kiểm tra trước khi giao. Trong trường hợp hiếm hoi
          sản phẩm không đúng như mô tả, chúng tôi đổi mới hoặc hoàn tiền trong vòng{' '}
          <strong className="text-amber-300">48 giờ</strong> kể từ khi bạn nhận hàng.
        </p>
        <p className="text-[11px] text-stone-500">Cập nhật lần cuối: mùa Tết 2027.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Trường hợp được đổi trả / hoàn tiền
        </h2>
        <ul className="space-y-2 text-sm text-stone-300">
          {ELIGIBLE_CASES.map((item) => (
            <li key={item} className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
              <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          Trường hợp không được đổi trả
        </h2>
        <ul className="space-y-2 text-sm text-stone-300">
          {INELIGIBLE_CASES.map((item) => (
            <li key={item} className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-900/40 border border-stone-800">
              <span className="text-rose-400 shrink-0 mt-0.5">✕</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-amber-400" />
          Quy trình 4 bước
        </h2>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <h3 className="text-sm font-bold text-stone-100">{step.title}</h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed pl-8">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Thời hạn &amp; chi phí
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1">
            <span className="text-stone-400 block">Thời hạn yêu cầu</span>
            <span className="text-amber-300 font-bold text-sm">48 giờ sau khi nhận</span>
          </div>
          <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1">
            <span className="text-stone-400 block">Chi phí đổi trả</span>
            <span className="text-amber-300 font-bold text-sm">Hương Quê chịu 100%</span>
            <span className="block text-stone-500">với lỗi từ phía chúng tôi</span>
          </div>
          <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1">
            <span className="text-stone-400 block">Hoàn tiền PayOS</span>
            <span className="text-amber-300 font-bold text-sm">5–7 ngày làm việc</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-stone-900/70 border border-stone-800 p-6 space-y-3">
        <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Cam kết của Hương Quê
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          Không bán hàng giả, hàng nhái, hàng không rõ nguồn gốc. Mọi sản phẩm đều có tem nhãn, hạn sử
          dụng và chứng nhận an toàn thực phẩm từ nhà sản xuất. Hóa đơn VAT được xuất theo yêu cầu.
        </p>
        <p className="text-xs text-stone-400">
          Liên hệ đổi trả: hotline 0901 000 000 – email{' '}
          <a href="mailto:lienhe@huongque.vn" className="text-amber-300 hover:underline">
            lienhe@huongque.vn
          </a>{' '}
          – hoặc xem{' '}
          <Link href="/van-chuyen" className="text-amber-300 hover:underline">
            chính sách vận chuyển
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
