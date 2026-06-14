import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Users, BookOpen } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { formatPrice, formatCount, formatDate } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';

export default function RevenueReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: adminApi.getRevenueReport,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  const report       = data?.report      ?? data?.data?.report      ?? {};
  const byMonth      = data?.byMonth     ?? data?.data?.byMonth     ?? [];
  const byCourse     = data?.byCourse    ?? data?.data?.byCourse    ?? [];
  const transactions = data?.transactions ?? data?.data?.transactions ?? [];

  const maxRevenue = Math.max(...byMonth.map(m => m.total ?? m.revenue ?? 0), 1);

  const txColumns = [
    {
      key: 'instructor', header: 'Instructor',
      render: (v) => <span className="text-sm font-medium text-zinc-700">{v?.name ?? '—'}</span>,
    },
    {
      key: 'course', header: 'Course',
      render: (v) => <span className="text-sm text-zinc-600 truncate max-w-[180px] block">{v?.title ?? '—'}</span>,
    },
    {
      key: 'grossAmount', header: 'Gross',
      render: (v) => <span className="font-semibold text-zinc-900">{formatPrice(v)}</span>,
    },
    {
      key: 'platformFee', header: 'Platform Fee',
      render: (v) => <span className="text-emerald-600 font-semibold">{formatPrice(v)}</span>,
    },
    {
      key: 'instructorShare', header: 'Instructor Share',
      render: (v) => <span className="text-zinc-600">{formatPrice(v)}</span>,
    },
    {
      key: 'createdAt', header: 'Date',
      render: (v) => <span className="text-xs text-zinc-400">{formatDate(v)}</span>,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader
        title="Revenue Report"
        subtitle="Platform-wide earnings and transaction data"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Revenue' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"   value={formatPrice(report.totalRevenue  ?? 0)} icon={<DollarSign  className="w-5 h-5" />} color="emerald" />
        <StatCard label="Platform Fees"   value={formatPrice(report.platformFees  ?? 0)} icon={<TrendingUp  className="w-5 h-5" />} color="brand" />
        <StatCard label="Paid to Instructors" value={formatPrice(report.instructorPayouts ?? 0)} icon={<Users className="w-5 h-5" />} color="violet" />
        <StatCard label="Total Transactions"  value={formatCount(report.totalTransactions ?? 0)} icon={<BookOpen className="w-5 h-5" />} color="amber" />
      </div>

      {/* Monthly chart */}
      {byMonth.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-zinc-900 mb-6">Monthly Revenue Breakdown</h2>
          <div className="flex items-end gap-3 h-40">
            {byMonth.map((m, i) => {
              const total    = m.total    ?? m.revenue ?? 0;
              const platform = m.platform ?? 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex flex-col justify-end gap-0.5 relative group"
                    style={{ height: `${Math.max(4, (total / maxRevenue) * 128)}px` }}>
                    {/* Stacked bars */}
                    <div className="w-full bg-zinc-800 rounded-t-md flex-1" />
                    {platform > 0 && (
                      <div className="w-full bg-red-600 rounded-b-sm"
                        style={{ height: `${(platform / total) * 100}%` }} />
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 text-white text-[10px] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Total: {formatPrice(total)} · Fee: {formatPrice(platform)}
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-400 truncate w-full text-center">
                    {m.month ?? m._id ?? ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-zinc-800" /> Instructor share</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-600" /> Platform fee</div>
          </div>
        </div>
      )}

      {/* Top earning courses */}
      {byCourse.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-zinc-900 mb-4">Top Earning Courses</h2>
          <div className="space-y-3">
            {byCourse.slice(0, 8).map((item, i) => {
              const pct = Math.round(((item.total ?? 0) / (report.totalRevenue || 1)) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-zinc-300 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                    {item.courseInfo?.thumbnail
                      ? <img src={resolveUrl(item.courseInfo.thumbnail)} alt="" className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full text-sm">📚</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-zinc-700 truncate">{item.courseInfo?.title ?? `Course ${i + 1}`}</span>
                      <span className="font-bold text-zinc-900 ml-2 flex-shrink-0">{formatPrice(item.total ?? 0)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction table */}
      {transactions.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="font-bold text-zinc-900">Recent Transactions</h2>
          </div>
          <DataTable columns={txColumns} data={transactions} rowKey="_id" />
        </div>
      )}

      {byMonth.length === 0 && transactions.length === 0 && (
        <div className="card">
          <EmptyState icon="💰" title="No revenue data" description="Revenue will appear here once courses are sold." />
        </div>
      )}
    </div>
  );
}
