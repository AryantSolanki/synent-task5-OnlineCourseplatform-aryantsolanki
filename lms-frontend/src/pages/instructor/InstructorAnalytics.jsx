import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, BarChart2 } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { formatPrice } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';
import clsx from 'clsx';

const DAY_OPTIONS = [7, 14, 30, 90];

export default function InstructorAnalytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-analytics', days],
    queryFn: () => instructorApi.getAnalytics(days),
  });

  const { data: dashData } = useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: instructorApi.getDashboard,
  });

  const enrollmentTrend = data?.enrollmentTrend ?? [];
  const revenueByDay    = data?.revenueByMonth  ?? [];
  const stats           = dashData?.stats       ?? {};

  const maxEnrollments = Math.max(...enrollmentTrend.map(d => d.count), 1);
  const maxRevenue     = Math.max(...revenueByDay.map(d => d.total), 1);

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader title="Analytics" subtitle="Detailed view of your teaching performance" />

      {/* Day range selector */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-fit">
        {DAY_OPTIONS.map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              days === d ? 'bg-white shadow text-brand-700' : 'text-stone-500 hover:text-stone-700')}>
            {d}d
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents ?? 0}   icon={<Users      className="w-5 h-5" />} color="brand" />
        <StatCard label="Published"      value={stats.publishedCourses ?? 0} icon={<BarChart2  className="w-5 h-5" />} color="emerald" />
        <StatCard label="Total Revenue"  value={formatPrice(stats.totalRevenue ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color="violet" />
        <StatCard label="Avg Rating"     value={`${(stats.avgRating ?? 0).toFixed(1)} ★`} icon={<BarChart2 className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment trend */}
        <div className="card p-6">
          <h2 className="font-bold text-stone-900 mb-1">Enrollment Trend</h2>
          <p className="text-xs text-stone-400 mb-5">New enrollments in last {days} days</p>
          {enrollmentTrend.length === 0 ? (
            <EmptyState compact icon="📊" title="No data yet" />
          ) : (
            <div className="flex items-end gap-1 h-32">
              {enrollmentTrend.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full bg-brand-500 hover:bg-brand-400 rounded-sm transition-colors"
                    style={{ height: `${Math.max(2, (d.count / maxEnrollments) * 112)}px` }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-stone-900 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {d._id}: {d.count}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-stone-400 mt-2">
            <span>{enrollmentTrend[0]?._id ?? ''}</span>
            <span>{enrollmentTrend[enrollmentTrend.length - 1]?._id ?? ''}</span>
          </div>
        </div>

        {/* Revenue trend */}
        <div className="card p-6">
          <h2 className="font-bold text-stone-900 mb-1">Revenue Trend</h2>
          <p className="text-xs text-stone-400 mb-5">Daily revenue in last {days} days</p>
          {revenueByDay.length === 0 ? (
            <EmptyState compact icon="💰" title="No revenue data yet" />
          ) : (
            <div className="flex items-end gap-1 h-32">
              {revenueByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full bg-emerald-500 hover:bg-emerald-400 rounded-sm transition-colors"
                    style={{ height: `${Math.max(2, (d.total / maxRevenue) * 112)}px` }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-stone-900 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {d._id}: {formatPrice(d.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-stone-400 mt-2">
            <span>{revenueByDay[0]?._id ?? ''}</span>
            <span>{revenueByDay[revenueByDay.length - 1]?._id ?? ''}</span>
          </div>
        </div>
      </div>

      {/* Top courses table */}
      {dashData?.topCourses?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-stone-900 mb-4">Course Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Course', 'Students', 'Rating', 'Reviews', 'Status'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {dashData.topCourses.map((c) => (
                  <tr key={c._id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-stone-800 max-w-[200px] truncate">{c.title}</td>
                    <td className="py-3 px-3 text-stone-600">{c.totalStudents ?? 0}</td>
                    <td className="py-3 px-3 text-amber-600 font-semibold">{c.avgRating > 0 ? `${c.avgRating.toFixed(1)} ★` : '—'}</td>
                    <td className="py-3 px-3 text-stone-500">{c.totalReviews ?? 0}</td>
                    <td className="py-3 px-3">
                      <span className={clsx('badge text-[10px]', c.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500')}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
