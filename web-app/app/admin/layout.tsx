import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { LogOut, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SERVER GUARD BẮT BUỘC:
  // - Chưa đăng nhập  -> /dang-nhap?next=/admin
  // - Không phải admin -> về trang chủ
  // Quyền vẫn được kiểm tra lại trong từng Server Action admin và trong database (RLS/RPC).
  const auth = await requireAdmin('/admin');
  const profile = auth.profile;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col md:flex-row text-stone-100">
      <aside className="w-full md:w-64 bg-stone-900 border-r border-stone-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-stone-800">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-black tracking-wider text-amber-300 text-base block">
                  HƯƠNG QUÊ
                </span>
                <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">
                  ADMIN PORTAL
                </span>
              </div>
            </Link>
          </div>

          <AdminSidebarNav />
        </div>

        <div className="p-4 border-t border-stone-800 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-stone-950/70 border border-stone-800 text-xs">
            <p className="text-amber-400 font-semibold truncate">
              {profile?.full_name || auth.user.email}
            </p>
            <p className="text-[10px] text-stone-400">Quyền: Quản trị viên</p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-700 hover:bg-red-950/80 hover:text-rose-300 text-stone-300 text-xs font-medium transition-colors"
              title="Đăng xuất khỏi trang quản trị"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-stone-800 px-6 sm:px-8 flex items-center justify-between bg-stone-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>Bảng điều khiển</span>
            <span>/</span>
            <span className="text-amber-400 font-medium">Trung tâm Quản trị</span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            RLS đang bật
          </span>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
