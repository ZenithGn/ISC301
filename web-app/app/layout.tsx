import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['vietnamese', 'latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hương Quê – Quà Tết & Đặc Sản Ba Miền Tinh Hoa',
  description: 'Nền tảng quà Tết cao cấp: Hộp quà An Khang, Phúc Lộc, Thịnh Vượng, đặc sản OCOP chính gốc 3 miền Bắc - Trung - Nam sum vầy ngày xuân.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`dark ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body
        className="min-h-screen bg-stone-950 text-stone-100 antialiased selection:bg-amber-500 selection:text-stone-950 flex flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
