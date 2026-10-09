import { z } from 'zod';

// Làm sạch & kiểm tra an toàn cho return URL (?next=)
// Chỉ chấp nhận đường dẫn nội bộ (bắt đầu bằng /, không chứa // để chống open redirect)
export function sanitizeNextUrl(next: string | null | undefined): string {
  if (!next) return '/';
  const trimmed = next.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  return '/';
}

// C09: Đăng ký
// Họ tên, email, SĐT, mật khẩu (tối thiểu 8 ký tự, có chữ và số)
export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ tên không được vượt quá 100 ký tự' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Địa chỉ email không hợp lệ' }),
  phone: z
    .string()
    .trim()
    .regex(/^0[0-9]{9}$/, { message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0' }),
  password: z
    .string()
    .min(8, { message: 'Mật khẩu phải có tối thiểu 8 ký tự' })
    .regex(/[A-Za-z]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ cái' })
    .regex(/[0-9]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

// C08: Đăng nhập
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Email không hợp lệ' }),
  password: z
    .string()
    .min(1, { message: 'Vui lòng nhập mật khẩu' }),
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// C03: Tìm kiếm sản phẩm
// Làm sạch q: tối đa 100 ký tự, loại bỏ ký tự lạ độc hại, chống SQL / query injection
export const searchQuerySchema = z.object({
  q: z
    .string()
    .max(100, { message: 'Từ khóa tìm kiếm tối đa 100 ký tự' })
    .transform((val) => val.replace(/[<>{}[\]\\^~]/g, '').trim())
    .optional()
    .default(''),
  mien: z.enum(['all', 'bac', 'trung', 'nam', 'ba_mien']).optional().default('all'),
  danh_muc: z.string().optional().default('all'),
  gia_min: z.coerce.number().min(0).optional(),
  gia_max: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'featured']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export type SearchQueryParams = z.infer<typeof searchQuerySchema>;
