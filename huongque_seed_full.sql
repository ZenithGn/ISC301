/* =====================================================================
   HƯƠNG QUÊ – SEED DỮ LIỆU ĐẦY ĐỦ (chạy SAU huongque_db_full.sql)

   Nội dung:
     1. Tài khoản demo (Supabase Auth) – CHỈ DÙNG DEV/DEMO
     2. Danh mục, 20 sản phẩm, ảnh
     3. Mã giảm giá, banner, bản tin
     4. 60 đơn mẫu (COD và PayOS) trong 30 ngày, kèm lịch sử, nhật ký thanh toán
     5. Đánh giá mẫu, đồng bộ sold_count và used_count
     6. Kiểm tra số dòng

   Tài khoản demo:
     admin@huongque.vn         / Admin@123   (admin)
     an.nguyen@example.com     / Khach@123   (khách; 5 khách còn lại cùng mật khẩu)

   Mã giảm giá: TET2027, FREESHIP, KHAITRUONG (còn hạn), HETHAN (hết hạn, để demo từ chối)
   ===================================================================== */

-- Chặn chạy lại trên DB đã có dữ liệu
DO $guard$
BEGIN
    IF EXISTS (SELECT 1 FROM public.products) OR EXISTS (SELECT 1 FROM public.orders) THEN
        RAISE EXCEPTION 'Database đã có dữ liệu. Chạy khối RESET trong huongque_db_full.sql rồi làm lại.';
    END IF;
END
$guard$;

/* ---------------------------------------------------------------------
   1. TÀI KHOẢN DEMO (Supabase Auth)
   Ghi trực tiếp vào auth.users: chỉ dùng cho môi trường dev/demo.
   Trên production, tạo tài khoản admin qua Dashboard rồi chạy UPDATE role.
   --------------------------------------------------------------------- */
DO $auth$
DECLARE
    r    RECORD;
    v_id UUID;
