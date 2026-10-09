import Link from 'next/link';
import { getDashboardData } from '@/lib/actions/admin/data';
import { ConfigNotice } from '@/components/admin/ConfigNotice';
import { Alert, SectionTitle, adminCardClass } from '@/components/admin/FormBits';
import { formatNumber, formatVND, paymentMethodLabel } from '@/lib/format';
import {
  Banknote,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Tổng quan – Quản trị Hương Quê' };

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'amber',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'amber' | 'emerald' | 'blue' | 'rose';
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    rose: 'bg-rose-500/10 text-rose-400',
  } as const;

  return (
    <div className={`${adminCardClass} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-400 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-stone-100">{value}</div>
      {hint ? <p className="text-[11px] text-stone-500">{hint}</p> : null}
    </div>
  );
}

const dash = (value: number | null, suffix = '') =>
  value === null ? '—' : `${formatNumber(value)}${suffix}`;

export default async function AdminDashboardPage() {
  const { summary, daily, topProducts, paymentMix, errors } = await getDashboardData();

  const maxRevenue = daily.reduce((max, point) => Math.max(max, point.revenue), 0);
  const maxMix = paymentMix.reduce((max, slice) => Math.max(max, slice.orderCount), 0);
  const revenueChart = daily.slice(-30);

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          code="A01"
          title="Tổng quan hệ thống"
          description="Doanh thu, đơn hàng và tồn kho quà Tết (số liệu lấy trực tiếp từ database, tính trong 30 ngày gần nhất)"
        />
        <Link
          href="/san-pham"
          target="_blank"
          className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors"
        >
          Xem website bán hàng
        </Link>
      </div>

      <ConfigNotice />

      {errors.length > 0 && (
        <Alert tone="warning">
          <p className="font-semibold mb-1">Một số số liệu chưa tải được</p>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          label="Doanh thu (30 ngày)"
          value={summary.totalRevenue === null ? '—' : formatVND(summary.totalRevenue)}
          icon={Banknote}
          tone="emerald"
        />
        <StatCard
          label="Số đơn hàng"
          value={dash(summary.totalOrders)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Giá trị đơn trung bình"
          value={summary.avgOrderValue === null ? '—' : formatVND(summary.avgOrderValue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Khách hàng mới"
          value={dash(summary.newCustomers)}
          icon={UserPlus}
          tone="blue"
        />
        <StatCard
          label="Đơn cần xử lý"
          value={dash(summary.ordersNeedingAction)}
          icon={AlertTriangle}
          tone="rose"
        />
        <StatCard
          label="Đơn chờ thanh toán"
          value={dash(summary.pendingPaymentOrders)}
          icon={Clock}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className={`${adminCardClass} space-y-4`}>
          <h3 className="text-sm font-bold text-stone-100">Doanh thu 30 ngày</h3>
          {revenueChart.length === 0 ? (
            <p className="text-xs text-stone-500">Chưa có dữ liệu doanh thu.</p>
          ) : (
            <>
              <div className="flex items-end gap-1 h-40">
                {revenueChart.map((point) => {
                  const height = maxRevenue > 0 ? Math.max(2, (point.revenue / maxRevenue) * 100) : 2;
                  return (
                    <div
                      key={point.dateKey}
                      className="flex-1 rounded-t bg-gradient-to-t from-amber-700 to-amber-400"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${formatVND(point.revenue)} (${point.orderCount} đơn)`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500">
                Cao nhất: {formatVND(maxRevenue)} · {revenueChart.length} ngày có dữ liệu
              </p>
            </>
          )}
        </section>

        <section className={`${adminCardClass} space-y-4`}>
          <h3 className="text-sm font-bold text-stone-100">Tỷ lệ phương thức thanh toán</h3>
          {paymentMix.length === 0 ? (
            <p className="text-xs text-stone-500">Chưa có dữ liệu thanh toán.</p>
          ) : (
            <ul className="space-y-3">
              {paymentMix.map((slice) => {
                const width = maxMix > 0 ? Math.max(4, (slice.orderCount / maxMix) * 100) : 4;
                return (
                  <li key={slice.method} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300">{paymentMethodLabel(slice.method)}</span>
                      <span className="text-stone-400 font-mono">
                        {slice.orderCount} đơn · {formatVND(slice.revenue)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className={`${adminCardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-stone-100">Top 5 sản phẩm bán chạy</h3>
        {topProducts.length === 0 ? (
          <p className="text-xs text-stone-500">Chưa có dữ liệu bán hàng.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="uppercase font-mono tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 pr-4">#</th>
                  <th className="py-2.5 pr-4">Sản phẩm</th>
                  <th className="py-2.5 pr-4 text-right">Đã bán</th>
                  <th className="py-2.5 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {topProducts.map((product, index) => (
                  <tr key={`${product.name}-${index}`}>
                    <td className="py-2.5 pr-4 font-mono text-stone-500">{index + 1}</td>
                    <td className="py-2.5 pr-4 text-stone-200">{product.name}</td>
                    <td className="py-2.5 pr-4 text-right font-mono">{formatNumber(product.quantity)}</td>
                    <td className="py-2.5 text-right font-mono text-amber-400">
                      {formatVND(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
