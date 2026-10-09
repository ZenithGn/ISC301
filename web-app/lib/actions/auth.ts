'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { registerSchema, loginSchema, sanitizeNextUrl } from '@/lib/validations';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@/lib/validations/auth';

export type ActionResponse = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const CART_SESSION_COOKIE = 'cart_session';
const GENERIC_AUTH_ERROR = 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Gộp giỏ hàng khách vãng lai vào tài khoản sau khi đăng nhập.
 * Best-effort: lỗi gộp giỏ KHÔNG được chặn việc đăng nhập.
 */
async function mergeGuestCart(): Promise<void> {
  try {
    const sessionId = (await cookies()).get(CART_SESSION_COOKIE)?.value;
    if (!sessionId) return;
    const supabase = await createClient();
    await supabase.rpc('cart_merge_guest', { p_session_id: sessionId });
  } catch (error) {
    console.error('[auth] Không gộp được giỏ hàng khách vãng lai:', error);
  }
}

/**
 * C09: Đăng ký tài khoản khách hàng.
 * Trigger `handle_new_user` trong database tạo bản ghi `profiles` với role 'customer'.
 */
export async function registerAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = registerSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      success: false,
      message: 'Dữ liệu đăng ký không hợp lệ',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName, phone } = validated.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: `${appUrl()}/auth/callback`,
      },
    });

    if (error) {
      console.error('[auth] signUp lỗi:', error.message);
      return {
        success: false,
        message:
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already been registered')
            ? 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc đặt lại mật khẩu.'
            : 'Không thể đăng ký. Vui lòng kiểm tra thông tin và thử lại.',
      };
    }

    // Nếu Supabase đã bật xác nhận email: chưa có session, yêu cầu khách xác nhận email.
    if (!data.session) {
      return {
        success: true,
        message:
          'Đăng ký thành công! Vui lòng kiểm tra hộp thư để xác nhận email, sau đó đăng nhập.',
      };
    }

    await mergeGuestCart();
  } catch (error) {
    console.error('[auth] registerAction lỗi:', error);
    return { success: false, message: 'Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.' };
  }

  redirect('/');
}

/**
 * C08: Đăng nhập. Sai mật khẩu luôn trả về CÙNG một thông báo chung
 * để không tiết lộ email nào có tồn tại trong hệ thống.
 */
export async function loginAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });

  if (!validated.success) {
    return {
      success: false,
      message: 'Vui lòng điền đầy đủ và đúng định dạng thông tin.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password, next } = validated.data;
  const redirectTarget = sanitizeNextUrl(next);
  /** Có `?next=` do người dùng bị chặn ở đâu đó ⇒ không tự ý đổi đích đến. */
  const hadExplicitNext = Boolean(next && next.trim() && next.trim() !== '/');

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes('email not confirmed')) {
        return {
          success: false,
          message: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và xác nhận trước khi đăng nhập.',
        };
      }
      return { success: false, message: GENERIC_AUTH_ERROR };
    }

    await mergeGuestCart();
  } catch (error) {
    console.error('[auth] loginAction lỗi:', error);
    return { success: false, message: GENERIC_AUTH_ERROR };
  }

  /**
   * Quản trị viên vào thẳng dashboard (/admin).
   * Nếu khách vào bằng link có `?next=...` (ví dụ bị chặn ở /admin) thì tôn trọng `next`.
   * Lưu ý: phải gọi `redirect()` NGOÀI try/catch, nếu không NEXT_REDIRECT sẽ bị nuốt.
   */
  let isAdminUser = false;
  if (!hadExplicitNext) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc('is_admin');
      isAdminUser = data === true;
    } catch {
      isAdminUser = false;
    }
  }

  redirect(isAdminUser ? '/admin' : redirectTarget);
}

/** Đăng xuất: hủy session Supabase và quay về trang chủ. */
export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[auth] logoutAction lỗi:', error);
  }
  redirect('/');
}

/**
 * C10: yêu cầu email đặt lại mật khẩu.
 * Luôn trả về cùng một thông báo, không tiết lộ email có tồn tại hay không.
 */
export async function requestResetAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!validated.success) {
    return {
      success: false,
      message: 'Email không hợp lệ',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const genericMessage =
    'Nếu email này tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.';

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(validated.data.email, {
      redirectTo: `${appUrl()}/auth/callback?next=/dat-lai-mat-khau`,
    });
  } catch (error) {
    console.error('[auth] requestResetAction lỗi:', error);
  }

  return { success: true, message: genericMessage };
}

/** C10: đặt mật khẩu mới (đã có session từ /auth/callback). */
export async function resetPasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      success: false,
      message: 'Mật khẩu không hợp lệ',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.',
      };
    }

    const { error } = await supabase.auth.updateUser({ password: validated.data.password });
    if (error) {
      return { success: false, message: 'Không đặt lại được mật khẩu. Vui lòng thử lại.' };
    }

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  } catch (error) {
    console.error('[auth] resetPasswordAction lỗi:', error);
    return { success: false, message: 'Có lỗi xảy ra. Vui lòng thử lại.' };
  }
}

/** C11: cập nhật hồ sơ. Trường `role` KHÔNG bao giờ được nhận từ form. */
export async function updateProfileAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = updateProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
  });

  if (!validated.success) {
    return {
      success: false,
      message: 'Dữ liệu không hợp lệ',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    /**
     * Bảng profiles chỉ cấp UPDATE cho các cột (full_name, phone, default_address)
     * — xem `GRANT UPDATE (full_name, phone, default_address)` trong huongque_db_full.sql.
     * `updated_at` do trigger set_updated_at tự cập nhật, KHÔNG gửi từ client
     * (gửi thêm sẽ bị "permission denied for column").
     */
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: validated.data.fullName,
        phone: validated.data.phone,
        default_address: validated.data.defaultAddress,
      })
      .eq('id', user.id);

    if (error) {
      console.error('[auth] updateProfile lỗi:', error.message);
      return { success: false, message: 'Không lưu được thông tin. Vui lòng thử lại.' };
    }

    return { success: true, message: 'Đã cập nhật thông tin tài khoản.' };
  } catch (error) {
    console.error('[auth] updateProfileAction lỗi:', error);
    return { success: false, message: 'Có lỗi xảy ra. Vui lòng thử lại.' };
  }
}

/** C11: đổi mật khẩu – xác thực lại mật khẩu hiện tại trước khi đổi. */
export async function changePasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const validated = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return {
      success: false,
      message: 'Dữ liệu không hợp lệ',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return { success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    // Xác thực mật khẩu hiện tại
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validated.data.currentPassword,
    });

    if (signInError) {
      return { success: false, message: 'Mật khẩu hiện tại không đúng.' };
    }

    const { error } = await supabase.auth.updateUser({ password: validated.data.password });
    if (error) {
      return { success: false, message: 'Không đổi được mật khẩu. Vui lòng thử lại.' };
    }

    return { success: true, message: 'Đổi mật khẩu thành công.' };
  } catch (error) {
    console.error('[auth] changePasswordAction lỗi:', error);
    return { success: false, message: 'Có lỗi xảy ra. Vui lòng thử lại.' };
  }
}
