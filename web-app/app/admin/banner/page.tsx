import { listBannersPaged } from '@/lib/actions/admin/data';
import { ADMIN_PAGE_SIZE, parseAdminPage } from '@/lib/actions/admin/pagination';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { BannerManager } from '@/components/admin/BannerManager';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { Alert, SectionTitle } from '@/components/admin/FormBits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Banner – Quản trị Hương Quê' };

/** F11 – danh sách banner có phân trang phía server (`?trang=2`). */
export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const params = await searchParams;
  const { data: page, error, needsServiceRole } = await listBannersPaged(
    parseAdminPage(params.trang)
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        code="F11"
        title="Banner trang chủ"
        description="Banner đang bật và trong thời gian hiệu lực sẽ thay ảnh hero mặc định ở trang chủ."
      />
      <ConfigNotice />
      {error && !needsServiceRole ? <Alert tone="error">{error}</Alert> : null}
      <BannerManager
        banners={page.rows}
        totalCount={page.total}
        pagination={
          <AdminPagination
            page={page.page}
            totalItems={page.total}
            pageSize={ADMIN_PAGE_SIZE}
            basePath="/admin/banner"
            params={params}
            itemLabel="banner"
          />
        }
      />
    </div>
  );
}
