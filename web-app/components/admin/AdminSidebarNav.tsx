'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  TicketPercent,
  Images,
} from 'lucide-react';

/**
 * Điều hướng khu vực quản trị, chia thành 2 NHÓM rõ ràng:
 *   1. "Tổng quan"  – bảng điều khiển A01.
 *   2. "Bán hàng"   – các nghiệp vụ bán hàng: đơn hàng, sản phẩm, danh mục,
 *                     mã giảm giá và banner trang chủ.
 * Mục đang mở được highlight như trước (nền hổ phách) và có `aria-current="page"`.
 */
const NAV_GROUPS: Array<{
  id: string;
  title: string;
  hint: string;
  items: Array<{
    code: string;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    exact: boolean;
  }>;
}> = [
  {
    id: 'tong-quan',
    title: 'Tổng quan',
    hint: 'Số liệu toàn hệ thống',
    items: [
      {
        code: 'A01',
        label: 'Bảng điều khiển',
        href: '/admin',
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: 'ban-hang',
    title: 'Bán hàng',
    hint: 'Đơn hàng & danh mục bán',
    items: [
      { code: 'A05', label: 'Đơn hàng', href: '/admin/don-hang', icon: ShoppingBag, exact: false },
      {
        code: 'A02',
        label: 'Sản phẩm & tồn kho',
        href: '/admin/san-pham',
        icon: Package,
        exact: false,
      },
      { code: 'A04', label: 'Danh mục', href: '/admin/danh-muc', icon: FolderTree, exact: false },
      {
        code: 'A06',
        label: 'Mã giảm giá',
        href: '/admin/ma-giam-gia',
        icon: TicketPercent,
        exact: false,
      },
      { code: 'F11', label: 'Banner trang chủ', href: '/admin/banner', icon: Images, exact: false },
    ],
  },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="p-4 text-xs font-medium" aria-label="Điều hướng quản trị">
      {NAV_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`nav-group-${group.id}`} className="mb-5 last:mb-0">
          <div className="px-3 pb-2">
            <h2
              id={`nav-group-${group.id}`}
              className="text-[10px] font-bold uppercase tracking-wider text-stone-500"
            >
              {group.title}
            </h2>
            <p className="text-[10px] text-stone-600 mt-0.5">{group.hint}</p>
          </div>

          <div className="space-y-1.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-stone-300 hover:bg-stone-800 hover:text-amber-300 transition-colors'
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? '' : 'text-amber-500'}`} />
                    <span>{item.label}</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] ${active ? 'text-stone-800' : 'text-stone-500'}`}
                  >
                    {item.code}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
