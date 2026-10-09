import { requireUser } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/**
 * Nhóm route `(account)`: tất cả trang trong đây yêu cầu đăng nhập.
 * Guard đặt ở layout để không trang nào lọt qua (mỗi Server Action vẫn tự kiểm tra lại).
 */
export const dynamic = 'force-dynamic';

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
