/* =====================================================================
   HƯƠNG QUÊ – DATABASE ĐẦY ĐỦ CHO SUPABASE (bản viết lại)
   Thanh toán: COD và PayOS. Đã bỏ hoàn toàn VNPay và chuyển khoản thủ công.

   Cách chạy:
     1. Dùng project Supabase MỚI (khuyến nghị), hoặc chạy khối RESET ở cuối file nếu là DB thử.
     2. Chạy file này trong SQL Editor.
     3. Chạy huongque_seed_full.sql.

   Mục lục:
     A. Extension và sequence
     B. Bảng: profiles, categories, products, product_images, coupons, banners,
              cart_items, orders, order_items, order_status_history, payments,
              reviews, newsletter_subscribers
     C. Trigger
     D. Hàm: giỏ hàng, đặt hàng, PayOS, trạng thái đơn, tìm kiếm, đánh giá,
             bản tin, thống kê admin
     E. RLS
     F. Quyền EXECUTE và quyền bảng
     G. Storage (bucket ảnh sản phẩm)
   ===================================================================== */

/* ---------------------------------------------------------------------
   A. EXTENSION VÀ SEQUENCE
   --------------------------------------------------------------------- */
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Mã đơn số nguyên gửi cho PayOS (orderCode phải là số nguyên dương, duy nhất)
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START 100000001;

/* ---------------------------------------------------------------------
   B. BẢNG
   --------------------------------------------------------------------- */

-- B1. Hồ sơ người dùng, mở rộng auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email            VARCHAR(255) NOT NULL,
    full_name        VARCHAR(100) NOT NULL DEFAULT '',
    phone            VARCHAR(10),
    default_address  VARCHAR(300),
    role             VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_profiles_role  CHECK (role IN ('customer', 'admin')),
    CONSTRAINT ck_profiles_phone CHECK (phone IS NULL OR phone ~ '^0[0-9]{9}$')
);

