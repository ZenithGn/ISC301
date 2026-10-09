import Link from 'next/link';
import { Heart, Sparkles, MapPin, Phone, Mail, Building2, FileText } from 'lucide-react';
import { NewsletterForm } from '@/components/NewsletterForm';

export function Footer() {
  return (
    <footer className="bg-red-950 text-amber-100/80 border-t border-amber-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info + thông tin người bán */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-red-950 font-bold">
                <Sparkles className="w-4 h-4 fill-red-950" />
              </div>
              <span className="text-xl font-serif font-black tracking-wider text-amber-300">
                HƯƠNG QUÊ
              </span>
            </div>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Tuyển chọn tinh hoa đặc sản ẩm thực ba miền và giỏ quà Tết sum vầy cao cấp, gửi gắm tấm
              lòng thảo thơm ngày đầu xuân năm mới.
            </p>

            <div className="text-xs space-y-1.5 text-amber-200/70 pt-1">
              <p className="flex items-start gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-200 font-semibold">
                    Công ty TNHH Thương mại Hương Quê
                  </strong>
                  <br />
                  MST: 0101234567
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Tầng 3, 128 Phố Cổ, Hoàn Kiếm, Hà Nội
                  <br />
                  Chi nhánh: Đà Nẵng • TP. Hồ Chí Minh
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Hotline hỗ trợ: <strong className="text-amber-300">0901 000 000</strong>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <a href="mailto:lienhe@huongque.vn" className="hover:text-amber-200 transition-colors">
                  lienhe@huongque.vn
                </a>
              </p>
              <p className="flex items-center gap-2 text-amber-200/60">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Giấy phép ĐKKD do Sở KH&amp;ĐT Hà Nội cấp
              </p>
            </div>
          </div>

          {/* Đặc sản vùng miền */}
          <div>
            <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-4">
              Đặc sản vùng miền
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/san-pham?mien=bac" className="hover:text-amber-200 transition-colors">
                  Hương sắc miền Bắc (Trà Tân Cương, Ô mai, Bánh cốm)
                </Link>
              </li>
              <li>
                <Link href="/san-pham?mien=trung" className="hover:text-amber-200 transition-colors">
                  Đậm đà xứ Trung (Mè xửng, Cu Đơ, Bò khô)
                </Link>
              </li>
              <li>
                <Link href="/san-pham?mien=nam" className="hover:text-amber-200 transition-colors">
                  Trù phú phương Nam (Bánh pía, Mứt dừa, Hạt điều)
                </Link>
              </li>
              <li>
                <Link href="/san-pham?mien=ba_mien" className="hover:text-amber-200 transition-colors">
                  Hộp quà Phúc Lộc hội tụ Ba Miền
                </Link>
              </li>
              <li>
                <Link href="/san-pham?sort=featured" className="hover:text-amber-200 transition-colors">
                  Quà Tết nổi bật &amp; bán chạy
                </Link>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ & chính sách */}
          <div>
            <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-4">
              Hỗ trợ khách hàng
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/faq" className="hover:text-amber-200 transition-colors">
                  Câu hỏi thường gặp (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/van-chuyen" className="hover:text-amber-200 transition-colors">
                  Vận chuyển &amp; giao nhận
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach-doi-tra" className="hover:text-amber-200 transition-colors">
                  Chính sách đổi trả &amp; hoàn tiền
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach-bao-mat" className="hover:text-amber-200 transition-colors">
                  Chính sách bảo mật dữ liệu
                </Link>
              </li>
              <li>
                <Link href="/tra-cuu-don" className="hover:text-amber-200 transition-colors">
                  Tra cứu đơn hàng
                </Link>
              </li>
              <li>
                <Link href="/huy-dang-ky" className="hover:text-amber-200 transition-colors">
                  Hủy đăng ký nhận tin
                </Link>
              </li>
            </ul>

            <div className="mt-4 space-y-1.5 text-[11px] text-amber-200/60">
              <p>✓ 100% nông sản OCOP chính gốc</p>
              <p>✓ Miễn phí giao hàng cho đơn từ 500.000₫</p>
              <p>✓ Đổi trả trong 48h nếu hộp quà hư hỏng</p>
            </div>
          </div>

          {/* Bản tin */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
              Nhận tin ưu đãi quà Tết
            </h4>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Đăng ký để nhận thông báo sớm về bộ sưu tập giới hạn, mã giảm giá và lịch giao quà trước
              Tết Nguyên Đán.
            </p>

            <NewsletterForm className="space-y-3" />

            <div className="p-3 rounded-lg bg-red-900/40 border border-amber-600/30 text-center">
              <span className="text-xs text-amber-300 font-semibold block">Tư vấn quà doanh nghiệp:</span>
              <span className="text-sm font-bold text-amber-400">0901 000 000</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200/50">
          <p>© 2027 Hương Quê – Nền tảng thương mại điện tử Quà Tết (ISC301). Mọi quyền được bảo lưu.</p>
          <p className="flex items-center gap-1">
            Dựng bằng <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> công nghệ Next.js &amp;
            Supabase
          </p>
        </div>
      </div>
    </footer>
  );
}
