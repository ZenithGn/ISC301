import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ChangePasswordForm, ProfileForm } from '@/components/account/AccountForms';
import { User, ShieldCheck, Package, LogOut } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tài khoản của tôi – Hương Quê',
  description: 'Quản lý thông tin cá nhân, mật khẩu và đơn hàng quà Tết của bạn.',
};

export default async function TaiKhoanPage() {
  const auth = await requireUser('/tai-khoan');
  const profile = auth.profile;

  const displayName = profile?.full_name || auth.user.email || 'Khách hàng';
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500 text-stone-950 font-black text-xl flex items-center justify-center">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-serif font-black text-stone-100">{displayName}</h1>
            <p className="text-xs text-stone-400">{auth.user.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] px-2 py-0.5 rounded-full border border-stone-700 bg-stone-900 text-stone-300">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Quản trị viên
                </>
              ) : (
                'Khách hàng'
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tai-khoan/don-hang"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            <Package className="w-3.5 h-3.5" /> Đơn hàng của tôi
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Trang quản trị
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-6 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-5">
          <div>
            <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" /> Thông tin cá nhân
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Dùng để điền sẵn khi đặt quà Tết và tra cứu đơn hàng.
            </p>
          </div>
          <ProfileForm
            defaultFullName={profile?.full_name ?? ''}
            defaultPhone={profile?.phone ?? ''}
            defaultAddress={profile?.default_address ?? ''}
            email={auth.user.email}
          />
        </section>

        <section className="p-6 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-5">
          <div>
            <h2 className="text-base font-serif font-bold text-stone-100 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-400" /> Đổi mật khẩu
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Cần nhập đúng mật khẩu hiện tại để xác nhận thay đổi.
            </p>
          </div>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
