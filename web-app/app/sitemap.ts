import type { MetadataRoute } from 'next';
import { createPublicClient } from '@/lib/supabase/public';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Làm mới sitemap mỗi 6 giờ (sản phẩm/danh mục thay đổi không cần rebuild). */
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = (
    [
      { url: `${APP_URL}/`, changeFrequency: 'daily', priority: 1 },
      { url: `${APP_URL}/san-pham`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${APP_URL}/tim-kiem`, changeFrequency: 'weekly', priority: 0.5 },
      { url: `${APP_URL}/tra-cuu-don`, changeFrequency: 'monthly', priority: 0.4 },
      { url: `${APP_URL}/faq`, changeFrequency: 'monthly', priority: 0.4 },
      { url: `${APP_URL}/chinh-sach-doi-tra`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${APP_URL}/chinh-sach-bao-mat`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${APP_URL}/van-chuyen`, changeFrequency: 'monthly', priority: 0.3 },
    ] as const
  ).map((entry) => ({ ...entry, lastModified: new Date() }));

  try {
    // Client công khai (không cookie) để sitemap render TĨNH được, không bị
    // đánh dấu dynamic chỉ vì `cookies()`.
    const supabase = createPublicClient();

    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('is_active', true).limit(1000),
      supabase.from('categories').select('slug, created_at').eq('is_active', true).limit(200),
    ]);

    const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
      url: `${APP_URL}/san-pham/${product.slug}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((category) => ({
      url: `${APP_URL}/san-pham?danh_muc=${category.slug}`,
      lastModified: category.created_at ? new Date(category.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    // Không có mạng/DB lỗi thì vẫn phải trả về sitemap tĩnh để không sập build.
    console.error('[sitemap] Không lấy được sản phẩm/danh mục:', error);
    return staticRoutes;
  }
}
