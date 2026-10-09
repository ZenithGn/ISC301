export interface Category {
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface Product {
  product_id: number;
  category_id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  origin: string | null;
  producer: string | null;
  region: 'bac' | 'trung' | 'nam' | 'ba_mien';
  unit: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sold_count: number;
  rating_avg: number;
  rating_count: number;
  thumbnail_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  category?: Category;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  /** Địa chỉ giao hàng mặc định (cột `profiles.default_address`). */
  default_address?: string | null;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}
