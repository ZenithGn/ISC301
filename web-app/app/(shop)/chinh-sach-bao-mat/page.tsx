import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Database, Target, Share2, UserCheck, Trash2, Clock, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật & dữ liệu cá nhân | Hương Quê',
  description:
    'Hương Quê thu thập dữ liệu gì, dùng vào mục đích nào, lưu trong bao lâu và cách bạn yêu cầu xóa dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.',
};

const COLLECTED_DATA: { group: string; fields: string; purpose: string }[] = [
  {
    group: 'Thông tin đặt hàng',
    fields: 'Họ tên người nhận, số điện thoại, email, tỉnh/thành, địa chỉ giao quà, ghi chú và lời chúc Tết.',
    purpose: 'Xử lý đơn hàng, giao quà đúng người – đúng địa chỉ và liên hệ khi giao nhận.',
  },
  {
    group: 'Thông tin tài khoản',
    fields: 'Email đăng nhập, họ tên, số điện thoại, mật khẩu đã được mã hóa (do Supabase Auth quản lý).',
    purpose: 'Tạo và bảo vệ tài khoản, tra cứu lịch sử đơn hàng, hỗ trợ khách hàng thân thiết.',
  },
  {
    group: 'Thông tin thanh toán',
    fields: 'Phương thức thanh toán, mã giao dịch PayOS, trạng thái thanh toán, số tiền. Hương Quê KHÔNG lưu số thẻ hay mã CVV.',
    purpose: 'Đối soát thanh toán và hoàn tiền khi cần thiết.',
  },
  {
    group: 'Dữ liệu bản tin',
    fields: 'Địa chỉ email và trạng thái đồng ý nhận tin (consent), kèm token hủy đăng ký.',
    purpose: 'Gửi thông báo ưu đãi, bộ sưu tập quà Tết và lịch giao hàng.',
  },
  {
    group: 'Dữ liệu kỹ thuật & phân tích',
    fields: 'Số liệu truy cập ẩn danh qua Google Analytics 4 (sản phẩm đã xem, đơn đã mua), cookie phiên đăng nhập và cookie giỏ hàng.',
    purpose: 'Thống kê lượt xem/mua để cải thiện trải nghiệm; không dùng để nhận diện cá nhân.',
  },
];

