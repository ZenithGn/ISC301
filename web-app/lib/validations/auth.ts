import { z } from 'zod';

/** Làm sạch & kiểm tra an toàn cho return URL (?next=): chỉ nhận đường dẫn nội bộ. */
export function sanitizeNextUrl(next: string | null | undefined): string {
  if (!next) return '/';
  const trimmed = next.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  return '/';
}

const passwordSchema = z
  .string()
  .min(8, { message: 'Mật khẩu phải có tối thiểu 8 ký tự' })
  .regex(/[A-Za-z]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ cái' })
  .regex(/[0-9]/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ số' });

const phoneSchema = z
  .string()
  .trim()
  .regex(/^0[0-9]{9}$/, { message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0' });

/** C10: yêu cầu đặt lại mật khẩu. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Địa chỉ email không hợp lệ' }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** C10: đặt mật khẩu mới (sau khi auth/callback đã trao đổi code thành session). */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** C11: cập nhật hồ sơ (role KHÔNG bao giờ được đưa vào form). */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
    .max(100, { message: 'Họ tên không được vượt quá 100 ký tự' }),
  phone: phoneSchema,
  /** Cột `profiles.default_address` — được phép UPDATE theo GRANT của DB. */
  defaultAddress: z
    .string()
    .trim()
    .max(300, { message: 'Địa chỉ mặc định tối đa 300 ký tự' })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** C11: đổi mật khẩu khi đã đăng nhập (yêu cầu nhập lại mật khẩu hiện tại). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Vui lòng nhập mật khẩu hiện tại' }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
