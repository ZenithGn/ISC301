import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { Profile } from './types';

export interface AuthUserResult {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  profile: Profile | null;
}

/**
 * Kết quả đọc phiên. Ba trạng thái PHẢI phân biệt được:
 *  - `authenticated`: có phiên hợp lệ.
 *  - `anonymous`    : chắc chắn chưa đăng nhập (không có session/cookie).
 *  - `unavailable`  : KHÔNG đọc được phiên do lỗi tạm thời (timeout, mạng chập,
 *                     Supabase cold start). Tuyệt đối KHÔNG coi đây là đăng xuất.
 */
export type SessionState =
  | { status: 'authenticated'; auth: AuthUserResult }
  | { status: 'anonymous' }
  | { status: 'unavailable'; reason: string };

/** Lỗi ném ra khi không đọc được phiên ⇒ `app/error.tsx` hiện nút "Thử lại". */
export class AuthUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'TimeoutError' || /aborted|timeout/i.test(error.message)
      ? 'Máy chủ xác thực phản hồi quá chậm'
      : error.message;
  }
  return 'Lỗi không xác định khi đọc phiên đăng nhập';
}

/** Dựng AuthUserResult từ user đã xác thực + hồ sơ trong bảng profiles. */
async function buildAuthResult(user: User): Promise<AuthUserResult> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const userProfile = (profile as Profile | null) ?? {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string) || '',
    phone: (user.user_metadata?.phone as string) || null,
    role: 'customer' as const,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      user_metadata: user.user_metadata,
    },
    profile: userProfile,
  };
}

/**
 * Đọc phiên một lần cho MỖI request (React `cache`).
 * Nhờ cache, Header + page + layout trong cùng một request chỉ tốn 1 lần gọi Supabase
 * thay vì 2–3 lần như trước.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Có phản hồi rõ ràng "không có phiên" ⇒ anonymous (không phải lỗi tạm thời).
    if (!error && !user) return { status: 'anonymous' };
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    if (!user) return { status: 'anonymous' };

    const auth = await buildAuthResult(user);
    return { status: 'authenticated', auth };
  } catch (error) {
    // Lỗi tạm thời: KHÔNG xoá cookie, KHÔNG coi là đăng xuất.
    console.error('[auth] Không đọc được phiên:', describeError(error));
    return { status: 'unavailable', reason: describeError(error) };
  }
});

/**
 * Tương thích ngược cho các UI chỉ cần "có người dùng hay không"
 * (Header, trang chủ…). Trả `null` khi chưa đăng nhập HOẶC khi tạm thời không đọc được.
 * Muốn phân biệt hai trường hợp này thì dùng `getSessionState()`.
 */
export async function getCurrentUser(): Promise<AuthUserResult | null> {
  const state = await getSessionState();
  return state.status === 'authenticated' ? state.auth : null;
}

/** Chờ ngắn rồi thử lại 1 lần — dành cho lỗi mạng thoáng qua. */
async function readSessionWithRetry(): Promise<SessionState> {
  const first = await getSessionState();
  if (first.status !== 'unavailable') return first;

  await new Promise((resolve) => setTimeout(resolve, 250));
  const second = await getSessionState();
  return second;
}

/**
 * Server guard: yêu cầu đăng nhập.
 *  - `anonymous`    → redirect /dang-nhap?next=...
 *  - `unavailable`  → NÉM AuthUnavailableError (app/error.tsx hiện "Thử lại"),
 *                     KHÔNG redirect, KHÔNG xoá phiên.
 */
export async function requireUser(nextPath?: string): Promise<AuthUserResult> {
  const state = await readSessionWithRetry();

  if (state.status === 'authenticated') return state.auth;

  if (state.status === 'unavailable') {
    throw new AuthUnavailableError(state.reason);
  }

  const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  redirect(`/dang-nhap${nextQuery}`);
}

/** Server guard: yêu cầu quyền admin (quyền chỉ suy ra từ session + profiles + is_admin()). */
export async function requireAdmin(nextPath: string = '/admin'): Promise<AuthUserResult> {
  const state = await readSessionWithRetry();

  if (state.status === 'unavailable') {
    throw new AuthUnavailableError(state.reason);
  }

  if (state.status === 'anonymous') {
    const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    redirect(`/dang-nhap${nextQuery}`);
  }

  const auth = state.auth;
  if (auth.profile?.role === 'admin') return auth;

  let isAdmin = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    isAdmin = data === true;
  } catch (error) {
    // Không kết luận được quyền do lỗi tạm thời ⇒ cũng không đá về trang chủ oan.
    throw new AuthUnavailableError(describeError(error));
  }

  if (!isAdmin) redirect('/');
  return auth;
}

/** true nếu người dùng hiện tại là admin (dùng cho UI, không thay thế requireAdmin). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const state = await getSessionState();
  if (state.status !== 'authenticated') return false;
  if (state.auth.profile?.role === 'admin') return true;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}
