/* =====================================================================
   HƯƠNG QUÊ – CSDL WEBSTORE QUÀ TẾT & ĐẶC SẢN (SUPABASE / POSTGRESQL)
   Bảng: profiles, categories, products
   Tích hợp Supabase Auth (auth.users), RLS, Trigger tạo profile tự động,
   Hàm is_admin() và phân quyền an toàn.
   ===================================================================== */

-- 1. Extension tìm kiếm tiếng Việt không dấu (nếu cần)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. BẢNG PROFILES (Mở rộng từ auth.users của Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_profiles_role CHECK (role IN ('customer', 'admin'))
);

-- Bật RLS cho profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hàm kiểm tra xem user hiện tại có phải admin không (dùng SECURITY DEFINER để bypass RLS khi check role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS Policies cho profiles:
-- Khách / người dùng chỉ được xem profile của chính mình hoặc admin xem tất cả
CREATE POLICY "Users can view own profile or admin view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

-- Khách chỉ sửa được full_name, phone của chính mình (chặn sửa cột role bằng trigger hoặc update policy)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Trigger chặn user tự nâng role lên admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Nếu không phải admin mà thay đổi role thì báo lỗi
    IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Bạn không có quyền thay đổi vai trò tài khoản.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- Trigger tự động tạo profile khi user đăng ký trong Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        -- Có thể mặc định là customer, nếu email chỉ định là admin thì gán admin
        CASE 
            WHEN NEW.email = 'admin@huongque.vn' THEN 'admin'
            ELSE 'customer'
        END
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- 3. BẢNG CATEGORIES (Danh mục)
CREATE TABLE IF NOT EXISTS public.categories (
    category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(300),
    image_url VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể đọc danh mục đang hoạt động
CREATE POLICY "Public read active categories"
    ON public.categories FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

-- Chỉ admin được thêm/sửa/xóa danh mục
CREATE POLICY "Admin write categories"
    ON public.categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- 4. BẢNG PRODUCTS (Sản phẩm)
CREATE TABLE IF NOT EXISTS public.products (
    product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id INT NOT NULL REFERENCES public.categories(category_id),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    short_description VARCHAR(300),
    description TEXT,
    origin VARCHAR(100),
    producer VARCHAR(200),
    region VARCHAR(10) NOT NULL, -- bac | trung | nam | ba_mien
    unit VARCHAR(50) NOT NULL DEFAULT 'hộp',
    price INT NOT NULL,
    compare_at_price INT,
    stock INT NOT NULL DEFAULT 0,
    sold_count INT NOT NULL DEFAULT 0,
    rating_avg NUMERIC(2,1) NOT NULL DEFAULT 5.0,
    rating_count INT NOT NULL DEFAULT 0,
    thumbnail_url VARCHAR(500),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_products_region CHECK (region IN ('bac', 'trung', 'nam', 'ba_mien')),
    CONSTRAINT ck_products_price CHECK (price >= 0),
    CONSTRAINT ck_products_stock CHECK (stock >= 0)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Khách & customer chỉ đọc sản phẩm is_active = TRUE; Admin xem được tất cả
CREATE POLICY "Public read active products"
    ON public.products FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

-- Chỉ admin có quyền INSERT, UPDATE, DELETE sản phẩm (Customer bị từ chối)
CREATE POLICY "Admin write products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Index hỗ trợ tìm kiếm và lọc
CREATE INDEX IF NOT EXISTS idx_products_region ON public.products(region);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
