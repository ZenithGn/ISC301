import { notFound } from 'next/navigation';
import { getProductById, listCategoriesAdmin } from '@/lib/actions/admin/data';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { ProductForm } from '@/components/admin/ProductForm';
import { SectionTitle } from '@/components/admin/FormBits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Sửa sản phẩm – Quản trị Hương Quê' };

/** A03 – Form thêm mới (`/admin/san-pham/new`) hoặc sửa sản phẩm. */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === 'new';

  const productId = isNew ? null : Number(id);
  if (!isNew && (!Number.isInteger(productId) || (productId ?? 0) <= 0)) {
    notFound();
  }

  const [categories, product] = await Promise.all([
    listCategoriesAdmin(),
    productId ? getProductById(productId) : Promise.resolve(null),
  ]);

  if (!isNew && !product) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <SectionTitle
        code="A03"
        title={isNew ? 'Thêm sản phẩm mới' : `Sửa: ${product?.name ?? ''}`}
        description="Ảnh chỉ nhận jpg/png/webp ≤ 5MB; sản phẩm đã có đơn nên ẩn thay vì xóa."
      />
      <ConfigNotice />
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
