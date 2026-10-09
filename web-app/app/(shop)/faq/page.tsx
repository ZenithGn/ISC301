import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp (FAQ) | Hương Quê',
  description:
    'Giải đáp thắc mắc về đặt quà Tết, thanh toán, giao hàng, đổi trả, hóa đơn VAT và bảo mật dữ liệu tại Hương Quê.',
};

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Hương Quê bán những loại quà Tết nào?',
    answer:
      'Hương Quê cung cấp hộp quà Tết đặc sản ba miền (An Khang, Phúc Lộc, Thịnh Vượng, Tinh Hoa Bắc Bộ, Hương Vị Xứ Cố Đô, Phương Nam Trù Phú) cùng các đặc sản lẻ như trà Thái Nguyên, trà sen Tây Hồ, ô mai Hà Nội, mè xửng Huế, bánh pía Sóc Trăng, hạt điều Bình Phước, mắc ca Tây Nguyên.',
  },
  {
    question: 'Tôi có thể đặt số lượng lớn cho doanh nghiệp không?',
    answer:
      'Có. Hương Quê nhận đơn quà biếu doanh nghiệp từ 20 hộp trở lên, có chiết khấu theo số lượng, in logo và thiệp chúc Tết theo yêu cầu, xuất hóa đơn VAT đầy đủ. Vui lòng gọi hotline 0901 000 000 để được báo giá.',
  },
  {
    question: 'Phí vận chuyển được tính như thế nào?',
    answer:
      'Phí vận chuyển cố định 30.000₫ cho mọi đơn hàng toàn quốc và MIỄN PHÍ với đơn từ 500.000₫ trở lên. Chi tiết thời gian giao theo từng miền xem tại trang Vận chuyển & Giao nhận.',
  },
  {
    question: 'Hương Quê hỗ trợ những phương thức thanh toán nào?',
    answer:
      'Bạn có thể chọn thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến qua PayOS (chuyển khoản ngân hàng/ví điện tử). Với đơn PayOS, hệ thống hiển thị link thanh toán và tự động xác nhận khi nhận được tiền.',
  },
  {
    question: 'Tôi có được kiểm tra hàng trước khi thanh toán không?',
    answer:
      'Với đơn COD, bạn được đồng kiểm số lượng và tình trạng hộp quà bên ngoài với nhân viên giao hàng trước khi trả tiền. Để đảm bảo vệ sinh an toàn thực phẩm, quý khách không mở các túi hút chân không bên trong.',
  },
  {
    question: 'Tôi có thể hủy đơn hàng đã đặt không?',
    answer:
      'Đơn ở trạng thái "Chờ thanh toán" hoặc "Đã xác nhận" có thể hủy tại trang chi tiết đơn hàng. Sau khi đơn chuyển sang "Đang giao hàng", vui lòng liên hệ hotline để được hỗ trợ.',
  },
  {
    question: 'Hộp quà bị móp méo hoặc hư hỏng thì xử lý thế nào?',
    answer:
      'Hương Quê đổi mới hoặc hoàn tiền trong vòng 48 giờ kể từ khi nhận hàng nếu hộp quà hư hỏng, móp méo do vận chuyển hoặc sai sản phẩm. Bạn chỉ cần chụp ảnh tình trạng hàng và gửi tới lienhe@huongque.vn kèm mã đơn.',
  },
  {
    question: 'Đơn hàng của tôi đang ở đâu?',
    answer:
      'Bạn có thể tra cứu 24/7 tại trang Tra cứu đơn hàng bằng mã đơn và số điện thoại đặt hàng. Khách đã đăng nhập còn xem được toàn bộ lịch sử đơn trong mục Đơn hàng của tôi.',
  },
  {
    question: 'Ngày Tết có giao hàng không?',
    answer:
      'Hương Quê giao tới 29 Tết âm lịch. Các đơn đặt trước 16h ngày 27 Tết được ưu tiên xử lý trong ngày. Từ mùng 4 Tết, bộ phận giao nhận hoạt động trở lại bình thường.',
  },
  {
    question: 'Tôi có thể gửi kèm lời chúc Tết không?',
    answer:
      'Có. Ở bước thanh toán, bạn nhập nội dung vào ô "Lời chúc Tết". Hương Quê in và gắn thiệp viết tay thư pháp theo đúng nội dung của bạn (tối đa 300 ký tự).',
  },
  {
    question: 'Hương Quê thu thập những dữ liệu gì của tôi?',
    answer:
      'Chúng tôi thu thập họ tên, số điện thoại, email, địa chỉ giao hàng, nội dung đơn hàng và (nếu bạn đồng ý) email để gửi bản tin khuyến mãi. Chi tiết mục đích, thời gian lưu và quyền của bạn được nêu tại trang Chính sách bảo mật theo Nghị định 13/2023/NĐ-CP.',
  },
  {
    question: 'Làm sao để ngừng nhận email khuyến mãi?',
    answer:
      'Mỗi email Hương Quê gửi đều có link "hủy đăng ký" ở chân thư. Bạn cũng có thể yêu cầu xóa dữ liệu cá nhân bằng email tới lienhe@huongque.vn; chúng tôi xử lý trong vòng 72 giờ làm việc.',
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-stone-800 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Hỗ trợ khách hàng
        </span>
        <h1 className="text-3xl font-serif font-black text-stone-100">Câu Hỏi Thường Gặp</h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          Tổng hợp những thắc mắc phổ biến nhất về đặt quà Tết, thanh toán, giao nhận và dữ liệu cá nhân
          tại Hương Quê. Nếu chưa tìm thấy câu trả lời, hãy gọi hotline 0901 000 000 hoặc email
          lienhe@huongque.vn.
        </p>
      </header>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl bg-stone-900/70 border border-stone-800 open:border-amber-600/40 transition-colors"
          >
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-sm font-semibold text-stone-100 hover:text-amber-300 transition-colors">
              <span>{item.question}</span>
              <span className="shrink-0 text-amber-400 text-lg leading-none group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <div className="px-5 pb-5 text-xs sm:text-sm text-stone-300 leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </div>

      <section className="rounded-2xl bg-gradient-to-r from-red-950 via-stone-900 to-amber-950 border border-amber-600/30 p-6 sm:p-8 space-y-3 text-center">
        <h2 className="text-lg font-serif font-bold text-amber-100">Vẫn cần hỗ trợ thêm?</h2>
        <p className="text-xs text-stone-300">
          Đội ngũ tư vấn quà biếu Hương Quê hỗ trợ từ 8h00 – 21h00 mỗi ngày, kể cả cuối tuần.
        </p>
        <div className="pt-1 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold">
            Hotline 0901 000 000
          </span>
          <Link
            href="/van-chuyen"
            className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-200 hover:bg-red-900/60 transition-colors"
          >
            Chính sách vận chuyển
          </Link>
          <Link
            href="/chinh-sach-doi-tra"
            className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-200 hover:bg-red-900/60 transition-colors"
          >
            Chính sách đổi trả
          </Link>
        </div>
      </section>
    </div>
  );
}