export default function ChinhSachBaoMatPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="space-y-3 border-b border-stone-800 pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Quyền riêng tư
        </span>
        <h1 className="text-3xl font-serif font-black text-stone-100">
          Chính Sách Bảo Mật &amp; Dữ Liệu Cá Nhân
        </h1>
        <p className="text-sm text-stone-400 leading-relaxed">
          Hương Quê xử lý dữ liệu cá nhân của bạn theo{' '}
          <strong className="text-amber-300">Nghị định 13/2023/NĐ-CP</strong> về bảo vệ dữ liệu cá nhân
          và Luật An toàn thông tin mạng. Chúng tôi chỉ thu thập dữ liệu cần thiết, dùng đúng mục đích
          đã thông báo và chỉ xử lý khi có sự đồng ý của bạn.
        </p>
        <p className="text-[11px] text-stone-500">Hiệu lực từ: mùa Tết 2027.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          1. Dữ liệu chúng tôi thu thập
        </h2>
        <div className="space-y-3">
          {COLLECTED_DATA.map((item) => (
            <div key={item.group} className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 space-y-1.5">
              <h3 className="text-sm font-bold text-amber-200">{item.group}</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                <span className="text-stone-500">Dữ liệu: </span>
                {item.fields}
              </p>
              <p className="text-xs text-stone-300 leading-relaxed">
                <span className="text-stone-500">Mục đích: </span>
                {item.purpose}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          2. Mục đích và căn cứ xử lý
        </h2>
        <ul className="space-y-2 text-sm text-stone-300">
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed">
            Thực hiện hợp đồng mua bán: xử lý đơn hàng, giao quà, xuất hóa đơn, hỗ trợ đổi trả – hoàn tiền.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed">
            Sự đồng ý của bạn: gửi email bản tin khuyến mãi. Bạn có thể rút lại sự đồng ý bất cứ lúc nào
            bằng link hủy đăng ký trong mỗi email hoặc tại trang{' '}
            <Link href="/huy-dang-ky" className="text-amber-300 hover:underline">
              hủy đăng ký
            </Link>
            .
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 leading-relaxed">
            Lợi ích hợp pháp &amp; nghĩa vụ pháp lý: phòng chống gian lận thanh toán, lưu trữ chứng từ kế
            toán – thuế theo quy định.
          </li>
        </ul>
        <p className="text-xs text-stone-400 leading-relaxed">
          Chúng tôi <strong className="text-stone-200">không</strong> bán, cho thuê hoặc trao đổi dữ liệu
          cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-amber-400" />
          3. Chia sẻ dữ liệu với bên xử lý
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          Để vận hành website, dữ liệu có thể được xử lý bởi các nhà cung cấp dịch vụ kỹ thuật (bên xử lý
          dữ liệu) và chỉ trong phạm vi cần thiết:
        </p>
        <ul className="space-y-2 text-xs text-stone-300">
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            <strong className="text-stone-200">Supabase</strong> – lưu trữ cơ sở dữ liệu đơn hàng, tài
            khoản, bản tin.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            <strong className="text-stone-200">Vercel</strong> – hạ tầng hosting và vận hành website.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            <strong className="text-stone-200">PayOS / ngân hàng</strong> – xử lý giao dịch thanh toán
            trực tuyến.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            <strong className="text-stone-200">Resend</strong> – gửi email xác nhận đơn hàng và bản tin.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            <strong className="text-stone-200">Đơn vị vận chuyển</strong> – chỉ nhận họ tên, số điện thoại
            và địa chỉ giao hàng.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          4. Thời gian lưu trữ
        </h2>
        <ul className="space-y-2 text-xs text-stone-300">
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Dữ liệu đơn hàng &amp; chứng từ thanh toán: lưu theo quy định kế toán – thuế hiện hành.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Dữ liệu bản tin: lưu tới khi bạn hủy đăng ký hoặc yêu cầu xóa.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Email liên hệ hỗ trợ: lưu tối đa 12 tháng kể từ lần tương tác cuối.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-amber-400" />
          5. Quyền của bạn theo Nghị định 13/2023/NĐ-CP
        </h2>
        <ul className="space-y-2 text-xs text-stone-300">
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Quyền được biết, được đồng ý và rút lại sự đồng ý.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Quyền truy cập, xem và yêu cầu chỉnh sửa dữ liệu cá nhân của mình.
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Quyền yêu cầu xóa dữ liệu (trừ dữ liệu buộc phải lưu theo quy định pháp luật).
          </li>
          <li className="p-3 rounded-xl bg-stone-900/60 border border-stone-800">
            Quyền hạn chế hoặc phản đối xử lý dữ liệu; quyền khiếu nại, tố cáo tới cơ quan có thẩm quyền.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-amber-400" />
          6. Cách yêu cầu xóa dữ liệu cá nhân
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          Bạn có thể yêu cầu xóa dữ liệu cá nhân bất cứ lúc nào bằng một trong các cách sau:
        </p>
        <ol className="space-y-3 text-xs text-stone-300">
          <li className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 leading-relaxed">
            <strong className="text-amber-200 block mb-1">Cách 1 – Tự hủy nhận bản tin:</strong>
            bấm link &quot;hủy đăng ký&quot; ở chân mỗi email Hương Quê gửi. Hệ thống sẽ dừng gửi bản tin
            ngay lập tức.
          </li>
          <li className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 leading-relaxed">
            <strong className="text-amber-200 block mb-1">Cách 2 – Gửi email yêu cầu xóa:</strong>
            gửi tới{' '}
            <a href="mailto:lienhe@huongque.vn" className="text-amber-300 hover:underline">
              lienhe@huongque.vn
            </a>{' '}
            với tiêu đề &quot;Yêu cầu xóa dữ liệu cá nhân&quot;, kèm email/số điện thoại đã dùng khi đặt
            hàng để chúng tôi định danh đúng chủ thể dữ liệu.
          </li>
          <li className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 leading-relaxed">
            <strong className="text-amber-200 block mb-1">Cách 3 – Gọi hotline:</strong>
            gọi <strong className="text-stone-200">0901 000 000</strong> (8h00 – 21h00 hằng ngày) và yêu
            cầu bộ phận chăm sóc khách hàng xóa dữ liệu cá nhân.
          </li>
        </ol>
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-700/40 text-xs text-amber-100 leading-relaxed">
          Thời hạn xử lý: Hương Quê xác nhận đã nhận yêu cầu trong vòng{' '}
          <strong>72 giờ làm việc</strong> và hoàn tất xóa dữ liệu trong tối đa{' '}
          <strong>15 ngày</strong> kể từ khi định danh được chủ thể dữ liệu. Dữ liệu hóa đơn, chứng từ
          thanh toán có thể được lưu tiếp theo nghĩa vụ pháp lý về kế toán – thuế.
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-400" />
          7. Bảo mật dữ liệu
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          Dữ liệu được truyền qua HTTPS/TLS, mật khẩu do Supabase Auth băm và không thể đọc ngược, quyền
          truy cập cơ sở dữ liệu được kiểm soát bằng Row Level Security. Chỉ nhân sự được phân quyền của
          Hương Quê mới truy cập được dữ liệu đơn hàng, và mọi truy cập quản trị đều yêu cầu xác thực.
        </p>
        <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 text-xs text-stone-300 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Nếu phát hiện dữ liệu cá nhân bị truy cập trái phép, Hương Quê sẽ thông báo cho cơ quan chức
            năng và tới bạn trong vòng 72 giờ kể từ khi phát hiện, theo quy định tại Nghị định 13/2023.
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-stone-900/70 border border-stone-800 p-6 space-y-2 text-xs text-stone-300">
        <h2 className="text-lg font-serif font-bold text-stone-100">Đơn vị kiểm soát dữ liệu</h2>
        <p>
          <strong className="text-stone-200">Công ty TNHH Thương mại Hương Quê</strong> – MST 0101234567
        </p>
        <p>Địa chỉ: Tầng 3, 128 Phố Cổ, Hoàn Kiếm, Hà Nội</p>
        <p>
          Hotline: 0901 000 000 – Email hỗ trợ:{' '}
          <a href="mailto:lienhe@huongque.vn" className="text-amber-300 hover:underline">
            lienhe@huongque.vn
          </a>
        </p>
        <p className="text-stone-500 pt-1">
          Xem thêm:{' '}
          <Link href="/chinh-sach-doi-tra" className="text-amber-300 hover:underline">
            Chính sách đổi trả
          </Link>{' '}
          ·{' '}
          <Link href="/van-chuyen" className="text-amber-300 hover:underline">
            Vận chuyển &amp; giao nhận
          </Link>{' '}
          ·{' '}
          <Link href="/faq" className="text-amber-300 hover:underline">
            Câu hỏi thường gặp
          </Link>
        </p>
      </section>
    </div>
  );
}