BEGIN
    -- Tạo BỔ SUNG từng tài khoản còn thiếu (idempotent theo email) — KHÔNG bỏ qua cả khối.
    -- Nếu bỏ qua cả khối thì 5 khách demo không tồn tại, bảng tạm tmp_c trong khoi orders rỗng
    -- và INSERT orders sẽ lỗi 23502 ở cột customer_email.

    FOR r IN
        SELECT * FROM (VALUES
            ('admin@huongque.vn',     'Admin@123', 'Quản trị Hương Quê', '0901000000', NULL::TEXT,                                                  90),
            ('an.nguyen@example.com', 'Khach@123', 'Nguyễn Văn An',      '0912345678', '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 60),
            ('binh.tran@example.com', 'Khach@123', 'Trần Thị Bình',      '0987654321', '45 Kim Mã, Phường Kim Mã, Quận Ba Đình, Hà Nội',          50),
            ('chi.le@example.com',    'Khach@123', 'Lê Minh Chi',        '0935111222', '88 Bạch Đằng, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng', 25),
            ('dung.pham@example.com', 'Khach@123', 'Phạm Quốc Dũng',     '0909333444', '20 Lê Lợi, Phường Phú Cường, TP. Thủ Dầu Một, Bình Dương', 12),
            ('ha.hoang@example.com',  'Khach@123', 'Hoàng Thu Hà',       '0977555666', '5 Trần Phú, Phường Tân An, Quận Ninh Kiều, Cần Thơ',      4)
        ) AS t(email, pwd, full_name, phone, addr, days_ago)
    LOOP
        -- Bỏ qua tài khoản đã tồn tại, vẫn tạo tiếp các tài khoản còn thiếu.
        CONTINUE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.email = r.email);

        v_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
            r.email, extensions.crypt(r.pwd, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::JSONB,
            jsonb_build_object('full_name', r.full_name, 'phone', r.phone),
            now() - make_interval(days => r.days_ago), now() - make_interval(days => r.days_ago),
            '', '', '', ''
        );

        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id,
                                     created_at, updated_at, last_sign_in_at)
        VALUES (gen_random_uuid(), v_id,
                jsonb_build_object('sub', v_id::TEXT, 'email', r.email),
                'email', v_id::TEXT, now(), now(), now());

        -- Trigger handle_new_user đã tạo profile. Bổ sung địa chỉ, ngày tạo và role.
        UPDATE public.profiles
        SET phone = r.phone,
            default_address = r.addr,
            created_at = now() - make_interval(days => r.days_ago),
            updated_at = now() - make_interval(days => r.days_ago),
            role = CASE WHEN r.email = 'admin@huongque.vn' THEN 'admin' ELSE 'customer' END
        WHERE id = v_id;
    END LOOP;

    -- Bù hồ sơ cho các tài khoản demo ĐÃ TỒN TẠI từ trước (vòng lặp trên bỏ qua chúng).
    -- Nhờ vậy seed luôn có đủ 5 khách hàng + admin dù chạy trên DB đã có tài khoản,
    -- và `created_at` lùi về quá khứ để khối $orders$ không đẩy đơn vào tương lai.
    UPDATE public.profiles pf
       SET phone           = COALESCE(pf.phone, t.phone),
           default_address = COALESCE(pf.default_address, t.addr),
           created_at      = now() - make_interval(days => t.days_ago),
           role            = CASE WHEN t.email = 'admin@huongque.vn' THEN 'admin' ELSE pf.role END
      FROM (VALUES
            ('admin@huongque.vn',     '0901000000', NULL::TEXT,                                                  90),
            ('an.nguyen@example.com', '0912345678', '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 60),
            ('binh.tran@example.com', '0987654321', '45 Kim Mã, Phường Kim Mã, Quận Ba Đình, Hà Nội',          50),
            ('chi.le@example.com',    '0935111222', '88 Bạch Đằng, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng', 25),
            ('dung.pham@example.com', '0909333444', '20 Lê Lợi, Phường Phú Cường, TP. Thủ Dầu Một, Bình Dương', 12),
            ('ha.hoang@example.com',  '0977555666', '5 Trần Phú, Phường Tân An, Quận Ninh Kiều, Cần Thơ',      4)
      ) AS t(email, phone, addr, days_ago)
     WHERE pf.email = t.email;

    -- Nếu trigger handle_new_user chưa tạo profile (trường hợp hiếm), tạo bù để
    -- khối $orders$ chắc chắn có khách hàng.
    INSERT INTO public.profiles (id, email, full_name, phone, default_address, role, created_at, updated_at)
    SELECT u.id,
           u.email,
           COALESCE(u.raw_user_meta_data->>'full_name', ''),
           NULLIF(u.raw_user_meta_data->>'phone', ''),
           NULL,
           CASE WHEN u.email = 'admin@huongque.vn' THEN 'admin' ELSE 'customer' END,
           u.created_at,
           u.created_at
      FROM auth.users u
      LEFT JOIN public.profiles pf ON pf.id = u.id
     WHERE pf.id IS NULL
       AND u.email IN ('admin@huongque.vn', 'an.nguyen@example.com', 'binh.tran@example.com',
                       'chi.le@example.com', 'dung.pham@example.com', 'ha.hoang@example.com')
    ON CONFLICT (id) DO NOTHING;
END
$auth$;

/* ---------------------------------------------------------------------
   2. DANH MỤC VÀ SẢN PHẨM
   --------------------------------------------------------------------- */
INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
 ('Hộp quà Tết',        'hop-qua-tet',  'Hộp quà đặc sản ba miền cao cấp, kèm thiệp chúc Tết viết tay', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80', 1),
 ('Bánh mứt',           'banh-mut',     'Bánh, kẹo, mứt truyền thống sum vầy ngày Tết',                 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', 2),
 ('Trà & Cà phê',       'tra-ca-phe',   'Trà Thái Nguyên, trà sen Tây Hồ, cà phê Tây Nguyên đậm đà',    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', 3),
 ('Hạt & Đồ khô',       'hat-kho',      'Hạt điều rang muối, mắc ca, khô bò cay nồng nhâm nhi',         'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80', 4),
 ('Gia vị & Nước chấm', 'gia-vi',       'Nước mắm Phú Quốc, tỏi Lý Sơn, gia vị tinh hoa vùng miền',     'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80', 5);

INSERT INTO public.products (category_id, name, slug, short_description, origin, producer, region, unit,
                             price, compare_at_price, stock, thumbnail_url, is_featured)
SELECT c.category_id, v.name, v.slug, v.short_desc, v.origin, v.producer, v.region, v.unit,
       v.price, v.compare_at, v.stock, v.thumbnail, v.is_featured
FROM (VALUES
 -- Hộp quà Tết
 ('hop-qua-tet', 'Hộp quà Tết An Khang 2027', 'hop-qua-tet-an-khang', 'Hộp 4 món: trà Thái Nguyên, mứt dừa Bến Tre, hạt điều, mè xửng Huế', 'Ba miền', 'Hương Quê Artisan', 'ba_mien', 'hộp', 349000, 399000, 120, 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80', TRUE),
 ('hop-qua-tet', 'Hộp quà Tết Phúc Lộc Đoàn Viên', 'hop-qua-tet-phuc-loc', 'Hộp 6 món đặc sản ba miền thượng hạng, kèm thiệp chúc Tết viết tay', 'Ba miền', 'Hương Quê Artisan', 'ba_mien', 'hộp', 649000, 720000, 100, 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80', TRUE),
 ('hop-qua-tet', 'Hộp quà Tết Thịnh Vượng (Hộp Gỗ VIP)', 'hop-qua-tet-thinh-vuong', 'Hộp gỗ sơn mài 8 món cao cấp: trà sen Tây Hồ, mắc ca, nước mắm cốt Phú Quốc', 'Ba miền', 'Hương Quê Artisan', 'ba_mien', 'hộp gỗ', 1190000, 1350000, 45, 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=600&auto=format&fit=crop&q=80', TRUE),
 ('hop-qua-tet', 'Hộp quà Tết Tinh Hoa Bắc Bộ', 'hop-qua-tet-huong-bac', 'Trà Tân Cương thượng hạng, ô mai mơ gừng Hà Nội, bánh cốm gia truyền', 'Hà Nội', 'Đặc sản Thăng Long', 'bac', 'hộp', 559000, 620000, 80, 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=80', TRUE),
 ('hop-qua-tet', 'Hộp quà Tết Hương Vị Xứ Cố Đô', 'hop-qua-tet-huong-trung', 'Mè xửng Huế, kẹo cu đơ Hà Tĩnh, tỏi cô đơn Lý Sơn, cà phê Buôn Ma Thuột', 'Huế', 'Đặc sản Cố Đô', 'trung', 'hộp', 499000, 560000, 75, 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&auto=format&fit=crop&q=80', FALSE),
 ('hop-qua-tet', 'Hộp quà Tết Phương Nam Trù Phú', 'hop-qua-tet-huong-nam', 'Mứt dừa sáp Bến Tre, bánh pía Sóc Trăng, hạt điều rang muối Bình Phước', 'Bến Tre', 'Đặc sản Miền Tây', 'nam', 'hộp', 459000, 510000, 90, 'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=600&auto=format&fit=crop&q=80', FALSE),
 -- Bánh mứt
 ('banh-mut', 'Ô mai mơ gừng phố cổ Hà Nội 500g', 'o-mai-mo-gung-ha-noi-500g', 'Ô mai mơ dẻo thơm, vị chua ngọt thanh tao, cay nồng ấm áp của gừng già', 'Hà Nội', 'Ô Mai Cổ Truyền', 'bac', 'hộp 500g', 150000, NULL, 150, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', FALSE),
 ('banh-mut', 'Bánh cốm Hàng Than hộp 10 chiếc', 'banh-com-ha-noi-hop-10', 'Vỏ cốm xanh non dẻo quánh, nhân đậu xanh sên đường dừa ngọt dịu', 'Hà Nội', 'Bánh Cốm Hà Nội', 'bac', 'hộp 10 chiếc', 85000, NULL, 120, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80', FALSE),
 ('banh-mut', 'Mè xửng dẻo Cung Đình Huế 250g', 'me-xung-hue-250g', 'Kẹo mè xửng dẻo bùi hạt mè rang vàng óng, đậu phộng béo giòn thơm', 'Huế', 'Mè Xửng Cung Đình', 'trung', 'hộp 250g', 45000, NULL, 200, 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80', FALSE),
 ('banh-mut', 'Kẹo Cu Đơ Hà Tĩnh hộp 400g', 'keo-cu-do-ha-tinh-400g', 'Bánh tráng nướng giòn kẹp mạch nha cô đặc, gừng tươi và đậu phộng ta', 'Hà Tĩnh', 'Đặc sản Cu Đơ', 'trung', 'gói 400g', 60000, NULL, 140, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80', FALSE),
 ('banh-mut', 'Bánh Pía sầu riêng trứng muối Sóc Trăng', 'banh-pia-sau-rieng-soc-trang', 'Vỏ ngàn lớp mỏng tang, nhân sầu riêng tươi đậm đà cùng trứng muối béo ngậy', 'Sóc Trăng', 'Bánh Pía Tân Huê Viên', 'nam', 'hộp 4 chiếc', 75000, 85000, 160, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80', TRUE),
 ('banh-mut', 'Mứt dừa non hoa sen Bến Tre 500g', 'mut-dua-non-ben-tre-500g', 'Dừa nước non sên đường phèn thanh mát, mềm dẻo không gắt, tạo hình cánh hoa sen', 'Bến Tre', 'Mứt Quê Hương', 'nam', 'hộp 500g', 95000, NULL, 180, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80', FALSE),
 -- Trà & Cà phê
 ('tra-ca-phe', 'Trà Đinh Tân Cương Thái Nguyên 200g', 'tra-tan-cuong-thai-nguyen-200g', 'Tuyển chọn từ những búp trà đinh non nhất, vị chát dịu, hậu ngọt sâu lắng', 'Thái Nguyên', 'Hợp Tác Xã Trà Thái', 'bac', 'gói 200g', 180000, 210000, 110, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', TRUE),
 ('tra-ca-phe', 'Trà Sen Tây Hồ ướp bông tươi Thăng Long 100g', 'tra-sen-tay-ho-100g', 'Nghệ thuật ướp trà sen trăm năm, hương sen Bách Diệp nồng nàn thanh quý', 'Hà Nội', 'Nghệ Nhân Sen Tây Hồ', 'bac', 'hộp 100g', 450000, 520000, 25, 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80', TRUE),
 ('tra-ca-phe', 'Cà phê Robusta Mộc Buôn Ma Thuột 500g', 'ca-phe-robusta-buon-ma-thuot-500g', 'Hạt cà phê chín đỏ trên đất đỏ Bazan, rang mộc đậm đà nguyên bản', 'Đắk Lắk', 'Ban Me Coffee', 'trung', 'gói 500g', 160000, NULL, 140, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80', FALSE),
 ('tra-ca-phe', 'Trà Atiso túi lọc nguyên chất Đà Lạt', 'tra-atiso-da-lat-100-tui', 'Chiết xuất từ hoa atiso Đà Lạt, thanh nhiệt giải độc, tốt cho sức khỏe ngày Tết', 'Lâm Đồng', 'Ladophar Đà Lạt', 'trung', 'hộp 100 túi', 120000, NULL, 130, 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80', FALSE),
 -- Hạt & Đồ khô
 ('hat-kho', 'Hạt điều rang muối Bình Phước loại A 500g', 'hat-dieu-rang-muoi-binh-phuoc-500g', 'Hạt điều nguyên hạt còn vỏ lụa, rang củi thủ công thơm giòn béo ngậy', 'Bình Phước', 'Hạt Việt Farm', 'nam', 'hũ 500g', 185000, 210000, 190, 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80', TRUE),
 ('hat-kho', 'Hạt Mắc Ca nứt vỏ Tây Nguyên 500g', 'hat-mac-ca-dak-nong-500g', 'Nữ hoàng các loại hạt, vị ngọt bùi tự nhiên giàu dinh dưỡng, kèm dụng cụ tách vỏ', 'Đắk Nông', 'Macca Tây Nguyên', 'trung', 'túi 500g', 210000, NULL, 150, 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?w=600&auto=format&fit=crop&q=80', FALSE),
 ('hat-kho', 'Khô bò miếng cay Gia Lai 250g', 'kho-bo-gia-lai-250g', 'Thịt bò tươi tẩm ướp mật ong rừng và ớt xiêm cay nồng thơm ngất ngây', 'Gia Lai', 'Bò Khô Cao Nguyên', 'trung', 'gói 250g', 165000, NULL, 85, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', FALSE),
 ('hat-kho', 'Lạp xưởng tôm Mai Quế Lộ Cần Đước 500g', 'lap-xuong-can-duoc-500g', 'Lạp xưởng đặc sản Long An, thơm lừng mùi rượu Mai Quế Lộ gia truyền', 'Long An', 'Lạp Xưởng Cần Đước', 'nam', 'gói 500g', 170000, 195000, 110, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', FALSE)
) AS v(cat_slug, name, slug, short_desc, origin, producer, region, unit, price, compare_at, stock, thumbnail, is_featured)
JOIN public.categories c ON c.slug = v.cat_slug;

-- Mô tả đầy đủ và ảnh gallery (ảnh đại diện đã có trong thumbnail_url)
UPDATE public.products
SET description = short_description || '. Sản phẩm được Hương Quê tuyển chọn trực tiếp từ cơ sở sản xuất, '
                  || 'đóng gói cẩn thận, có thông tin nguồn gốc rõ ràng. Bảo quản nơi khô ráo, thoáng mát; '
                  || 'đặc sản tươi cần bảo quản ngăn mát và dùng trong 5–7 ngày.';

INSERT INTO public.product_images (product_id, image_url, sort_order)
SELECT product_id, thumbnail_url, 0 FROM public.products WHERE thumbnail_url IS NOT NULL;

/* ---------------------------------------------------------------------
   3. MÃ GIẢM GIÁ, BANNER, BẢN TIN
   --------------------------------------------------------------------- */
INSERT INTO public.coupons (code, description, discount_type, discount_value, max_discount, min_order_amount,
                            usage_limit, starts_at, ends_at, is_active) VALUES
 ('TET2027',    'Giảm 10% tối đa 100.000đ cho đơn từ 300.000đ',      'percent', 10,    100000, 300000, 500,
  '2026-10-01 00:00:00+07', '2027-02-10 23:59:59+07', TRUE),
 ('FREESHIP',   'Giảm 30.000đ phí giao hàng cho đơn từ 200.000đ',    'fixed',   30000, NULL,   200000, 1000,
  '2026-10-01 00:00:00+07', '2027-03-15 23:59:59+07', TRUE),
 ('KHAITRUONG', 'Giảm 50.000đ cho đơn từ 500.000đ dịp khai trương', 'fixed',   50000, NULL,   500000, 200,
  '2026-10-01 00:00:00+07', '2026-12-31 23:59:59+07', TRUE),
 ('HETHAN',     'Mã đã hết hạn, dùng để demo trường hợp bị từ chối', 'fixed',   20000, NULL,   0,      100,
  '2026-07-01 00:00:00+07', '2026-08-31 23:59:59+07', TRUE);

INSERT INTO public.banners (title, subtitle, image_url, link_url, sort_order, is_active) VALUES
 ('Quà Tết Đoàn Viên 2027', 'Hộp quà đặc sản ba miền, giao tận nhà trước Tết',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&auto=format&fit=crop&q=80', '/san-pham?danh_muc=hop-qua-tet', 1, TRUE),
 ('Trà sen Tây Hồ', 'Hương sen thanh quý, hộp quà sang trọng',
  'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=1600&auto=format&fit=crop&q=80', '/san-pham/tra-sen-tay-ho-100g', 2, TRUE),
 ('Ưu đãi khai trương', 'Nhập KHAITRUONG giảm 50.000đ cho đơn từ 500.000đ',
  'https://images.unsplash.com/photo-1608755728617-aefab37d2edd?w=1600&auto=format&fit=crop&q=80', '/san-pham', 3, TRUE);

INSERT INTO public.newsletter_subscribers (email, consented_at) VALUES
 ('an.nguyen@example.com',   timezone('utc', now()) - INTERVAL '50 days'),
 ('khachquen01@example.com', timezone('utc', now()) - INTERVAL '10 days'),
 ('khachquen02@example.com', timezone('utc', now()) - INTERVAL '3 days');

/* ---------------------------------------------------------------------
   4. 60 ĐƠN MẪU trong 30 ngày gần nhất
   - 10% là khách vãng lai (user_id NULL)
   - Đơn PayOS: đã thanh toán (is_success = TRUE) hoặc hết hạn và bị hủy
   - Ghi thẳng vào bảng để đặt được ngày trong quá khứ
   - setseed cố định: chạy lại cho cùng dữ liệu
   --------------------------------------------------------------------- */
DO $orders$
DECLARE
    v_now        TIMESTAMPTZ := now();
    v_n_products INT;
    v_n_cust     INT;
    v_tet        INT;
    v_admin      UUID;
    i            INT;
    k            INT;
    n_items      INT;
    pick         INT;
    r            DOUBLE PRECISION;
    v_created    TIMESTAMPTZ;
    v_user       UUID;
    v_name       TEXT;
    v_phone      TEXT;
    v_email      TEXT;
    v_addr       TEXT;
    v_user_at    TIMESTAMPTZ;
    v_subtotal   INT;
    v_discount   INT;
    v_ship       INT;
    v_coupon     INT;
    v_status     TEXT;
    v_method     TEXT;
    v_pay        TEXT;
    v_paid       TIMESTAMPTZ;
    v_shipped    TIMESTAMPTZ;
    v_completed  TIMESTAMPTZ;
    v_cancelled  TIMESTAMPTZ;
    v_province   TEXT;
    v_gift       TEXT;
    v_code       TEXT;
    v_order_id   INT;
    v_payos      BIGINT;
    v_guest      BOOLEAN;
BEGIN
    PERFORM setseed(0.20261007);

    CREATE TEMP TABLE tmp_p ON COMMIT DROP AS
        SELECT ROW_NUMBER() OVER (ORDER BY pr.product_id)::INT AS rn, pr.product_id, pr.name::TEXT AS name, pr.price
        FROM public.products pr;

    CREATE TEMP TABLE tmp_c ON COMMIT DROP AS
        SELECT ROW_NUMBER() OVER (ORDER BY pf.id)::INT AS rn, pf.id AS user_id, pf.full_name, pf.phone,
               pf.email, pf.default_address, pf.created_at
        FROM public.profiles pf
        WHERE pf.role = 'customer';

    CREATE TEMP TABLE tmp_items (rn INT PRIMARY KEY, quantity INT) ON COMMIT DROP;

    SELECT COUNT(*) INTO v_n_products FROM tmp_p;
    SELECT COUNT(*) INTO v_n_cust FROM tmp_c;

    IF v_n_cust = 0 THEN
        RAISE EXCEPTION 'Không có profile khách hàng nào (role = customer) để tạo đơn mẫu. Kiểm tra bảng public.profiles.';
    END IF;

    SELECT co.coupon_id INTO v_tet FROM public.coupons co WHERE co.code = 'TET2027';
    SELECT pf.id INTO v_admin FROM public.profiles pf WHERE pf.email = 'admin@huongque.vn';

    FOR i IN 1..60 LOOP
        v_created := v_now - make_interval(mins => 60 + FLOOR(random() * 29 * 24 * 60)::INT);
        v_guest   := random() < 0.10;

        SELECT c.user_id, c.full_name, c.phone, c.email, c.default_address, c.created_at
        INTO v_user, v_name, v_phone, v_email, v_addr, v_user_at
        FROM tmp_c c
        WHERE c.rn = 1 + FLOOR(random() * v_n_cust)::INT;

        IF v_guest THEN
            v_user  := NULL;
            v_name  := 'Khách vãng lai';
            v_phone := '0988' || LPAD(i::TEXT, 6, '0');
            v_email := 'khach.vanglai' || i || '@example.com';
            v_addr  := NULL;
        ELSIF v_created < v_user_at THEN
            v_created := v_user_at + INTERVAL '2 hours';
        END IF;

        -- Chốt an toàn: nếu vì lý do nào đó không lấy được profile thì vẫn KHÔNG ghi NULL
        -- vào các cột NOT NULL (customer_email, recipient_name, recipient_phone).
        IF v_user IS NULL AND NOT v_guest THEN
            v_name  := COALESCE(v_name, 'Khách vãng lai');
            v_phone := COALESCE(v_phone, '0988' || LPAD(i::TEXT, 6, '0'));
            v_email := COALESCE(v_email, 'khach.vanglai' || i || '@example.com');
        END IF;

        -- 1–3 sản phẩm, ưu tiên hộp quà Tết (rn 1–6)
        DELETE FROM tmp_items;
        n_items := 1 + FLOOR(random() * 3)::INT;
        k := 0;
        WHILE k < n_items LOOP
            IF random() < 0.35 THEN
                pick := 1 + FLOOR(random() * 6)::INT;
            ELSE
                pick := 1 + FLOOR(random() * v_n_products)::INT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM tmp_items t WHERE t.rn = pick) THEN
                INSERT INTO tmp_items (rn, quantity) VALUES (pick, 1 + FLOOR(random() * 2)::INT);
            END IF;
            k := k + 1;
        END LOOP;

        SELECT COALESCE(SUM(p.price * t.quantity), 0)::INT INTO v_subtotal
        FROM tmp_items t JOIN tmp_p p ON p.rn = t.rn;

        -- Trạng thái và phương thức
        r := random();
        v_status := CASE WHEN r < 0.55 THEN 'completed'
                         WHEN r < 0.70 THEN 'shipping'
                         WHEN r < 0.87 THEN 'confirmed'
                         ELSE 'cancelled' END;
        IF v_status = 'completed' AND v_created > v_now - INTERVAL '2 days' THEN
            v_status := 'shipping';
        END IF;
        v_method := CASE WHEN random() < 0.6 THEN 'payos' ELSE 'cod' END;

        -- Mã TET2027 cho ~25% đơn đủ điều kiện
        v_coupon   := NULL;
        v_discount := 0;
        IF v_subtotal >= 300000 AND random() < 0.25 AND v_tet IS NOT NULL THEN
            v_coupon   := v_tet;
            v_discount := LEAST(v_subtotal / 10, 100000);
        END IF;
        v_ship := public.fn_shipping_fee(v_subtotal);

        -- Mốc thời gian
        v_shipped   := LEAST(v_created + INTERVAL '6 hours', v_now);
        v_completed := v_created + make_interval(hours => 30 + FLOOR(random() * 40)::INT);
        v_completed := CASE WHEN v_status <> 'completed' THEN NULL
                            WHEN v_completed > v_now THEN v_now
                            ELSE v_completed END;
        v_cancelled := CASE WHEN v_status = 'cancelled' THEN v_created + INTERVAL '15 minutes' END;

        -- Thanh toán: PayOS đã thu tiền khi đơn được xác nhận; COD thu khi giao xong
        v_pay := CASE WHEN v_status = 'cancelled' THEN 'unpaid'
                      WHEN v_method = 'payos' THEN 'paid'
                      WHEN v_status = 'completed' THEN 'paid'
                      ELSE 'unpaid' END;
        v_paid := CASE WHEN v_pay = 'paid'
                       THEN CASE WHEN v_method = 'payos' THEN v_created + INTERVAL '2 minutes' ELSE v_completed END
                  END;

        v_province := (ARRAY['TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'Hà Nội', 'Hà Nội',
                             'Đà Nẵng', 'Bình Dương', 'Đồng Nai', 'Cần Thơ', 'Hải Phòng'])
                      [1 + FLOOR(random() * 10)::INT];

        v_gift := NULL;
        IF random() < 0.4 THEN
            v_gift := (ARRAY['Chúc mừng năm mới, an khang thịnh vượng!',
                             'Kính chúc gia đình một năm sức khỏe, vạn sự như ý.',
                             'Cảm ơn anh chị đã đồng hành cùng chúng em năm qua.'])
                      [1 + FLOOR(random() * 3)::INT];
        END IF;

        v_code := 'HQ' || TO_CHAR(v_created + INTERVAL '7 hours', 'YYMMDD') || LPAD(i::TEXT, 4, '0');

        INSERT INTO public.orders (order_code, user_id, customer_email, coupon_id, recipient_name, recipient_phone,
                                   province, shipping_address, gift_message, subtotal, discount_amount, shipping_fee,
                                   total, payment_method, payment_status, status, expires_at, paid_at,
                                   completed_at, cancelled_at, cancel_reason, payos_payment_link_id,
                                   created_at, updated_at)
        VALUES (v_code, v_user, v_email, v_coupon, v_name, v_phone, v_province,
                COALESCE(v_addr, 'Số ' || (1 + FLOOR(random() * 200)::INT) || ' đường số ' || (1 + FLOOR(random() * 30)::INT)),
                v_gift, v_subtotal, v_discount, v_ship, v_subtotal - v_discount + v_ship,
                v_method, v_pay, v_status,
                CASE WHEN v_method = 'payos' THEN v_created + INTERVAL '15 minutes' END,
                v_paid, v_completed, v_cancelled,
                CASE WHEN v_status = 'cancelled'
                     THEN CASE WHEN v_method = 'payos' THEN 'Quá hạn thanh toán' ELSE 'Khách hàng hủy đơn' END
                END,
                CASE WHEN v_method = 'payos' THEN 'seed-link-' || i END,
                v_created, COALESCE(v_completed, v_cancelled, v_created))
        RETURNING public.orders.order_id, public.orders.payos_order_code
        INTO v_order_id, v_payos;

        INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity)
        SELECT v_order_id, p.product_id, p.name, p.price, t.quantity
        FROM tmp_items t JOIN tmp_p p ON p.rn = t.rn;

        -- Lịch sử trạng thái
        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
        VALUES (v_order_id, NULL,
                CASE WHEN v_method = 'cod' THEN 'confirmed' ELSE 'pending_payment' END,
                v_user,
                CASE WHEN v_method = 'cod' THEN 'Đặt hàng, thanh toán khi nhận hàng'
                     ELSE 'Đặt hàng, đang chờ thanh toán PayOS' END,
                v_created);

        IF v_method = 'payos' AND v_status <> 'cancelled' THEN
            INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
            VALUES (v_order_id, 'pending_payment', 'confirmed', NULL, 'Thanh toán PayOS thành công', v_paid);
        END IF;

        IF v_status IN ('shipping', 'completed') THEN
            INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
            VALUES (v_order_id, 'confirmed', 'shipping', v_admin, 'Đã bàn giao cho đơn vị vận chuyển', v_shipped);
        END IF;

        IF v_status = 'completed' THEN
            INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
            VALUES (v_order_id, 'shipping', 'completed', v_admin, 'Giao hàng thành công', v_completed);
        END IF;

        IF v_status = 'cancelled' THEN
            INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note, changed_at)
            VALUES (v_order_id,
                    CASE WHEN v_method = 'cod' THEN 'confirmed' ELSE 'pending_payment' END,
                    'cancelled',
                    CASE WHEN v_method = 'cod' THEN v_user END,
                    CASE WHEN v_method = 'cod' THEN 'Khách hàng hủy đơn' ELSE 'Tự hủy do quá hạn thanh toán' END,
                    v_cancelled);
        END IF;

        -- Nhật ký PayOS cho đơn đã thanh toán
        IF v_method = 'payos' AND v_status <> 'cancelled' THEN
            INSERT INTO public.payments (order_id, provider, amount, transaction_no, is_success, raw_data, created_at)
            VALUES (v_order_id, 'payos', v_subtotal - v_discount + v_ship,
                    'FT' || LPAD(v_payos::TEXT, 10, '0'), TRUE,
                    jsonb_build_object('seed', TRUE, 'orderCode', v_payos, 'code', '00'),
                    v_paid);
        END IF;
    END LOOP;
END
$orders$;

-- Đồng bộ bộ đếm: lượt dùng mã và số lượng đã bán
UPDATE public.coupons c
SET used_count = (SELECT COUNT(*) FROM public.orders o
                  WHERE o.coupon_id = c.coupon_id AND o.status <> 'cancelled');

UPDATE public.products p
SET sold_count = COALESCE((SELECT SUM(oi.quantity)::INT
                           FROM public.order_items oi
                           JOIN public.orders o ON o.order_id = oi.order_id
                           WHERE oi.product_id = p.product_id AND o.status = 'completed'), 0);

/* ---------------------------------------------------------------------
   5. ĐÁNH GIÁ MẪU
   Khoảng 60% món trong đơn hoàn tất của khách có tài khoản.
   Trigger refresh_product_rating tự cập nhật điểm sản phẩm.
   --------------------------------------------------------------------- */
WITH candidates AS (
    SELECT o.user_id, oi.product_id, o.order_id, o.completed_at,
           ROW_NUMBER() OVER (PARTITION BY o.user_id, oi.product_id ORDER BY o.completed_at DESC) AS rn
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.order_id
    WHERE o.status = 'completed' AND o.user_id IS NOT NULL
)
INSERT INTO public.reviews (user_id, product_id, order_id, rating, comment, created_at)
SELECT cd.user_id, cd.product_id, cd.order_id,
       CASE WHEN ABS(hashtext((cd.order_id * 31 + cd.product_id)::TEXT)::BIGINT) % 10 < 6 THEN 5
            WHEN ABS(hashtext((cd.order_id * 31 + cd.product_id)::TEXT)::BIGINT) % 10 < 9 THEN 4
            ELSE 3 END,
       (ARRAY['Hàng đóng gói đẹp, giao nhanh, sẽ ủng hộ tiếp.',
              'Mua làm quà Tết biếu sếp, ai cũng khen.',
              'Đúng vị quê nhà, rất đáng tiền.',
              'Thiệp chúc viết tay rất có tâm, sản phẩm ngon.',
              'Giao hàng hơi chậm nhưng chất lượng tốt.',
              'Giá hợp lý, hộp quà sang trọng.'])
       [1 + ABS(hashtext((cd.order_id * 7 + cd.product_id)::TEXT)::BIGINT) % 6],
       LEAST(cd.completed_at + INTERVAL '12 hours', now())
FROM candidates cd
WHERE cd.rn = 1
  AND ABS(hashtext((cd.order_id * 13 + cd.product_id)::TEXT)::BIGINT) % 10 < 6;

/* ---------------------------------------------------------------------
   6. KIỂM TRA NHANH
   --------------------------------------------------------------------- */
SELECT 'profiles'               AS bang, COUNT(*) AS so_dong FROM public.profiles
UNION ALL SELECT 'categories',             COUNT(*) FROM public.categories
UNION ALL SELECT 'products',               COUNT(*) FROM public.products
UNION ALL SELECT 'product_images',         COUNT(*) FROM public.product_images
UNION ALL SELECT 'coupons',                COUNT(*) FROM public.coupons
UNION ALL SELECT 'banners',                COUNT(*) FROM public.banners
UNION ALL SELECT 'orders',                 COUNT(*) FROM public.orders
UNION ALL SELECT 'order_items',            COUNT(*) FROM public.order_items
UNION ALL SELECT 'order_status_history',   COUNT(*) FROM public.order_status_history
UNION ALL SELECT 'payments',               COUNT(*) FROM public.payments
UNION ALL SELECT 'reviews',                COUNT(*) FROM public.reviews
UNION ALL SELECT 'newsletter_subscribers', COUNT(*) FROM public.newsletter_subscribers;

-- Kiểm tra: không còn đơn VNPay, phương thức chỉ còn cod/payos
SELECT payment_method, COUNT(*) AS so_don
FROM public.orders
GROUP BY payment_method
ORDER BY payment_method;
