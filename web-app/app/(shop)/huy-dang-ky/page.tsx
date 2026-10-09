import type { Metadata } from 'next';
import { NewsletterUnsubscribeForm } from '@/components/NewsletterUnsubscribeForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hủy đăng ký nhận tin | Hương Quê',
  description: 'Hủy đăng ký nhận email khuyến mãi quà Tết từ Hương Quê.',
  robots: { index: false, follow: false },
};

interface HuyDangKyPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * F06 – Trang hủy đăng ký bản tin.
 *
 * KHÔNG gọi RPC hủy ngay khi mở link: trang chỉ hiện nút xác nhận, thao tác hủy
 * do Server Action `confirmUnsubscribeAction` thực hiện. Nhờ vậy bot/email client
 * prefetch link sẽ không vô tình hủy đăng ký của khách.
 */
export default async function HuyDangKyPage({ searchParams }: HuyDangKyPageProps) {
  const { token } = await searchParams;
  const safeToken = typeof token === 'string' && token.trim() !== '' ? token.trim() : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <NewsletterUnsubscribeForm token={safeToken} />
    </div>
  );
}
