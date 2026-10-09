import Link from 'next/link';
import { Heart, Sparkles, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-red-950 text-amber-100/80 border-t border-amber-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
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
              Tuyển chọn tinh hoa đặc sản ẩm thực ba miền và giỏ quà Tết sum vầy cao cấp, gửi gắm tấm lòng thảo thơm ngày đầu xuân năm mới.
            </p>
            <div className="text-xs space-y-1.5 text-amber-200/60 pt-2">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Hà Nội • Đà Nẵng • TP. Hồ Chí Minh
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Hotline quà Tết: 0901 000 000
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                lienhe@huongque.vn
              </p>
            </div>
          </div>

          {/* Quick Links */}
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
            </ul>
          </div>

          {/* Policies & Assurance */}
          <div>
            <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-4">
              Cam kết chất lượng
            </h4>
            <ul className="space-y-2 text-xs text-amber-200/70">
              <li>✓ 100% Nông sản, đặc sản OCOP chính gốc</li>
              <li>✓ Hộp quà thiết kế trang nhã, hoa văn Tết truyền thống</li>
              <li>✓ Giao hàng toàn quốc, đảm bảo nguyên vẹn tới tay người nhận</li>
              <li>✓ Hỗ trợ doanh nghiệp in logo và thiệp chúc Tết theo yêu cầu</li>
            </ul>
          </div>

          {/* Business & Support */}
          <div>
            <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-4">
              Đặt Quà Doanh Nghiệp
            </h4>
            <p className="text-xs text-amber-200/70 leading-relaxed mb-3">
              Chiết khấu hấp dẫn cho đơn hàng số lượng lớn dịp Tết Nguyên Đán. Xuất hóa đơn VAT đầy đủ.
            </p>
            <div className="p-3 rounded-lg bg-red-900/40 border border-amber-600/30 text-center">
              <span className="text-xs text-amber-300 font-semibold block">Tư vấn báo giá sỉ:</span>
              <span className="text-sm font-bold text-amber-400">0901 000 000</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-amber-900/40 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-200/50">
          <p>© 2027 Hương Quê – Nền tảng thương mại điện tử Quà Tết (ISC301). Mọi quyền được bảo lưu.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Dựng bằng <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> công nghệ Next.js & Supabase
          </p>
        </div>
      </div>
    </footer>
  );
}
