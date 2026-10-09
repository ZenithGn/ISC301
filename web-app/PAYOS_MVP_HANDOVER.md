# Hương Quê – Bàn giao MVP (PayOS)

Cập nhật theo `huongque_db_full.sql` + `huongque_seed_full.sql` (bản 09/10/2026) — bản DB này
**đã bao gồm toàn bộ phần PayOS**, nên không còn migration PayOS riêng.

Kết quả kiểm chứng tự động (chạy trong `web-app/`):

| Lệnh | Kết quả |
|---|---|
| `npx tsc --noEmit` | **PASS** – 0 lỗi TypeScript |
| `npx eslint app lib components scripts` | **0 error**, 11 warning `@next/next/no-img-element` (theo pattern `<img>` sẵn có) |
| `npm run verify:payos` | **14/14 PASS** – khớp bộ test vector CHÍNH THỨC của `@payos/node` |

---

## 1. Thứ tự chạy SQL (chỉ còn 2 file)

```
1. huongque_db_full.sql     -- schema + RLS + TOÀN BỘ hàm (đã gồm PayOS + 2 hàm C12/bản tin)
2. huongque_seed_full.sql   -- dữ liệu mẫu + TÀI KHOẢN DEMO (kể cả admin)
```

Cả hai file **đã được vá để chạy lại nhiều lần vẫn được**:

| Đã sửa trong `huongque_db_full.sql` | Đã sửa trong `huongque_seed_full.sql` |
|---|---|
| Thêm `DROP POLICY IF EXISTS` trước cả **20** `CREATE POLICY` ⇒ hết lỗi `42710 policy already exists` khi chạy lại (trước đây chỉ bảng/hàm/trigger/index là idempotent). | Bỏ guard `RETURN` sớm của khối `$auth$`: thay bằng `CONTINUE WHEN EXISTS (...)` theo **từng email**, nên vẫn tạo đủ 5 khách demo kể cả khi `admin@huongque.vn` đã tồn tại (đây chính là nguyên nhân lỗi `23502 customer_email`). |
| Thêm `fn_list_user_orders()` (D16b) — nguồn dữ liệu cho **C12** `/tai-khoan/don-hang`, vì bảng `orders` không cấp SELECT cho khách. | Thêm khối **bù hồ sơ** sau vòng lặp: điền `phone`/`default_address`/`created_at` và `role='admin'` cho tài khoản demo đã tồn tại (kèm tạo bù profile nếu trigger chưa chạy). |
| Thêm `hq_subscribe_newsletter(p_email, p_consent)` (D16c) trả `unsubscribe_token`, vì `subscribe_newsletter` gốc trả `VOID` ⇒ app không có token để gửi link hủy đăng ký. | Thêm guard `IF v_n_cust = 0 THEN RAISE EXCEPTION ...` báo đúng bệnh thay vì lỗi NOT NULL khó hiểu. |
| — | Thêm "chốt an toàn": nếu không lấy được profile thì dùng thông tin khách vãng lai, **không bao giờ** ghi NULL vào `customer_email`/`recipient_name`/`recipient_phone`. |

> Bản gốc trước khi vá được giữ tại `huongque_db_full.original.sql` và `huongque_seed_full.original.sql`
> trong thư mục Downloads.

---

## 2. Tài khoản admin

`huongque_seed_full.sql` **đã tạo sẵn tài khoản admin** trong `auth.users` + `auth.identities`
(mật khẩu băm bằng `extensions.crypt(..., gen_salt('bf'))`), rồi promote `profiles.role = 'admin'`.

- Đăng nhập: **admin@huongque.vn / Admin@123** — chỉ dùng cho dev/demo.
- Khách mẫu: `an.nguyen@example.com` … `ha.hoang@example.com` / **Khach@123**.
- ⚠️ Trước khi lên production: **đổi mật khẩu admin** và **bỏ khối `$auth$`** khỏi seed
  (checklist go-live: không dùng `Admin@123`). Trên production nên tạo admin qua Dashboard rồi chạy
  `UPDATE public.profiles SET role = 'admin' WHERE email = '...';`.
- `handle_new_user` trong DB luôn gán `role = 'customer'`, không hardcode admin theo email ✓.

---

## 3. Biến môi trường

Sao chép `web-app/.env.example` → `.env.local` và điền: `NEXT_PUBLIC_APP_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`,
`RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `NEXT_PUBLIC_GA_ID`.
(`NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` đã có sẵn.)

Đăng ký webhook PayOS (một lần, cần URL HTTPS công khai):
`POST https://api-merchant.payos.vn/confirm-webhook` với header `x-client-id`, `x-api-key`
và body `{"webhookUrl":"https://huongque.vn/api/payos/webhook"}` (hoặc dùng `confirmWebhook()`
đã export trong `lib/payos.ts`). Cron đã khai báo trong `web-app/vercel.json` (`*/5 * * * *`).

