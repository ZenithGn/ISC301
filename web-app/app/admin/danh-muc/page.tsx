import { listCategoriesAdmin } from '@/lib/actions/admin/data';
import {
  ADMIN_PAGE_SIZE,
  paginateAdmin,
  parseAdminPage,
} from '@/lib/actions/admin/pagination';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { SectionTitle } from '@/components/admin/FormBits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Danh mục – Quản trị Hương Quê' };

/** A04 – danh mục có phân trang phía server (`?trang=2`). */
export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const params = await searchParams;
  const categories = await listCategoriesAdmin();
  const page = paginateAdmin(categories, parseAdminPage(params.trang), ADMIN_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <SectionTitle
        code="A04"
        title="Quản lý danh mục"
        description={`Thêm, sửa, sắp xếp và xóa danh mục (trang ${page.page}/${page.totalPages}). Không thể xóa danh mục đang còn sản phẩm.`}
      />
      <ConfigNotice />
      <CategoryManager
        categories={page.rows}
        totalCount={page.total}
        pagination={
          <AdminPagination
            page={page.page}
            totalItems={page.total}
            pageSize={ADMIN_PAGE_SIZE}
            basePath="/admin/danh-muc"
            params={params}
            itemLabel="danh mục"
          />
        }
      />
    </div>
  );
}
