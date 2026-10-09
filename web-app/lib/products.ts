import { createClient } from './supabase/server';
import { Category, Product } from './types';
import { searchQuerySchema, SearchQueryParams } from './validations';

/**
 * Lấy danh mục sản phẩm (hoạt động) trực tiếp từ database Supabase
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) {
      console.error('Error fetching categories from Supabase:', error);
      return [];
    }

    return data as Category[];
  } catch (err) {
    console.error('getCategories exception:', err);
    return [];
  }
}

/**
 * Lấy các sản phẩm nổi bật cho trang chủ (is_featured = true & is_active = true) từ Supabase
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_featured', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error || !data) {
      console.error('Error fetching featured products from Supabase:', error);
      return [];
    }

    return data as Product[];
  } catch (err) {
    console.error('getFeaturedProducts exception:', err);
    return [];
  }
}

/**
 * Lấy danh sách sản phẩm bán chạy làm gợi ý khi không tìm thấy kết quả từ Supabase
 */
export async function getBestSellingProducts(limit: number = 4): Promise<Product[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('sold_count', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('Error fetching best selling products from Supabase:', error);
      return [];
    }

    return data as Product[];
  } catch (err) {
    console.error('getBestSellingProducts exception:', err);
    return [];
  }
}

/**
 * Lấy chi tiết sản phẩm theo slug từ Supabase
 * Khách chỉ xem được sản phẩm đang kích hoạt (is_active = true)
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Product;
  } catch (err) {
    console.error('getProductBySlug exception:', err);
    return null;
  }
}

/**
 * Lấy tất cả sản phẩm cho trang quản trị Admin từ Supabase
 */
export async function getAllProductsAdmin(): Promise<Product[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('product_id', { ascending: false });

    if (error || !data) {
      console.error('getAllProductsAdmin error:', error);
      return [];
    }

    return data as Product[];
  } catch (err) {
    console.error('getAllProductsAdmin exception:', err);
    return [];
  }
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Tìm kiếm và lọc sản phẩm (C02 & C03) trực tiếp trên Supabase Database
 * Hỗ trợ lọc theo từ khóa, miền, danh mục, khoảng giá, sắp xếp và phân trang 12 sản phẩm/trang
 */
export async function searchProducts(rawParams: Record<string, any>): Promise<ProductSearchResult> {
  const parsed = searchQuerySchema.safeParse(rawParams);
  const params: SearchQueryParams = parsed.success
    ? parsed.data
    : {
        q: '',
        mien: 'all',
        danh_muc: 'all',
        gia_min: undefined,
        gia_max: undefined,
        sort: 'newest',
        page: 1,
      };

  const pageSize = 12;
  const page = Math.max(1, params.page || 1);

  try {
    const supabase = await createClient();

    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_active', true);

    // 1. Lọc theo từ khóa tìm kiếm (q)
    if (params.q) {
      const q = params.q.trim();
      query = query.or(`name.ilike.%${q}%,short_description.ilike.%${q}%,origin.ilike.%${q}%`);
    }

    // 2. Lọc theo miền (Bắc / Trung / Nam / Ba miền)
    if (params.mien && params.mien !== 'all') {
      query = query.in('region', [params.mien, 'ba_mien']);
    }

    // 3. Lọc theo danh mục (danh_muc slug)
    if (params.danh_muc && params.danh_muc !== 'all') {
      const { data: cat } = await supabase
        .from('categories')
        .select('category_id')
        .eq('slug', params.danh_muc)
        .maybeSingle();

      if (cat) {
        query = query.eq('category_id', cat.category_id);
      } else {
        return {
          products: [],
          total: 0,
          page,
          pageSize,
          totalPages: 1,
        };
      }
    }

    // 4. Lọc theo khoảng giá
    if (params.gia_min !== undefined) {
      query = query.gte('price', params.gia_min);
    }
    if (params.gia_max !== undefined) {
      query = query.lte('price', params.gia_max);
    }

    // 5. Sắp xếp
    if (params.sort === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (params.sort === 'price-desc') {
      query = query.order('price', { ascending: false });
    } else if (params.sort === 'featured') {
      query = query
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      // newest mặc định
      query = query.order('created_at', { ascending: false });
    }

    // 6. Phân trang
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error || !data) {
      console.error('searchProducts query error:', error);
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    const total = count ?? data.length;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      products: data as Product[],
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error('searchProducts exception:', err);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }
}
