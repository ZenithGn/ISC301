import { z } from 'zod';

/**
 * Hợp đồng dữ liệu dùng chung cho luồng C05 (giỏ hàng) → C06 (thanh toán) → C07 (kết quả PayOS).
 *
 * File này CHỈ phụ thuộc `zod` nên import được ở cả Server Action, Route Handler
 * và Client Component. Hình dạng JSON của các RPC Postgres chưa được khoá bằng
 * schema dump, vì vậy các interface ở đây là "view model" đã chuẩn hoá — việc
 * đọc JSON thô được làm phòng thủ bằng `@/lib/json-utils`.
 */

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu dùng chung                                             */
/* ------------------------------------------------------------------ */

export interface CartItemView {
  productId: number;
  name: string;
  slug: string | null;
  thumbnailUrl: string | null;
  unit: string | null;
  price: number;
  quantity: number;
  stock: number;
  /** false ⇒ dòng hàng không đủ điều kiện thanh toán (hết hàng / vượt tồn kho). */
  available: boolean;
  lineTotal: number;
}

export interface CartCouponView {
  code: string;
  valid: boolean;
  message: string | null;
}

export interface CartView {
  items: CartItemView[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  coupon: CartCouponView | null;
  freeShippingFrom: number;
  itemCount: number;
}

export interface CartActionResult {
  ok: boolean;
  error?: string;
  cart?: CartView;
}

export interface CheckoutFormValues {
  recipientName: string;
  recipientPhone: string;
  customerEmail: string;
  province: string;
  shippingAddress: string;
  note: string;
  giftMessage: string;
  couponCode: string;
  paymentMethod: 'cod' | 'payos';
}

export interface PlaceOrderState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** URL để client chuyển hướng: nội bộ (/thanh-toan/ket-qua...) hoặc PayOS checkoutUrl. */
  redirectTo?: string;
  orderCode?: string;
}

export interface PaymentStatusView {
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  expires_at: string | null;
}

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: 'cod' | 'payos';
  label: string;
  description: string;
}> = [
  {
    value: 'cod',
    label: 'Thanh toán khi nhận hàng (COD)',
    description: 'Thanh toán tiền mặt cho nhân viên giao hàng khi nhận quà.',
  },
  {
    value: 'payos',
    label: 'Chuyển khoản / Ví điện tử qua PayOS',
    description: 'Quét mã QR hoặc chuyển khoản an toàn, đơn được xác nhận tự động.',
  },
];

/** Số tiền miễn phí vận chuyển mặc định (đã xác nhận từ RPC get_cart là 500.000đ). */
export const DEFAULT_FREE_SHIPPING_FROM = 500000;

/* ------------------------------------------------------------------ */
/* Schema dùng cho Server Action giỏ hàng                              */
/* ------------------------------------------------------------------ */

export const productIdSchema = z.coerce
  .number()
  .int({ message: 'Sản phẩm không hợp lệ' })
  .positive({ message: 'Sản phẩm không hợp lệ' });

export const cartQuantitySchema = z.coerce
  .number()
  .int({ message: 'Số lượng phải là số nguyên' })
  .min(0, { message: 'Số lượng không hợp lệ' })
  .max(99, { message: 'Mỗi sản phẩm tối đa 99 phần' });

export const addToCartSchema = z.object({
  productId: productIdSchema,
  quantity: cartQuantitySchema.min(1, { message: 'Số lượng tối thiểu là 1' }),
});

export const setQuantitySchema = z.object({
  productId: productIdSchema,
  quantity: cartQuantitySchema,
});

export const couponCodeFieldSchema = z
  .string()
  .trim()
  .max(50, { message: 'Mã giảm giá tối đa 50 ký tự' })
  .optional();

/* ------------------------------------------------------------------ */
/* Schema dùng cho C06 – form thanh toán                               */
/* ------------------------------------------------------------------ */

export const checkoutFormSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, { message: 'Vui lòng nhập tên người nhận (ít nhất 2 ký tự)' })
    .max(100, { message: 'Tên người nhận tối đa 100 ký tự' }),
  recipientPhone: z
    .string()
    .trim()
    .regex(/^0[0-9]{9}$/, {
      message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0',
    }),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Địa chỉ email không hợp lệ' })
    .or(z.literal(''))
    .optional(),
  province: z
    .string()
    .trim()
    .min(2, { message: 'Vui lòng nhập tỉnh/thành nhận quà' })
    .max(100, { message: 'Tỉnh/thành tối đa 100 ký tự' }),
  shippingAddress: z
    .string()
    .trim()
    .min(5, { message: 'Địa chỉ quá ngắn, vui lòng nhập số nhà và đường' })
    .max(255, { message: 'Địa chỉ tối đa 255 ký tự' }),
  note: z.string().trim().max(500, { message: 'Ghi chú tối đa 500 ký tự' }).optional(),
  giftMessage: z
    .string()
    .trim()
    .max(300, { message: 'Lời chúc thiệp tối đa 300 ký tự' })
    .optional(),
  couponCode: z.string().trim().max(50, { message: 'Mã giảm giá tối đa 50 ký tự' }).optional(),
  paymentMethod: z.enum(['cod', 'payos'], { message: 'Phương thức thanh toán không hợp lệ' }),
});

/** Dữ liệu client gửi lên (email có thể rỗng với khách đã đăng nhập). */
export type CheckoutInput = z.input<typeof checkoutFormSchema>;
/** Dữ liệu đã qua transform (email viết thường, chuỗi đã trim). */
export type CheckoutData = z.infer<typeof checkoutFormSchema>;

/* ------------------------------------------------------------------ */
/* Schema dùng cho /api/payos/status                                   */
/* ------------------------------------------------------------------ */

export const paymentStatusQuerySchema = z.object({
  order: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{4,32}$/, { message: 'Mã đơn hàng không hợp lệ' }),
  phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{9}$/, { message: 'Số điện thoại không hợp lệ' })
    .optional(),
});

export type PaymentStatusQuery = z.infer<typeof paymentStatusQuerySchema>;

/* ------------------------------------------------------------------ */
/* Tiện ích                                                            */
/* ------------------------------------------------------------------ */

/**
 * Chuyển ZodError thành map `tênTrường -> thông báo` để trả về cho Client Component.
 * Không dùng `error.flatten()` để tránh phụ thuộc API cụ thể của zod 4.
 */
export function toFieldErrors(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>;
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
