import { createClient } from './supabase/server';
import { Category, Product } from './types';
import { searchQuerySchema, SearchQueryParams } from './validations';
import { asNumber, asString } from './format';

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
export async function searchProducts(rawParams: Record<string, unknown>): Promise<ProductSearchResult> {
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

/* ------------------------------------------------------------------ */
/* F03 – Banner trang chủ (bảng `banners`, RLS public read)            */
/* ------------------------------------------------------------------ */

export interface Banner {
  banner_id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/**
 * Lấy banner đang hoạt động & còn trong thời gian hiệu lực, sắp xếp theo sort_order.
 * Nếu bảng rỗng / lỗi / RLS chặn thì trả về [] để trang chủ rơi về ảnh tĩnh.
 */
export async function getActiveBanners(): Promise<Banner[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data) {
      if (error) console.error('Error fetching banners from Supabase:', error.message);
      return [];
    }

    const now = Date.now();

    return (data as Record<string, unknown>[])
      .map((row): Banner | null => {
        const imageUrl = asString(row.image_url);
        if (!imageUrl) return null;

        const startsAt = asString(row.starts_at);
        const endsAt = asString(row.ends_at);
        const startMs = startsAt ? new Date(startsAt).getTime() : null;
        const endMs = endsAt ? new Date(endsAt).getTime() : null;

        if (startMs !== null && Number.isFinite(startMs) && startMs > now) return null;
        if (endMs !== null && Number.isFinite(endMs) && endMs < now) return null;

        return {
          banner_id: asNumber(row.banner_id, 0),
          title: asString(row.title),
          subtitle: asString(row.subtitle),
          image_url: imageUrl,
          link_url: asString(row.link_url),
          sort_order: asNumber(row.sort_order, 0),
          is_active: row.is_active !== false,
          starts_at: startsAt,
          ends_at: endsAt,
        };
      })
      .filter((banner): banner is Banner => banner !== null);
  } catch (err) {
    console.error('getActiveBanners exception:', err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* C04 – Thư viện ảnh, đánh giá, mua kèm, nâng cấp                     */
/* ------------------------------------------------------------------ */

export interface ProductReview {
  review_id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string;
  created_at: string | null;
}

export interface CrossSellProduct {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string | null;
  times_bought_together: number;
}

export interface UpsellProduct {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  thumbnail_url: string | null;
  price_difference: number;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function pickNumber(row: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Bảng `product_images` chưa được chốt schema ⇒ đọc phòng thủ, lỗi thì trả []. */
export async function getProductImages(productId: number): Promise<string[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from('product_images').select('*').eq('product_id', productId);

    if (error || !data) return [];

    const rows = data as Record<string, unknown>[];

    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const orderA = pickNumber(a.row, ['sort_order', 'display_order', 'position'], a.index);
        const orderB = pickNumber(b.row, ['sort_order', 'display_order', 'position'], b.index);
        return orderA - orderB;
      })
      .map(({ row }) => pickString(row, ['image_url', 'url', 'image', 'src', 'path']))
      .filter((url): url is string => Boolean(url));
  } catch (err) {
    console.error('getProductImages exception:', err);
    return [];
  }
}

/** Đánh giá sản phẩm qua RPC `product_reviews(p_product_id, p_limit)`. */
export async function getProductReviews(productId: number, limit = 10): Promise<ProductReview[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('product_reviews', {
      p_product_id: productId,
      p_limit: limit,
    });

    if (error || !data) {
      if (error) console.error('product_reviews RPC error:', error.message);
      return [];
    }

    const rows: unknown[] = Array.isArray(data) ? data : [data];

    return rows.map((raw, index) => {
      const row = toRecord(raw);
      const rating = pickNumber(row, ['rating', 'rating_value', 'stars', 'score'], 5);
      return {
        review_id: String(row.review_id ?? row.id ?? `review-${index}`),
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        comment: pickString(row, ['comment', 'content', 'body', 'review_text', 'note', 'text']),
        reviewer_name:
          pickString(row, [
            'reviewer_name',
            'customer_name',
            'full_name',
            'user_name',
            'display_name',
            'profile_name',
          ]) ?? 'Khách hàng Hương Quê',
        created_at: pickString(row, ['created_at', 'reviewed_at', 'created_date', 'date']),
      };
    });
  } catch (err) {
    console.error('getProductReviews exception:', err);
    return [];
  }
}

/** "Thường mua kèm" qua RPC `product_cross_sell(p_product_id)`. */
export async function getCrossSellProducts(productId: number): Promise<CrossSellProduct[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('product_cross_sell', { p_product_id: productId });

    if (error || !data) {
      if (error) console.error('product_cross_sell RPC error:', error.message);
      return [];
    }

    const rows: unknown[] = Array.isArray(data) ? data : [data];

    return rows
      .map((raw): CrossSellProduct | null => {
        const row = toRecord(raw);
        const id = pickNumber(row, ['product_id', 'id'], Number.NaN);
        const slug = pickString(row, ['slug']);
        const name = pickString(row, ['name', 'product_name']);
        if (!Number.isFinite(id) || !slug || !name) return null;

        return {
          product_id: id,
          name,
          slug,
          price: pickNumber(row, ['price'], 0),
          thumbnail_url: pickString(row, ['thumbnail_url', 'image_url']),
          times_bought_together: pickNumber(row, ['times_bought_together', 'times_bought', 'count'], 0),
        };
      })
      .filter((item): item is CrossSellProduct => item !== null);
  } catch (err) {
    console.error('getCrossSellProducts exception:', err);
    return [];
  }
}

/** "Nâng cấp hộp quà" qua RPC `product_upsell(p_product_id)`. */
export async function getUpsellProducts(productId: number): Promise<UpsellProduct[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('product_upsell', { p_product_id: productId });

    if (error || !data) {
      if (error) console.error('product_upsell RPC error:', error.message);
      return [];
    }

    const rows: unknown[] = Array.isArray(data) ? data : [data];

    return rows
      .map((raw): UpsellProduct | null => {
        const row = toRecord(raw);
        const id = pickNumber(row, ['product_id', 'id'], Number.NaN);
        const slug = pickString(row, ['slug']);
        const name = pickString(row, ['name', 'product_name']);
        if (!Number.isFinite(id) || !slug || !name) return null;

        return {
          product_id: id,
          name,
          slug,
          price: pickNumber(row, ['price'], 0),
          thumbnail_url: pickString(row, ['thumbnail_url', 'image_url']),
          price_difference: pickNumber(row, ['price_difference', 'difference', 'price_gap'], 0),
        };
      })
      .filter((item): item is UpsellProduct => item !== null);
  } catch (err) {
    console.error('getUpsellProducts exception:', err);
    return [];
  }
}

/** Fallback "Thường mua kèm": sản phẩm cùng danh mục khi RPC cross-sell rỗng. */
export async function getProductsByCategory(
  categoryId: number,
  excludeProductId?: number,
  limit = 4
): Promise<Product[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .eq('category_id', categoryId)
      .order('sold_count', { ascending: false });

    if (excludeProductId) {
      query = query.neq('product_id', excludeProductId);
    }

    const { data, error } = await query.limit(limit);

    if (error || !data) {
      if (error) console.error('getProductsByCategory error:', error.message);
      return [];
    }

    return data as Product[];
  } catch (err) {
    console.error('getProductsByCategory exception:', err);
    return [];
  }
}
