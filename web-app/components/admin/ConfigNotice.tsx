import { hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { Alert } from './FormBits';

/**
 * Thông báo cấu hình thiếu SUPABASE_SERVICE_ROLE_KEY.
 * Nhờ nó mà trang admin hiện hướng dẫn thay vì crash trắng trang.
 */
export function ConfigNotice() {
  if (hasSupabaseAdminConfig()) return null;

  return (
    <Alert tone="warning">
      <p className="font-semibold mb-1">Thiếu cấu hình quyền quản trị (service_role)</p>
      <p>
        Biến <code className="font-mono text-amber-300">SUPABASE_SERVICE_ROLE_KEY</code> chưa được
        cấu hình ở server. Các bảng đơn hàng / thanh toán / mã giảm giá không cấp quyền cho khách
        nên những mục này chỉ hiển thị được sau khi bạn thêm biến môi trường và tải lại trang.
        Riêng sản phẩm, danh mục và banner vẫn hoạt động nếu phiên đăng nhập của bạn là admin thật
        trên Supabase.
      </p>
    </Alert>
  );
}