---

## 4. Những chỗ code đã được sửa để khớp DB thật

| # | Vấn đề | Xử lý |
|---|---|---|
| 1 | `record_payos_result` thật chỉ có **4 tham số** `(p_payos_order_code, p_amount, p_reference, p_raw)` — không có `p_paid_at` | Bỏ `p_paid_at` ở `app/api/payos/webhook/route.ts` và `lib/actions/admin/orders.ts` |
| 2 | `get_order_detail` **không trả `customer_email`** ⇒ webhook không có email để gửi xác nhận | Webhook đọc thẳng `orders` + `order_items` bằng service_role |
| 3 | `place_order` bản mới **đã nhận `'payos'`** và trả `payos_order_code` | Bỏ hàm bọc tạm `hq_place_order_payos`, gọi `place_order` trực tiếp cho cả COD và PayOS |
| 4 | `update_order_status` chỉ cho `(pending_payment\|confirmed) → cancelled`, `confirmed → shipping`, `shipping → completed` | Sửa `ORDER_TRANSITIONS`: `pending_payment` **không** được xác nhận thủ công (chỉ webhook PayOS) |
| 5 | `profiles` chỉ GRANT UPDATE `(full_name, phone, default_address)` — gửi thêm `updated_at` sẽ bị *permission denied* | Bỏ `updated_at` khỏi payload (trigger `set_updated_at` tự cập nhật), thêm ô **địa chỉ mặc định** |
| 6 | `subscribe_newsletter` trả `VOID` ⇒ không có token hủy đăng ký | Dùng `hq_subscribe_newsletter` (đã có trong db_full.sql) và dùng token trả về |
| 7 | `get_order_detail` trả cờ `items[].has_reviewed`, không trả mảng `reviews` | Adapter đọc `has_reviewed` để C14 khoá nút "Đánh giá" đúng |

---

## 5. Đã triển khai (C01–C14, A01–A06, F11, F16)

- **Khách:** trang chủ (banner thật từ `banners`), danh sách/tìm kiếm giữ bộ lọc trên URL, chi tiết
  sản phẩm (gallery, tồn kho, mua kèm/nâng cấp, đánh giá, GA4 `view_item`), giỏ hàng, thanh toán
  COD/PayOS, kết quả thanh toán polling 60s (GA4 `purchase`), đăng ký/đăng nhập/quên–đặt lại mật khẩu,
  tài khoản, đơn của tôi, chi tiết đơn + huỷ đơn, đánh giá, **tra cứu đơn cho khách vãng lai**,
  hủy đăng ký bản tin (phải bấm xác nhận), FAQ/đổi trả/bảo mật/vận chuyển.
- **Quản trị:** A01 dashboard, A02/A03 sản phẩm + upload ảnh, A04 danh mục, A05 đơn hàng
  (lọc + đổi trạng thái + **đối soát PayOS thủ công**), A06 mã giảm giá, F11 banner.
- **PayOS:** `lib/payos.ts` gọi API merchant v2 bằng `fetch` + `node:crypto` (**HMAC-SHA256**, không
  dùng SDK), webhook xác thực chữ ký + chống trùng + kiểm tra số tiền, cron huỷ đơn quá hạn.
- **Bảo mật:** đã bỏ backdoor đăng nhập admin bằng mật khẩu cứng và xoá `lib/jwt.ts`; quyền chỉ dựa
  trên session Supabase + `profiles.role` + `is_admin()`; security headers; `robots.ts`.

**Cố tình không làm** (theo phạm vi đã chốt): VNPay, F08 VietQR thủ công, `bank_transfer`,
live chat, ticket khiếu nại, giới hạn mã theo tài khoản, cron đối soát PayOS tự động, CSP nghiêm ngặt
+ Upstash rate limit, biểu đồ nâng cao, GA4 chi tiết, phí ship theo vùng, xuất Excel.

---

## 6. Việc cần kiểm tra trên môi trường thật

1. Chạy 2 file SQL theo thứ tự mục 1, rồi `npm run dev` và thử các luồng chính.
2. PayOS sandbox: đặt đơn PayOS → thanh toán → kiểm tra webhook trả 200 và đơn chuyển `confirmed`;
   gửi lại cùng webhook → `ALREADY_PAID`; sửa số tiền → `AMOUNT_MISMATCH`.