-- B2. Danh mục
CREATE TABLE IF NOT EXISTS public.categories (
    category_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    slug         VARCHAR(120) NOT NULL UNIQUE,
    description  VARCHAR(300),
    image_url    VARCHAR(500),
    sort_order   INT NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_categories_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- B3. Sản phẩm
CREATE TABLE IF NOT EXISTS public.products (
    product_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id        INT NOT NULL REFERENCES public.categories(category_id),
    name               VARCHAR(200) NOT NULL,
    slug               VARCHAR(220) NOT NULL UNIQUE,
    short_description  VARCHAR(300),
    description        TEXT,
    origin             VARCHAR(100),
    producer           VARCHAR(200),
    region             VARCHAR(10) NOT NULL,              -- bac | trung | nam | ba_mien
    unit               VARCHAR(50) NOT NULL DEFAULT 'hộp',
    price              INT NOT NULL,
    compare_at_price   INT,
    stock              INT NOT NULL DEFAULT 0,
    sold_count         INT NOT NULL DEFAULT 0,
    rating_avg         NUMERIC(2,1) NOT NULL DEFAULT 0,
    rating_count       INT NOT NULL DEFAULT 0,
    thumbnail_url      VARCHAR(500),
    is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_products_slug    CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT ck_products_region  CHECK (region IN ('bac', 'trung', 'nam', 'ba_mien')),
    CONSTRAINT ck_products_price   CHECK (price >= 0),
    CONSTRAINT ck_products_compare CHECK (compare_at_price IS NULL OR compare_at_price > price),
    CONSTRAINT ck_products_stock   CHECK (stock >= 0),
    CONSTRAINT ck_products_sold    CHECK (sold_count >= 0),
    CONSTRAINT ck_products_rating  CHECK (rating_avg BETWEEN 0 AND 5 AND rating_count >= 0)
);

-- B4. Ảnh gallery sản phẩm
CREATE TABLE IF NOT EXISTS public.product_images (
    image_id    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  INT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0
);

-- B5. Mã giảm giá
CREATE TABLE IF NOT EXISTS public.coupons (
    coupon_id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code              VARCHAR(30) NOT NULL UNIQUE,
    description       VARCHAR(200),
    discount_type     VARCHAR(10) NOT NULL,              -- percent | fixed
    discount_value    INT NOT NULL,
    max_discount      INT,
    min_order_amount  INT NOT NULL DEFAULT 0,
    usage_limit       INT,                               -- NULL = không giới hạn
    used_count        INT NOT NULL DEFAULT 0,
    starts_at         TIMESTAMPTZ NOT NULL,
    ends_at           TIMESTAMPTZ NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_coupons_code   CHECK (code ~ '^[A-Z0-9]+$'),
    CONSTRAINT ck_coupons_type   CHECK (discount_type IN ('percent', 'fixed')),
    CONSTRAINT ck_coupons_value  CHECK (discount_value > 0 AND (discount_type <> 'percent' OR discount_value <= 100)),
    CONSTRAINT ck_coupons_max    CHECK (max_discount IS NULL OR max_discount > 0),
    CONSTRAINT ck_coupons_usage  CHECK (used_count >= 0 AND (usage_limit IS NULL OR used_count <= usage_limit)),
    CONSTRAINT ck_coupons_period CHECK (ends_at > starts_at)
);

-- B6. Banner trang chủ
CREATE TABLE IF NOT EXISTS public.banners (
    banner_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    subtitle    VARCHAR(300),
    image_url   VARCHAR(500) NOT NULL,
    link_url    VARCHAR(500),
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- B7. Giỏ hàng. cart_key = 'u:<uid>' hoặc 's:<session_id>'. Không có policy: chỉ hàm đọc/ghi.
CREATE TABLE IF NOT EXISTS public.cart_items (
    cart_key    TEXT NOT NULL,
    product_id  INT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
    quantity    INT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (cart_key, product_id),
    CONSTRAINT ck_cart_quantity CHECK (quantity BETWEEN 1 AND 100)
);

-- B8. Đơn hàng
CREATE TABLE IF NOT EXISTS public.orders (
    order_id              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_code            VARCHAR(20) NOT NULL UNIQUE,            -- HQ + yymmdd + 4 số (hiển thị cho khách)
    payos_order_code      BIGINT UNIQUE DEFAULT nextval('public.payos_order_code_seq'),  -- orderCode gửi PayOS
    payos_payment_link_id TEXT,
    payos_checkout_url    TEXT,
    user_id               UUID REFERENCES public.profiles(id),    -- NULL = khách vãng lai
    customer_email        VARCHAR(255) NOT NULL,
    coupon_id             INT REFERENCES public.coupons(coupon_id),
    recipient_name        VARCHAR(100) NOT NULL,
    recipient_phone       VARCHAR(10) NOT NULL,
    province              VARCHAR(100) NOT NULL,
    shipping_address      VARCHAR(300) NOT NULL,
    note                  VARCHAR(500),
    gift_message          VARCHAR(300),
    subtotal              INT NOT NULL,
    discount_amount       INT NOT NULL DEFAULT 0,
    shipping_fee          INT NOT NULL DEFAULT 0,
    total                 INT NOT NULL,
    payment_method        VARCHAR(20) NOT NULL,                   -- cod | payos
    payment_status        VARCHAR(10) NOT NULL DEFAULT 'unpaid',  -- unpaid | paid | refunded
    status                VARCHAR(20) NOT NULL,
    expires_at            TIMESTAMPTZ,
    paid_at               TIMESTAMPTZ,
    completed_at          TIMESTAMPTZ,
    cancelled_at          TIMESTAMPTZ,
    cancel_reason         VARCHAR(300),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_orders_phone          CHECK (recipient_phone ~ '^0[0-9]{9}$'),
    CONSTRAINT ck_orders_amounts        CHECK (subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0
                                               AND discount_amount <= subtotal
                                               AND total = subtotal - discount_amount + shipping_fee),
    CONSTRAINT ck_orders_payment_method CHECK (payment_method IN ('cod', 'payos')),
    CONSTRAINT ck_orders_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    CONSTRAINT ck_orders_status         CHECK (status IN ('pending_payment', 'confirmed', 'shipping', 'completed', 'cancelled')),
    CONSTRAINT ck_orders_cod_not_pending CHECK (payment_method <> 'cod' OR status <> 'pending_payment'),
    CONSTRAINT ck_orders_pending_expiry CHECK (status <> 'pending_payment' OR expires_at IS NOT NULL),
    CONSTRAINT ck_orders_paid_time      CHECK (payment_status = 'unpaid' OR paid_at IS NOT NULL),
    CONSTRAINT ck_orders_completed_time CHECK (status <> 'completed' OR completed_at IS NOT NULL),
    CONSTRAINT ck_orders_cancelled_time CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_orders_user        ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON public.orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_pending_exp ON public.orders(expires_at) WHERE status = 'pending_payment';
CREATE INDEX IF NOT EXISTS idx_orders_phone       ON public.orders(recipient_phone);

-- B9. Chi tiết đơn (giá và tên được chụp lại lúc đặt)
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_id     INT NOT NULL REFERENCES public.products(product_id),
    product_name   VARCHAR(200) NOT NULL,
    unit_price     INT NOT NULL,
    quantity       INT NOT NULL,
    line_total     INT GENERATED ALWAYS AS (unit_price * quantity) STORED,
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id),
    CONSTRAINT ck_order_items_price    CHECK (unit_price >= 0),
    CONSTRAINT ck_order_items_quantity CHECK (quantity BETWEEN 1 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- B10. Lịch sử trạng thái đơn
CREATE TABLE IF NOT EXISTS public.order_status_history (
    history_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    from_status  VARCHAR(20),
    to_status    VARCHAR(20) NOT NULL,
    changed_by   UUID REFERENCES public.profiles(id),   -- NULL = hệ thống / PayOS / khách vãng lai
    note         VARCHAR(300),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history(order_id, changed_at);

-- B11. Nhật ký thanh toán PayOS (kể cả sai số tiền, để đối soát)
CREATE TABLE IF NOT EXISTS public.payments (
    payment_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES public.orders(order_id),
    provider        VARCHAR(20) NOT NULL DEFAULT 'payos',
    amount          BIGINT NOT NULL,
    transaction_no  VARCHAR(100),                       -- reference của giao dịch ngân hàng
    is_success      BOOLEAN NOT NULL,
    raw_data        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
-- Một giao dịch thành công chỉ được ghi một lần (PayOS gửi webhook lặp)
CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_transaction
    ON public.payments(provider, transaction_no)
    WHERE transaction_no IS NOT NULL AND is_success;

-- B12. Đánh giá sản phẩm
CREATE TABLE IF NOT EXISTS public.reviews (
    review_id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id),
    product_id  INT NOT NULL REFERENCES public.products(product_id),
    order_id    INT NOT NULL REFERENCES public.orders(order_id),
    rating      SMALLINT NOT NULL,
    comment     VARCHAR(500),
    is_hidden   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id),
    CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id, created_at DESC) WHERE NOT is_hidden;

-- B13. Bản tin khuyến mãi (có bằng chứng đồng ý và token hủy đăng ký)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    subscriber_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email              VARCHAR(255) NOT NULL UNIQUE,
    consented_at       TIMESTAMPTZ NOT NULL,
    unsubscribed_at    TIMESTAMPTZ,
    unsubscribe_token  UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT ck_newsletter_email CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Bật RLS cho mọi bảng trong public
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

/* ---------------------------------------------------------------------
   C. HÀM PHỤ TRỢ, TRIGGER
   --------------------------------------------------------------------- */

-- Kiểm tra admin. SECURITY DEFINER để không bị RLS của profiles chặn.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

-- Tạo profile khi đăng ký. KHÔNG nhận role từ metadata: role luôn là 'customer'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phone TEXT := NEW.raw_user_meta_data->>'phone';
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        CASE WHEN v_phone ~ '^0[0-9]{9}$' THEN v_phone ELSE NULL END,
        'customer'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Chặn người dùng tự nâng role. auth.uid() IS NULL = SQL Editor / service_role (đáng tin).
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.uid() IS NOT NULL
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Bạn không có quyền thay đổi vai trò tài khoản.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role ON public.profiles;
CREATE TRIGGER trg_profiles_role BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cập nhật rating_avg và rating_count khi đánh giá thay đổi
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pid INT;
BEGIN
    IF TG_OP = 'DELETE' THEN v_pid := OLD.product_id; ELSE v_pid := NEW.product_id; END IF;

    UPDATE public.products p
    SET rating_count = (SELECT COUNT(*)::INT FROM public.reviews r
                        WHERE r.product_id = v_pid AND NOT r.is_hidden),
        rating_avg   = COALESCE((SELECT ROUND(AVG(r.rating)::NUMERIC, 1) FROM public.reviews r
                                 WHERE r.product_id = v_pid AND NOT r.is_hidden), 0)
    WHERE p.product_id = v_pid;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_rating ON public.reviews;
CREATE TRIGGER trg_reviews_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

/* ---------------------------------------------------------------------
   D. HÀM NGHIỆP VỤ
   Quy tắc chung:
   - Hàm SECURITY DEFINER luôn có SET search_path.
   - Giá, tồn kho, mã giảm giá, phí ship do database tính; client không gửi giá.
   - Hàm dành cho service_role (PayOS webhook, cron) không cấp cho anon/authenticated.
   --------------------------------------------------------------------- */

-- D1. Phí vận chuyển: 30.000đ, miễn phí từ 500.000đ
CREATE OR REPLACE FUNCTION public.fn_shipping_fee(p_subtotal INT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE WHEN p_subtotal >= 500000 THEN 0 ELSE 30000 END
$$;

-- D2. Kiểm tra mã giảm giá (luôn trả đúng một dòng)
CREATE OR REPLACE FUNCTION public.fn_check_coupon(p_code TEXT, p_subtotal INT)
RETURNS TABLE (coupon_id INT, is_valid BOOLEAN, discount_amount INT, message TEXT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    c        public.coupons%ROWTYPE;
    v_found  BOOLEAN;
    v_msg    TEXT;
    v_amount BIGINT := 0;
    v_now    TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO c FROM public.coupons WHERE code = UPPER(BTRIM(p_code));
    v_found := FOUND;

    IF NOT v_found THEN
        v_msg := 'Mã giảm giá không tồn tại';
    ELSIF NOT c.is_active THEN
        v_msg := 'Mã giảm giá đã ngừng áp dụng';
    ELSIF v_now < c.starts_at THEN
        v_msg := 'Mã giảm giá chưa đến thời gian áp dụng';
    ELSIF v_now > c.ends_at THEN
        v_msg := 'Mã giảm giá đã hết hạn';
    ELSIF c.usage_limit IS NOT NULL AND c.used_count >= c.usage_limit THEN
        v_msg := 'Mã giảm giá đã hết lượt sử dụng';
    ELSIF p_subtotal < c.min_order_amount THEN
        v_msg := 'Đơn hàng cần tối thiểu '
                 || REPLACE(TO_CHAR(c.min_order_amount, 'FM999,999,999'), ',', '.')
                 || 'đ để dùng mã này';
    END IF;

    IF v_found AND v_msg IS NULL THEN
        IF c.discount_type = 'percent' THEN
            v_amount := LEAST(p_subtotal::BIGINT * c.discount_value / 100,
                              COALESCE(c.max_discount, p_subtotal)::BIGINT,
                              p_subtotal::BIGINT);
        ELSE
            v_amount := LEAST(c.discount_value::BIGINT, p_subtotal::BIGINT);
        END IF;
    END IF;

    RETURN QUERY SELECT
        CASE WHEN v_found THEN c.coupon_id END,
        (v_msg IS NULL),
        CASE WHEN v_msg IS NULL THEN v_amount::INT ELSE 0 END,
        COALESCE(v_msg, 'Áp dụng mã giảm giá thành công');
END;
$$;

-- D3. Khóa giỏ hàng
CREATE OR REPLACE FUNCTION public.fn_cart_key(p_session_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        RETURN 'u:' || auth.uid()::TEXT;
    END IF;
    IF p_session_id IS NULL THEN
        RAISE EXCEPTION 'Thiếu mã phiên giỏ hàng';
    END IF;
    RETURN 's:' || p_session_id::TEXT;
END;
$$;

-- D4. Trả tồn kho và lượt mã khi đơn bị hủy (chỉ gọi từ hàm khác)
CREATE OR REPLACE FUNCTION public.fn_release_order(p_order_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.products p
    SET stock = p.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.product_id = p.product_id AND oi.order_id = p_order_id;

    UPDATE public.coupons c
    SET used_count = c.used_count - 1
    FROM public.orders o
    WHERE o.coupon_id = c.coupon_id AND o.order_id = p_order_id AND c.used_count > 0;
END;
$$;

-- D5. Giỏ hàng
CREATE OR REPLACE FUNCTION public.cart_add(p_session_id UUID, p_product_id INT, p_quantity INT DEFAULT 1)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key      TEXT := public.fn_cart_key(p_session_id);
    v_stock    INT;
    v_active   BOOLEAN;
    v_existing INT;
BEGIN
    IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Số lượng phải từ 1 đến 100';
    END IF;

    SELECT pr.stock, pr.is_active INTO v_stock, v_active
    FROM public.products pr WHERE pr.product_id = p_product_id;
    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'Sản phẩm không tồn tại hoặc đã ngừng bán';
    END IF;

    SELECT COALESCE((SELECT ci.quantity FROM public.cart_items ci
                     WHERE ci.cart_key = v_key AND ci.product_id = p_product_id), 0)
    INTO v_existing;

    IF v_existing + p_quantity > LEAST(v_stock, 100) THEN
        RAISE EXCEPTION 'Số lượng vượt quá tồn kho (còn %)', v_stock;
    END IF;

    INSERT INTO public.cart_items (cart_key, product_id, quantity, updated_at)
    VALUES (v_key, p_product_id, p_quantity, timezone('utc', now()))
    ON CONFLICT (cart_key, product_id)
    DO UPDATE SET quantity = public.cart_items.quantity + EXCLUDED.quantity,
                  updated_at = timezone('utc', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.cart_set_quantity(p_session_id UUID, p_product_id INT, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key    TEXT := public.fn_cart_key(p_session_id);
    v_stock  INT;
    v_active BOOLEAN;
BEGIN
    IF p_quantity IS NULL OR p_quantity < 0 OR p_quantity > 100 THEN
        RAISE EXCEPTION 'Số lượng phải từ 0 đến 100';
    END IF;

    IF p_quantity = 0 THEN
        DELETE FROM public.cart_items WHERE cart_key = v_key AND product_id = p_product_id;
        RETURN;
    END IF;

    SELECT pr.stock, pr.is_active INTO v_stock, v_active
    FROM public.products pr WHERE pr.product_id = p_product_id;
    IF NOT FOUND OR NOT v_active THEN
        RAISE EXCEPTION 'Sản phẩm không tồn tại hoặc đã ngừng bán';
    END IF;
    IF p_quantity > LEAST(v_stock, 100) THEN
        RAISE EXCEPTION 'Số lượng vượt quá tồn kho (còn %)', v_stock;
    END IF;

    INSERT INTO public.cart_items (cart_key, product_id, quantity, updated_at)
    VALUES (v_key, p_product_id, p_quantity, timezone('utc', now()))
    ON CONFLICT (cart_key, product_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = timezone('utc', now());
END;
$$;

-- Gộp giỏ khách vào giỏ tài khoản sau khi đăng nhập
CREATE OR REPLACE FUNCTION public.cart_merge_guest(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL OR p_session_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.cart_items (cart_key, product_id, quantity, updated_at)
    SELECT 'u:' || v_uid::TEXT, g.product_id, LEAST(g.quantity, 100), timezone('utc', now())
    FROM public.cart_items g
    WHERE g.cart_key = 's:' || p_session_id::TEXT
    ON CONFLICT (cart_key, product_id)
    DO UPDATE SET quantity = LEAST(public.cart_items.quantity + EXCLUDED.quantity, 100),
                  updated_at = timezone('utc', now());

    DELETE FROM public.cart_items WHERE cart_key = 's:' || p_session_id::TEXT;
END;
$$;

-- Giỏ hàng và tổng tiền (C05, C06). Trả JSON.
CREATE OR REPLACE FUNCTION public.get_cart(p_session_id UUID, p_coupon_code TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key      TEXT := public.fn_cart_key(p_session_id);
    v_items    JSONB;
    v_subtotal INT := 0;
    v_discount INT := 0;
    v_ship     INT;
    v_valid    BOOLEAN;
    v_msg      TEXT;
    v_coupon   JSONB := NULL;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'product_id', pr.product_id,
               'name', pr.name,
               'slug', pr.slug,
               'thumbnail_url', pr.thumbnail_url,
               'unit_price', pr.price,
               'quantity', ci.quantity,
               'stock', pr.stock,
               'available', (pr.is_active AND ci.quantity <= pr.stock),
               'line_total', pr.price::BIGINT * ci.quantity)
           ORDER BY ci.updated_at), '[]'::JSONB)
    INTO v_items
    FROM public.cart_items ci
    JOIN public.products pr ON pr.product_id = ci.product_id
    WHERE ci.cart_key = v_key;

    SELECT COALESCE(SUM(pr.price * ci.quantity), 0)::INT INTO v_subtotal
    FROM public.cart_items ci
    JOIN public.products pr ON pr.product_id = ci.product_id
    WHERE ci.cart_key = v_key AND pr.is_active AND ci.quantity <= pr.stock;

    IF NULLIF(BTRIM(p_coupon_code), '') IS NOT NULL THEN
        SELECT f.is_valid, f.discount_amount, f.message INTO v_valid, v_discount, v_msg
        FROM public.fn_check_coupon(p_coupon_code, v_subtotal) f;
        v_coupon := jsonb_build_object('code', UPPER(BTRIM(p_coupon_code)),
                                       'valid', v_valid, 'message', v_msg);
    END IF;

    v_ship := CASE WHEN v_subtotal = 0 THEN 0 ELSE public.fn_shipping_fee(v_subtotal) END;

    RETURN jsonb_build_object(
        'items', v_items,
        'subtotal', v_subtotal,
        'discount_amount', v_discount,
        'shipping_fee', v_ship,
        'total', v_subtotal - v_discount + v_ship,
        'free_shipping_from', 500000,
        'coupon', v_coupon);
END;
$$;

-- D6. Đặt hàng. Lấy hàng từ giỏ trong database.
--     COD: status = confirmed ngay.
--     PayOS: status = pending_payment, hết hạn sau 15 phút. Xác nhận khi có webhook.
CREATE OR REPLACE FUNCTION public.place_order(
    p_session_id        UUID,
    p_recipient_name    TEXT,
    p_recipient_phone   TEXT,
    p_customer_email    TEXT,
    p_province          TEXT,
    p_shipping_address  TEXT,
    p_payment_method    TEXT,
    p_coupon_code       TEXT DEFAULT NULL,
    p_note              TEXT DEFAULT NULL,
    p_gift_message      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_uid          UUID := auth.uid();
    v_key          TEXT := public.fn_cart_key(p_session_id);
    v_email        TEXT;
    v_now          TIMESTAMPTZ := now();
    v_subtotal     INT := 0;
    v_discount     INT := 0;
    v_ship         INT;
    v_total        INT;
    v_coupon_id    INT;
    v_valid        BOOLEAN;
    v_msg          TEXT;
    v_rows         INT;
    v_stock_msg    TEXT;
    v_status       TEXT;
    v_expires      TIMESTAMPTZ;
    v_order_id     INT;
    v_payos_code   BIGINT;
    v_code         TEXT;
    v_try          INT := 0;
    v_cart_count   INT;
    v_line_count   INT;
BEGIN
    IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'payos') THEN
        RAISE EXCEPTION 'Phương thức thanh toán không hợp lệ';
    END IF;
    IF NULLIF(BTRIM(p_recipient_name), '') IS NULL THEN
        RAISE EXCEPTION 'Vui lòng nhập họ tên người nhận';
    END IF;
    IF p_recipient_phone IS NULL OR p_recipient_phone !~ '^0[0-9]{9}$' THEN
        RAISE EXCEPTION 'Số điện thoại không hợp lệ';
    END IF;
    IF NULLIF(BTRIM(p_province), '') IS NULL OR NULLIF(BTRIM(p_shipping_address), '') IS NULL THEN
        RAISE EXCEPTION 'Vui lòng nhập địa chỉ nhận hàng';
    END IF;

    IF v_uid IS NOT NULL THEN
        SELECT pf.email INTO v_email FROM public.profiles pf WHERE pf.id = v_uid;
    ELSE
        v_email := LOWER(BTRIM(p_customer_email));
        IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
            RAISE EXCEPTION 'Email không hợp lệ';
        END IF;
    END IF;

    -- Khóa dòng sản phẩm để hai khách không mua vượt tồn kho cùng lúc
    DROP TABLE IF EXISTS tmp_order_lines;
    CREATE TEMP TABLE tmp_order_lines (
        product_id   INT PRIMARY KEY,
        product_name TEXT,
        unit_price   INT,
        quantity     INT,
        stock        INT
    ) ON COMMIT DROP;

    INSERT INTO tmp_order_lines (product_id, product_name, unit_price, quantity, stock)
    SELECT pr.product_id, pr.name::TEXT, pr.price, ci.quantity, pr.stock
    FROM public.cart_items ci
    JOIN public.products pr ON pr.product_id = ci.product_id
    WHERE ci.cart_key = v_key AND pr.is_active
    ORDER BY pr.product_id
    FOR UPDATE OF pr;

    SELECT COUNT(*) INTO v_cart_count FROM public.cart_items WHERE cart_key = v_key;
    SELECT COUNT(*) INTO v_line_count FROM tmp_order_lines;

    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'Giỏ hàng đang trống';
    END IF;
    IF v_cart_count <> v_line_count THEN
        RAISE EXCEPTION 'Có sản phẩm đã ngừng bán trong giỏ, vui lòng cập nhật giỏ hàng';
    END IF;

    SELECT 'Sản phẩm "' || l.product_name || '" chỉ còn ' || l.stock || ' trong kho'
    INTO v_stock_msg
    FROM tmp_order_lines l WHERE l.stock < l.quantity LIMIT 1;
    IF v_stock_msg IS NOT NULL THEN
        RAISE EXCEPTION '%', v_stock_msg;
    END IF;

    SELECT COALESCE(SUM(l.unit_price * l.quantity), 0)::INT INTO v_subtotal FROM tmp_order_lines l;
    v_ship := public.fn_shipping_fee(v_subtotal);

    IF NULLIF(BTRIM(p_coupon_code), '') IS NOT NULL THEN
        SELECT f.coupon_id, f.is_valid, f.discount_amount, f.message
        INTO v_coupon_id, v_valid, v_discount, v_msg
        FROM public.fn_check_coupon(p_coupon_code, v_subtotal) f;

        IF NOT COALESCE(v_valid, FALSE) THEN
            RAISE EXCEPTION '%', v_msg;
        END IF;

        UPDATE public.coupons c
        SET used_count = c.used_count + 1
        WHERE c.coupon_id = v_coupon_id AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit);
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RAISE EXCEPTION 'Mã giảm giá vừa hết lượt sử dụng';
        END IF;
    END IF;

    v_total := v_subtotal - v_discount + v_ship;

    -- Mã đơn hiển thị cho khách
    LOOP
        v_code := 'HQ' || TO_CHAR(v_now AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDD')
                       || LPAD((FLOOR(random() * 10000))::INT::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.order_code = v_code);
        v_try := v_try + 1;
        IF v_try >= 20 THEN
            RAISE EXCEPTION 'Không tạo được mã đơn, vui lòng thử lại';
        END IF;
    END LOOP;

    v_status  := CASE WHEN p_payment_method = 'cod' THEN 'confirmed' ELSE 'pending_payment' END;
    v_expires := CASE WHEN p_payment_method = 'payos' THEN v_now + INTERVAL '15 minutes' END;

    INSERT INTO public.orders (order_code, user_id, customer_email, coupon_id, recipient_name, recipient_phone,
                               province, shipping_address, note, gift_message, subtotal, discount_amount,
                               shipping_fee, total, payment_method, payment_status, status, expires_at,
                               created_at, updated_at)
    VALUES (v_code, v_uid, v_email, v_coupon_id, BTRIM(p_recipient_name), p_recipient_phone,
            BTRIM(p_province), BTRIM(p_shipping_address), NULLIF(BTRIM(p_note), ''),
            NULLIF(BTRIM(p_gift_message), ''), v_subtotal, v_discount, v_ship, v_total,
            p_payment_method, 'unpaid', v_status, v_expires, v_now, v_now)
    RETURNING public.orders.order_id, public.orders.payos_order_code
    INTO v_order_id, v_payos_code;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity)
    SELECT v_order_id, l.product_id, l.product_name, l.unit_price, l.quantity
    FROM tmp_order_lines l;

    UPDATE public.products p
    SET stock = p.stock - l.quantity
    FROM tmp_order_lines l
    WHERE l.product_id = p.product_id;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (v_order_id, NULL, v_status, v_uid,
            CASE WHEN v_status = 'confirmed' THEN 'Đặt hàng, thanh toán khi nhận hàng'
                 ELSE 'Đặt hàng, đang chờ thanh toán PayOS' END);

    DELETE FROM public.cart_items WHERE cart_key = v_key;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_code', v_code,
        'payos_order_code', v_payos_code,
        'status', v_status,
        'payment_method', p_payment_method,
        'total', v_total,
        'expires_at', v_expires);
END;
$$;

-- D7. PayOS: lưu link thanh toán đã tạo (service_role)
CREATE OR REPLACE FUNCTION public.save_payos_link(p_order_code TEXT, p_link_id TEXT, p_checkout_url TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.orders
    SET payos_payment_link_id = p_link_id,
        payos_checkout_url    = p_checkout_url
    WHERE order_code = p_order_code AND status = 'pending_payment'
$$;

-- D8. PayOS: ghi nhận webhook đã xác thực chữ ký (service_role).
--     Trả về: CONFIRMED | ALREADY_PAID | AMOUNT_MISMATCH | LATE_PAYMENT | ORDER_NOT_FOUND | WRONG_METHOD
CREATE OR REPLACE FUNCTION public.record_payos_result(
    p_payos_order_code BIGINT,
    p_amount           BIGINT,
    p_reference        TEXT,
    p_raw              JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_order public.orders%ROWTYPE;
    v_now   TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE payos_order_code = p_payos_order_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'ORDER_NOT_FOUND';
    END IF;
    IF v_order.payment_method <> 'payos' THEN
        RETURN 'WRONG_METHOD';
    END IF;

    -- Ghi nhật ký trước, để đối soát được cả giao dịch sai tiền
    INSERT INTO public.payments (order_id, provider, amount, transaction_no, is_success, raw_data, created_at)
    VALUES (v_order.order_id, 'payos', p_amount, NULLIF(p_reference, ''),
            p_amount = v_order.total, p_raw, v_now)
    ON CONFLICT (provider, transaction_no) WHERE transaction_no IS NOT NULL AND is_success
    DO NOTHING;

    IF v_order.payment_status = 'paid' THEN
        RETURN 'ALREADY_PAID';
    END IF;

    IF p_amount <> v_order.total THEN
        RETURN 'AMOUNT_MISMATCH';
    END IF;

    IF v_order.status = 'pending_payment' THEN
        UPDATE public.orders
        SET status = 'confirmed', payment_status = 'paid', paid_at = v_now
        WHERE order_id = v_order.order_id;

        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
        VALUES (v_order.order_id, 'pending_payment', 'confirmed', NULL,
                'Thanh toán PayOS thành công, mã giao dịch ' || COALESCE(p_reference, ''));
        RETURN 'CONFIRMED';
    END IF;

    -- Đơn đã hủy (quá hạn) nhưng khách vẫn trả tiền: đánh dấu paid để admin hoàn tiền
    UPDATE public.orders
    SET payment_status = 'paid', paid_at = v_now
    WHERE order_id = v_order.order_id;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (v_order.order_id, v_order.status, v_order.status, NULL,
            'Nhận tiền sau khi đơn đã hủy, cần hoàn tiền thủ công');
    RETURN 'LATE_PAYMENT';
END;
$$;

-- D9. Trạng thái thanh toán cho trang kết quả (C07). Không lộ thông tin nhạy cảm.
CREATE OR REPLACE FUNCTION public.get_payment_status(p_order_code TEXT, p_phone TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'order_code', o.order_code,
        'status', o.status,
        'payment_status', o.payment_status,
        'payment_method', o.payment_method,
        'total', o.total,
        'expires_at', o.expires_at,
        'checkout_url', CASE WHEN o.status = 'pending_payment' THEN o.payos_checkout_url END)
    FROM public.orders o
    WHERE o.order_code = p_order_code
      AND (o.user_id = auth.uid() OR public.is_admin()
           OR (p_phone IS NOT NULL AND o.recipient_phone = p_phone))
$$;

-- D10. Chi tiết đơn (C13, A05, tra cứu của khách vãng lai)
CREATE OR REPLACE FUNCTION public.get_order_detail(p_order_code TEXT, p_phone TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE order_code = p_order_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy đơn hàng';
    END IF;

    IF NOT (
        (auth.uid() IS NOT NULL AND v_order.user_id = auth.uid())
        OR public.is_admin()
        OR (p_phone IS NOT NULL AND v_order.recipient_phone = p_phone)
    ) THEN
        RAISE EXCEPTION 'Không tìm thấy đơn hàng';   -- cùng thông báo, tránh dò mã đơn
    END IF;

    RETURN jsonb_build_object(
        'order', jsonb_build_object(
            'order_id', v_order.order_id, 'order_code', v_order.order_code,
            'status', v_order.status, 'payment_method', v_order.payment_method,
            'payment_status', v_order.payment_status,
            'recipient_name', v_order.recipient_name, 'recipient_phone', v_order.recipient_phone,
            'province', v_order.province, 'shipping_address', v_order.shipping_address,
            'note', v_order.note, 'gift_message', v_order.gift_message,
            'subtotal', v_order.subtotal, 'discount_amount', v_order.discount_amount,
            'shipping_fee', v_order.shipping_fee, 'total', v_order.total,
            'expires_at', v_order.expires_at, 'paid_at', v_order.paid_at,
            'completed_at', v_order.completed_at, 'cancelled_at', v_order.cancelled_at,
            'cancel_reason', v_order.cancel_reason, 'created_at', v_order.created_at,
            'checkout_url', CASE WHEN v_order.status = 'pending_payment' THEN v_order.payos_checkout_url END),
        'items', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'product_id', oi.product_id, 'product_name', oi.product_name,
                       'unit_price', oi.unit_price, 'quantity', oi.quantity,
                       'line_total', oi.line_total,
                       'has_reviewed', EXISTS (SELECT 1 FROM public.reviews rv
                                               WHERE rv.user_id = v_order.user_id
                                                 AND rv.product_id = oi.product_id))
                       ORDER BY oi.order_item_id)
            FROM public.order_items oi
            WHERE oi.order_id = v_order.order_id), '[]'::JSONB),
        'history', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'from_status', h.from_status, 'to_status', h.to_status,
                       'note', h.note, 'changed_at', h.changed_at)
                       ORDER BY h.changed_at, h.history_id)
            FROM public.order_status_history h
            WHERE h.order_id = v_order.order_id), '[]'::JSONB));
END;
$$;

-- D11. Đổi trạng thái đơn. Xác nhận thanh toán PayOS CHỈ qua webhook.
--      Khách: hủy đơn của mình khi pending_payment hoặc confirmed.
--      Admin: confirmed -> shipping -> completed; hủy bất kỳ đơn chưa hoàn tất.
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id INT, p_new_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_uid    UUID := auth.uid();
    v_admin  BOOLEAN := public.is_admin();
    v_owner  UUID;
    v_status TEXT;
    v_now    TIMESTAMPTZ := now();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Cần đăng nhập để thực hiện thao tác này';
    END IF;
    IF p_new_status IS NULL OR p_new_status NOT IN ('shipping', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Trạng thái mới không hợp lệ';
    END IF;

    SELECT o.user_id, o.status INTO v_owner, v_status
    FROM public.orders o WHERE o.order_id = p_order_id FOR UPDATE;

    IF v_status IS NULL OR (NOT v_admin AND v_owner IS DISTINCT FROM v_uid) THEN
        RAISE EXCEPTION 'Không tìm thấy đơn hàng';
    END IF;
    IF NOT v_admin AND p_new_status <> 'cancelled' THEN
        RAISE EXCEPTION 'Bạn không có quyền thực hiện thao tác này';
    END IF;

    IF NOT (
           (v_status IN ('pending_payment', 'confirmed') AND p_new_status = 'cancelled')
        OR (v_status = 'confirmed' AND p_new_status = 'shipping'  AND v_admin)
        OR (v_status = 'shipping'  AND p_new_status = 'completed' AND v_admin)
    ) THEN
        RAISE EXCEPTION 'Không thể chuyển đơn từ "%" sang "%"', v_status, p_new_status;
    END IF;

    IF p_new_status = 'cancelled' THEN
        PERFORM public.fn_release_order(p_order_id);
        UPDATE public.orders
        SET status = 'cancelled',
            cancelled_at = v_now,
            cancel_reason = COALESCE(NULLIF(BTRIM(p_note), ''),
                                     CASE WHEN v_admin THEN 'Cửa hàng hủy đơn' ELSE 'Khách hàng hủy đơn' END),
            -- Đơn PayOS đã thu tiền: đánh dấu cần hoàn tiền
            payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END
        WHERE order_id = p_order_id;

    ELSIF p_new_status = 'shipping' THEN
        UPDATE public.orders SET status = 'shipping' WHERE order_id = p_order_id;

    ELSIF p_new_status = 'completed' THEN
        UPDATE public.orders
        SET status = 'completed', completed_at = v_now,
            payment_status = 'paid', paid_at = COALESCE(paid_at, v_now)   -- COD: thu tiền khi giao xong
        WHERE order_id = p_order_id;

        UPDATE public.products p
        SET sold_count = p.sold_count + oi.quantity
        FROM public.order_items oi
        WHERE oi.product_id = p.product_id AND oi.order_id = p_order_id;
    END IF;

    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (p_order_id, v_status, p_new_status, v_uid, NULLIF(BTRIM(p_note), ''));

    RETURN jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
END;
$$;

-- D12. Tự hủy đơn PayOS quá hạn (service_role, chạy định kỳ)
CREATE OR REPLACE FUNCTION public.cancel_expired_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id    INT;
    v_count INT := 0;
BEGIN
    FOR v_id IN
        SELECT o.order_id FROM public.orders o
        WHERE o.status = 'pending_payment' AND o.expires_at < now()
        FOR UPDATE
    LOOP
        PERFORM public.fn_release_order(v_id);

        UPDATE public.orders
        SET status = 'cancelled', cancelled_at = now(), cancel_reason = 'Quá hạn thanh toán'
        WHERE order_id = v_id;

        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
        VALUES (v_id, 'pending_payment', 'cancelled', NULL, 'Tự hủy do quá hạn thanh toán');

        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- D13. Tìm kiếm và lọc sản phẩm (C02, C03). Tìm không dấu.
-- p_sort: newest | price_asc | price_desc | best_selling | rating
CREATE OR REPLACE FUNCTION public.search_products(
    p_keyword       TEXT DEFAULT NULL,
    p_category_slug TEXT DEFAULT NULL,
    p_region        TEXT DEFAULT NULL,
    p_min_price     INT  DEFAULT NULL,
    p_max_price     INT  DEFAULT NULL,
    p_sort          TEXT DEFAULT 'newest',
    p_page          INT  DEFAULT 1,
    p_page_size     INT  DEFAULT 12
)
RETURNS TABLE (
    product_id        INT,
    name              VARCHAR,
    slug              VARCHAR,
    short_description VARCHAR,
    price             INT,
    compare_at_price  INT,
    thumbnail_url     VARCHAR,
    origin            VARCHAR,
    region            VARCHAR,
    unit              VARCHAR,
    stock             INT,
    sold_count        INT,
    rating_avg        NUMERIC,
    rating_count      INT,
    category_name     VARCHAR,
    category_slug     VARCHAR,
    total_count       BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_page    INT := GREATEST(COALESCE(p_page, 1), 1);
    v_size    INT := CASE WHEN COALESCE(p_page_size, 12) BETWEEN 1 AND 48 THEN p_page_size ELSE 12 END;
    v_pattern TEXT;
BEGIN
    IF NULLIF(BTRIM(p_keyword), '') IS NOT NULL THEN
        v_pattern := '%' || REPLACE(REPLACE(REPLACE(BTRIM(p_keyword), '\', '\\'), '%', '\%'), '_', '\_') || '%';
    END IF;

    RETURN QUERY
    SELECT pr.product_id, pr.name, pr.slug, pr.short_description, pr.price, pr.compare_at_price,
           pr.thumbnail_url, pr.origin, pr.region, pr.unit, pr.stock, pr.sold_count,
           pr.rating_avg, pr.rating_count, c.name, c.slug, COUNT(*) OVER ()
    FROM public.products pr
    JOIN public.categories c ON c.category_id = pr.category_id
    WHERE pr.is_active AND c.is_active
      AND (v_pattern IS NULL
           OR unaccent(pr.name)   ILIKE unaccent(v_pattern)
           OR unaccent(pr.origin) ILIKE unaccent(v_pattern))
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (p_region IS NULL OR pr.region = p_region)
      AND (p_min_price IS NULL OR pr.price >= p_min_price)
      AND (p_max_price IS NULL OR pr.price <= p_max_price)
    ORDER BY
        CASE WHEN p_sort = 'price_asc'    THEN pr.price      END ASC,
        CASE WHEN p_sort = 'price_desc'   THEN pr.price      END DESC,
        CASE WHEN p_sort = 'best_selling' THEN pr.sold_count END DESC,
        CASE WHEN p_sort = 'rating'       THEN pr.rating_avg END DESC,
        pr.created_at DESC, pr.product_id DESC
    LIMIT v_size OFFSET (v_page - 1) * v_size;
END;
$$;

-- D14. Gợi ý "Thường mua kèm" và "Nâng cấp hộp quà"
CREATE OR REPLACE FUNCTION public.product_cross_sell(p_product_id INT)
RETURNS TABLE (product_id INT, name VARCHAR, slug VARCHAR, price INT, thumbnail_url VARCHAR, times_bought_together BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT pr.product_id, pr.name, pr.slug, pr.price, pr.thumbnail_url, COUNT(*)
    FROM public.order_items a
    JOIN public.orders o      ON o.order_id = a.order_id AND o.status <> 'cancelled'
    JOIN public.order_items b ON b.order_id = a.order_id AND b.product_id <> a.product_id
    JOIN public.products pr   ON pr.product_id = b.product_id AND pr.is_active AND pr.stock > 0
    WHERE a.product_id = p_product_id
    GROUP BY pr.product_id, pr.name, pr.slug, pr.price, pr.thumbnail_url, pr.sold_count
    ORDER BY COUNT(*) DESC, pr.sold_count DESC
    LIMIT 4
$$;

CREATE OR REPLACE FUNCTION public.product_upsell(p_product_id INT)
RETURNS TABLE (product_id INT, name VARCHAR, slug VARCHAR, price INT, thumbnail_url VARCHAR, price_difference INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.product_id, p.name, p.slug, p.price, p.thumbnail_url, (p.price - cur.price)
    FROM public.products cur
    JOIN public.products p ON p.category_id = cur.category_id
                          AND p.price > cur.price AND p.is_active AND p.stock > 0
    WHERE cur.product_id = p_product_id
    ORDER BY p.price ASC
    LIMIT 3
$$;

-- D15. Đánh giá
CREATE OR REPLACE FUNCTION public.product_reviews(p_product_id INT, p_limit INT DEFAULT 20)
RETURNS TABLE (review_id INT, rating SMALLINT, comment VARCHAR, created_at TIMESTAMPTZ, reviewer_name VARCHAR)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, pf.full_name
    FROM public.reviews rv
    JOIN public.profiles pf ON pf.id = rv.user_id
    WHERE rv.product_id = p_product_id AND NOT rv.is_hidden
    ORDER BY rv.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
$$;

CREATE OR REPLACE FUNCTION public.submit_review(p_product_id INT, p_rating INT, p_comment TEXT DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid   UUID := auth.uid();
    v_order INT;
    v_id    INT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Cần đăng nhập để đánh giá';
    END IF;
    IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
        RAISE EXCEPTION 'Số sao phải từ 1 đến 5';
    END IF;

    SELECT o.order_id INTO v_order
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.order_id
    WHERE o.user_id = v_uid AND oi.product_id = p_product_id AND o.status = 'completed'
    ORDER BY o.completed_at DESC
    LIMIT 1;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Chỉ đánh giá được sản phẩm đã mua và nhận hàng thành công';
    END IF;
    IF EXISTS (SELECT 1 FROM public.reviews rv WHERE rv.user_id = v_uid AND rv.product_id = p_product_id) THEN
        RAISE EXCEPTION 'Bạn đã đánh giá sản phẩm này rồi';
    END IF;

    INSERT INTO public.reviews (user_id, product_id, order_id, rating, comment)
    VALUES (v_uid, p_product_id, v_order, p_rating, NULLIF(BTRIM(p_comment), ''))
    RETURNING public.reviews.review_id INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_review_hidden(p_review_id INT, p_hidden BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới thực hiện được thao tác này';
    END IF;
    UPDATE public.reviews SET is_hidden = p_hidden WHERE review_id = p_review_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy đánh giá';
    END IF;
END;
$$;

-- D16. Bản tin khuyến mãi
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT, p_consent BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT := LOWER(BTRIM(p_email));
BEGIN
    IF NOT COALESCE(p_consent, FALSE) THEN
        RAISE EXCEPTION 'Cần đồng ý nhận email khuyến mãi';
    END IF;
    IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'Email không hợp lệ';
    END IF;

    INSERT INTO public.newsletter_subscribers (email, consented_at)
    VALUES (v_email, timezone('utc', now()))
    ON CONFLICT (email)
    DO UPDATE SET consented_at = timezone('utc', now()), unsubscribed_at = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.newsletter_subscribers
    SET unsubscribed_at = timezone('utc', now())
    WHERE unsubscribe_token = p_token AND unsubscribed_at IS NULL;
    RETURN FOUND;
END;
$$;

-- D16b. Danh sách đơn của CHÍNH người đang đăng nhập (C12 – /tai-khoan/don-hang).
--       Bảng orders không cấp SELECT cho khách nên trang này phải đi qua RPC.
CREATE OR REPLACE FUNCTION public.fn_list_user_orders()
RETURNS SETOF JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'order_id',       o.order_id,
        'order_code',     o.order_code,
        'created_at',     o.created_at,
        'status',         o.status,
        'payment_method', o.payment_method,
        'payment_status', o.payment_status,
        'total',          o.total,
        'expires_at',     o.expires_at,
        'checkout_url',   CASE WHEN o.status = 'pending_payment' THEN o.payos_checkout_url END,
        'item_count',     COALESCE((
            SELECT SUM(oi.quantity)::BIGINT
              FROM public.order_items oi
             WHERE oi.order_id = o.order_id
        ), 0)
    )
    FROM public.orders o
    WHERE o.user_id = auth.uid()
    ORDER BY o.created_at DESC
    LIMIT 200;
$$;

-- D16c. Đăng ký bản tin + TRẢ VỀ token hủy đăng ký.
--       `subscribe_newsletter` gốc trả VOID nên web-app không lấy được
--       `unsubscribe_token` để gửi kèm link hủy đăng ký trong email (yêu cầu pháp lý).
CREATE OR REPLACE FUNCTION public.hq_subscribe_newsletter(p_email TEXT, p_consent BOOLEAN)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID;
BEGIN
    -- Hàm gốc tự kiểm tra consent + định dạng email và tự báo lỗi tiếng Việt.
    PERFORM public.subscribe_newsletter(p_email, p_consent);

    SELECT ns.unsubscribe_token INTO v_token
      FROM public.newsletter_subscribers ns
     WHERE ns.email = LOWER(BTRIM(p_email));

    RETURN v_token;
END;
$$;

-- D17. Thống kê admin (A01). Mọi hàm kiểm tra is_admin().
CREATE OR REPLACE FUNCTION public.admin_dashboard_summary(p_days INT DEFAULT 30)
RETURNS TABLE (revenue BIGINT, order_count BIGINT, avg_order_value BIGINT,
               new_customers BIGINT, orders_to_process BIGINT, pending_payment_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_days INT := CASE WHEN COALESCE(p_days, 30) BETWEEN 1 AND 365 THEN p_days ELSE 30 END;
    v_from TIMESTAMPTZ;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới xem được thống kê';
    END IF;
    v_from := now() - make_interval(days => v_days);

    RETURN QUERY
    SELECT COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('confirmed', 'shipping', 'completed')), 0)::BIGINT,
           COUNT(*) FILTER (WHERE o.status IN ('confirmed', 'shipping', 'completed')),
           COALESCE(ROUND(AVG(o.total) FILTER (WHERE o.status IN ('confirmed', 'shipping', 'completed'))), 0)::BIGINT,
           (SELECT COUNT(*) FROM public.profiles pf WHERE pf.role = 'customer' AND pf.created_at >= v_from),
           (SELECT COUNT(*) FROM public.orders x WHERE x.status IN ('confirmed', 'shipping')),
           (SELECT COUNT(*) FROM public.orders x WHERE x.status = 'pending_payment')
    FROM public.orders o
    WHERE o.created_at >= v_from;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_daily_revenue(p_days INT DEFAULT 30)
RETURNS TABLE (sale_date DATE, revenue BIGINT, order_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_days  INT := CASE WHEN COALESCE(p_days, 30) BETWEEN 1 AND 365 THEN p_days ELSE 30 END;
    v_today DATE := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
    v_start DATE;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới xem được thống kê';
    END IF;
    v_start := v_today - (v_days - 1);

    RETURN QUERY
    SELECT d.ts::DATE,
           COALESCE(SUM(o.total), 0)::BIGINT,
           COUNT(o.order_id)::BIGINT
    FROM generate_series(v_start::TIMESTAMP, v_today::TIMESTAMP, INTERVAL '1 day') AS d(ts)
    LEFT JOIN public.orders o
           ON (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE = d.ts::DATE
          AND o.status IN ('confirmed', 'shipping', 'completed')
    GROUP BY d.ts
    ORDER BY d.ts;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_top_products(p_days INT DEFAULT 30, p_limit INT DEFAULT 5)
RETURNS TABLE (product_id INT, name VARCHAR, slug VARCHAR, thumbnail_url VARCHAR,
               quantity_sold BIGINT, revenue BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới xem được thống kê';
    END IF;

    RETURN QUERY
    SELECT pr.product_id, pr.name, pr.slug, pr.thumbnail_url,
           SUM(oi.quantity)::BIGINT, SUM(oi.line_total)::BIGINT
    FROM public.order_items oi
    JOIN public.orders o    ON o.order_id = oi.order_id
    JOIN public.products pr ON pr.product_id = oi.product_id
    WHERE o.created_at >= now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
      AND o.status IN ('confirmed', 'shipping', 'completed')
    GROUP BY pr.product_id, pr.name, pr.slug, pr.thumbnail_url
    ORDER BY SUM(oi.quantity) DESC, SUM(oi.line_total) DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 50);
END;
$$;

-- Tỉ lệ COD và PayOS
CREATE OR REPLACE FUNCTION public.admin_payment_mix(p_days INT DEFAULT 30)
RETURNS TABLE (payment_method TEXT, order_count BIGINT, revenue BIGINT, share_percent NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới xem được thống kê';
    END IF;

    RETURN QUERY
    SELECT o.payment_method::TEXT, COUNT(*)::BIGINT, SUM(o.total)::BIGINT,
           (100.0 * COUNT(*) / SUM(COUNT(*)) OVER ())::NUMERIC(5,1)
    FROM public.orders o
    WHERE o.created_at >= now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 1), 365))
      AND o.status IN ('confirmed', 'shipping', 'completed')
    GROUP BY o.payment_method
    ORDER BY COUNT(*) DESC;
END;
$$;

/* ---------------------------------------------------------------------
   E. RLS – CHÍNH SÁCH TRUY CẬP
   Bảng không có policy cho khách = không đọc/ghi trực tiếp, chỉ qua hàm.
   --------------------------------------------------------------------- */

-- profiles: xem của mình hoặc admin xem tất cả. Sửa của mình (trừ role, xem F-grant).
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- categories
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT
    USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- products
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT
    USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- product_images: xem ảnh của sản phẩm đang bán
DROP POLICY IF EXISTS "product_images_select" ON public.product_images;
CREATE POLICY "product_images_select" ON public.product_images FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.products pr
                   WHERE pr.product_id = product_images.product_id
                     AND (pr.is_active OR public.is_admin())));
DROP POLICY IF EXISTS "product_images_admin_write" ON public.product_images;
CREATE POLICY "product_images_admin_write" ON public.product_images FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- coupons: khách không đọc trực tiếp; admin quản lý
DROP POLICY IF EXISTS "coupons_admin" ON public.coupons;
CREATE POLICY "coupons_admin" ON public.coupons FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- banners: xem banner đang hiệu lực
DROP POLICY IF EXISTS "banners_select" ON public.banners;
CREATE POLICY "banners_select" ON public.banners FOR SELECT
    USING (public.is_admin()
           OR (is_active
               AND (starts_at IS NULL OR starts_at <= now())
               AND (ends_at IS NULL OR ends_at >= now())));
DROP POLICY IF EXISTS "banners_admin_write" ON public.banners;
CREATE POLICY "banners_admin_write" ON public.banners FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- orders: chủ đơn hoặc admin đọc (ghi qua hàm)
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o
                   WHERE o.order_id = order_items.order_id
                     AND (o.user_id = auth.uid() OR public.is_admin())));

DROP POLICY IF EXISTS "order_history_select" ON public.order_status_history;
CREATE POLICY "order_history_select" ON public.order_status_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o
                   WHERE o.order_id = order_status_history.order_id
                     AND (o.user_id = auth.uid() OR public.is_admin())));

-- payments: chỉ admin đọc để đối soát
DROP POLICY IF EXISTS "payments_admin_select" ON public.payments;
CREATE POLICY "payments_admin_select" ON public.payments FOR SELECT
    USING (public.is_admin());

-- reviews: ai cũng xem đánh giá không ẩn
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT
    USING (NOT is_hidden OR public.is_admin());

/* cart_items và newsletter_subscribers: không có policy. Chỉ hàm đọc/ghi. */

/* ---------------------------------------------------------------------
   F. QUYỀN EXECUTE VÀ QUYỀN BẢNG
   --------------------------------------------------------------------- */

-- Thu hồi quyền gọi hàm mặc định, sau đó cấp đúng cho từng vai trò
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Khách và người dùng đã đăng nhập
GRANT EXECUTE ON FUNCTION public.is_admin()                                                       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cart_add(UUID, INT, INT)                                         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cart_set_quantity(UUID, INT, INT)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cart(UUID, TEXT)                                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_status(TEXT, TEXT)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_detail(TEXT, TEXT)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_products(TEXT, TEXT, TEXT, INT, INT, TEXT, INT, INT)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_cross_sell(INT)                                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_upsell(INT)                                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_reviews(INT, INT)                                        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT, BOOLEAN)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(UUID)                                     TO anon, authenticated;

-- Chỉ người đã đăng nhập
GRANT EXECUTE ON FUNCTION public.cart_merge_guest(UUID)                                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(INT, TEXT, TEXT)                             TO authenticated;

-- Hai hàm thêm ở D16b/D16c: cấp quyền tường minh (vì phía trên đã REVOKE ALL khỏi PUBLIC).
GRANT EXECUTE ON FUNCTION public.hq_subscribe_newsletter(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_user_orders()                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(INT, INT, TEXT)                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_review_hidden(INT, BOOLEAN)                            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary(INT)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_daily_revenue(INT)                                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_products(INT, INT)                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_payment_mix(INT)                                           TO authenticated;

-- Chỉ backend (service_role): PayOS và tác vụ định kỳ
GRANT EXECUTE ON FUNCTION public.save_payos_link(TEXT, TEXT, TEXT)                                TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payos_result(BIGINT, BIGINT, TEXT, JSONB)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_expired_orders()                                          TO service_role;

-- Supabase mặc định cấp ALL cho anon/authenticated trên bảng mới: thu hồi hết trước
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Quyền bảng: khách không ghi trực tiếp vào bảng nghiệp vụ
REVOKE ALL ON public.cart_items, public.payments, public.newsletter_subscribers,
              public.order_status_history, public.order_items, public.orders, public.reviews
    FROM anon, authenticated;
GRANT SELECT ON public.orders, public.order_items, public.order_status_history,
                public.payments, public.reviews TO authenticated;
GRANT SELECT ON public.categories, public.products, public.product_images, public.banners TO anon, authenticated;

-- Profiles: người dùng chỉ được sửa các cột thông tin cá nhân, KHÔNG sửa role
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (full_name, phone, default_address) ON public.profiles TO authenticated;

-- coupons: chỉ admin (RLS). Khách không có quyền bảng.
REVOKE ALL ON public.coupons FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

-- Admin ghi sản phẩm, danh mục, ảnh, banner qua RLS (quyền bảng cho authenticated)
GRANT INSERT, UPDATE, DELETE ON public.products, public.categories, public.product_images, public.banners TO authenticated;

/* ---------------------------------------------------------------------
   G. STORAGE: bucket ảnh sản phẩm và banner
   --------------------------------------------------------------------- */
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_product_images_read" ON storage.objects;
CREATE POLICY "storage_product_images_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "storage_product_images_insert" ON storage.objects;
CREATE POLICY "storage_product_images_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
DROP POLICY IF EXISTS "storage_product_images_update" ON storage.objects;
CREATE POLICY "storage_product_images_update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-images' AND public.is_admin());
DROP POLICY IF EXISTS "storage_product_images_delete" ON storage.objects;
CREATE POLICY "storage_product_images_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'product-images' AND public.is_admin());

/* ---------------------------------------------------------------------
   H. KHỐI RESET (chỉ dùng cho DB thử nghiệm, XÓA TOÀN BỘ DỮ LIỆU)
   Bỏ comment và chạy TRƯỚC khi chạy file này nếu muốn làm lại từ đầu.
   --------------------------------------------------------------------- */
-- DROP TABLE IF EXISTS public.newsletter_subscribers, public.reviews, public.payments,
--     public.order_status_history, public.order_items, public.orders, public.cart_items,
--     public.banners, public.coupons, public.product_images, public.products,
--     public.categories, public.profiles CASCADE;
-- DROP SEQUENCE IF EXISTS public.payos_order_code_seq;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
