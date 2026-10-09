import { listCouponsPaged } from '@/lib/actions/admin/data';
import { ADMIN_PAGE_SIZE, parseAdminPage } from '@/lib/actions/admin/pagination';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { CouponManager } from '@/components/admin/CouponManager';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { Alert, SectionTitle } from '@/components/admin/FormBits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Mã giảm giá – Quản trị Hương Quê' };

/** A06 – danh sách mã giảm giá có phân trang phía server (`?trang=2`). */
export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const params = await searchParams;
  const { data: page, error, needsServiceRole } = await listCouponsPaged(
    parseAdminPage(params.trang)
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        code="A06"
        title="Mã giảm giá"
        description="Giới hạn theo tổng lượt dùng. Mã đã phát sinh đơn chỉ được tắt, không sửa."
      />
      <ConfigNotice />
      {error && !needsServiceRole ? <Alert tone="error">{error}</Alert> : null}
      <CouponManager
        coupons={page.rows}
        totalCount={page.total}
        pagination={
          <AdminPagination
            page={page.page}
            totalItems={page.total}
            pageSize={ADMIN_PAGE_SIZE}
            basePath="/admin/ma-giam-gia"
            params={params}
            itemLabel="mã"
          />
        }
      />
    </div>
  );
}