3. Kiểm tra webhook với chữ ký sai phải trả **400**:
   ```bash
   curl -i -X POST http://localhost:3000/api/payos/webhook -H "Content-Type: application/json" \
     -d '{"code":"00","success":true,"data":{"orderCode":100000001,"amount":1000},"signature":"sai"}'
   ```
4. Đơn PayOS quá hạn → cron `cancel_expired_orders()` huỷ và hoàn tồn kho.
5. Upload ảnh sản phẩm (bucket `product-images`), đăng ký bản tin → nhận email có link huỷ.
6. ⚠️ Chưa kiểm chứng được trong môi trường soạn code: máy không có mạng nên không chạy được
   `npm run dev/build` (next/font cần mạng). Toàn bộ kiểm chứng ở trên là `tsc` + `eslint` +
   14 test vector chữ ký PayOS + đọc/đối chiếu trực tiếp SQL.

---

## 7. Kết quả kiểm chứng RUNTIME (đã chạy thật, không chỉ đọc code)

Môi trường đã có mạng nên lần này chạy được `npm run build` và test thật trên DB mới
(`nukannouvmnqvcuoumqz`):

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | **PASS** – 34 route + middleware, TypeScript pass, `sitemap.xml` là **static** (revalidate 6h) |
| `npx tsc --noEmit` / `npx eslint` | **0 lỗi** / **0 error**, 11 warning `<img>` theo pattern sẵn có |
| `npm run verify:payos` | **14/14 PASS** |
| Seed trên DB mới | 20 sản phẩm · 5 danh mục · **60 đơn** · 105 dòng hàng · 35 bản ghi thanh toán · 18 đánh giá · 4 mã giảm giá · 3 banner · 3 bản tin · **1 admin + 5 khách** |
| Đăng nhập tài khoản seed | `admin@huongque.vn/Admin@123` và 5 khách `Khach@123` đăng nhập **thành công** |
| 13 route công khai | tất cả **HTTP 200** |
| `/admin`, `/tai-khoan` khi chưa đăng nhập | **307** → `/dang-nhap` |
| `/api/cron/cancel-expired` không có `CRON_SECRET` | **401** |
| `/api/payos/status?order=...` mã đơn lạ | **404** |
| Webhook chữ ký SAI | **400** `{"error":"invalid signature"}` |
| Webhook chữ ký ĐÚNG, đơn đã trả tiền | **200** `{"result":"ALREADY_PAID"}` |
| Webhook chữ ký ĐÚNG, mã đơn không tồn tại | **200** `{"result":"ORDER_NOT_FOUND"}` |
| Webhook thử khi đăng ký URL | **200** `{"ok":true}` |
| Dữ liệu sau test webhook | **không đổi** (payments vẫn 35, đơn test vẫn `completed/paid`) |
| RLS: khách đọc `orders` | chỉ thấy **3 đơn của chính mình** |
| RPC `fn_list_user_orders()` | trả đúng 10 key như code dùng |
| RPC `get_order_detail(code, phone)` | `order` (22 key), `items` (có `has_reviewed`), `history` — **khớp adapter trong code** |
| Tra cứu vãng lai SAI SĐT | bị từ chối bằng **cùng thông báo** `Không tìm thấy đơn hàng` |
| RPC admin bằng token khách | bị từ chối: `Chỉ quản trị viên mới xem được thống kê` |
| `admin_dashboard_summary()` | `revenue=57.462.700`, `order_count=54`, `avg_order_value=1.064.124`, `new_customers=3`, `orders_to_process=20`, `pending_payment_count=0` |
| `admin_payment_mix()` | payos 35 đơn / 37.253.400₫ (64,8%), cod 19 đơn / 20.209.300₫ (35,2%) |

**Bug tìm được nhờ chạy thật (đã sửa)**: `admin_daily_revenue()`, `admin_top_products()`,
`admin_payment_mix()` trả **mảng ở cấp gốc**, nên `getArrayByKeys()` trả `[]` ⇒ biểu đồ 30 ngày,
top sản phẩm và tỷ lệ thanh toán sẽ **trống** dù 6 thẻ số vẫn đúng. Đã thêm `rowsFrom()` nhận cả
mảng cấp gốc và bổ sung alias thật (`sale_date`, `quantity_sold`, `orders_to_process`,
`pending_payment_count`).

**Chưa kiểm chứng được**: phần HTML đã đăng nhập (dashboard/A05/C12 hiển thị số liệu) — không dựng
được cookie session nội bộ của `@supabase/ssr` để curl, cần mở trình duyệt kiểm tra.
Script test webhook: `web-app/scripts/test-payos-webhook.ts`.