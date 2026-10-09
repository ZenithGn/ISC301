import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ToastProvider } from '@/components/Toaster';

export const dynamic = 'force-dynamic';

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </ToastProvider>
  );
}
