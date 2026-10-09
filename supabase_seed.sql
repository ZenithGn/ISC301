/* =====================================================================
   HƯƠNG QUÊ – DỮ LIỆU SEED MẪU CHO SUPABASE
   Danh mục và 20+ Sản phẩm mẫu đặc sản Quà Tết 3 miền
   ===================================================================== */

-- 1. SEED DANH MỤC
INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
 ('Hộp quà Tết',        'hop-qua-tet',  'Hộp quà đặc sản ba miền cao cấp, kèm thiệp chúc Tết viết tay', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80', 1),
 ('Bánh mứt',           'banh-mut',     'Bánh, kẹo, mứt truyền thống sum vầy ngày Tết',                 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80', 2),
 ('Trà & Cà phê',       'tra-ca-phe',   'Trà Thái Nguyên, trà sen Tây Hồ, cà phê Tây Nguyên đậm đà',    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', 3),
 ('Hạt & Đồ khô',       'hat-kho',      'Hạt điều rang muối, mắc ca, khô bò cay nồng nhâm nhi',         'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80', 4),
 ('Gia vị & Nước chấm', 'gia-vi',       'Nước mắm Phú Quốc, tỏi Lý Sơn, gia vị tinh hoa vùng miền',     'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. SEED SẢN PHẨM (20 sản phẩm mẫu)
INSERT INTO public.products (category_id, name, slug, short_description, origin, producer, region, unit, price, compare_at_price, stock, thumbnail_url, is_featured, is_active)
SELECT c.category_id, v.name, v.slug, v.short_desc, v.origin, v.producer, v.region, v.unit, v.price, v.compare_at, v.stock, v.thumbnail, v.is_featured, TRUE
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
JOIN public.categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO NOTHING;
