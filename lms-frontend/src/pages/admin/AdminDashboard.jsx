import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, DollarSign, TrendingUp,
  UserCheck, Clock, CheckCircle, AlertTriangle,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { formatPrice, formatCount, formatRelativeTime } from '../../utils/formatters';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import clsx from 'clsx';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboardStats,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  const stats              = data?.stats              ?? data?.data?.stats              ?? {};
  const recentUsers        = data?.recentUsers        ?? data?.data?.recentUsers        ?? [];
  const recentCourses      = data?.recentCourses      ?? data?.data?.recentCourses      ?? [];
  const pendingPayouts     = stats.pendingPayouts     ?? 0;
  const pendingCourses     = stats.pendingCourses     ?? 0;
  const pendingInstructors = stats.pendingInstructors ?? 0;
  const monthlyRevenue     = data?.monthlyRevenue     ?? data?.data?.monthlyRevenue     ?? [];

  const maxRev = Math.max(...(monthlyRevenue.map ? monthlyRevenue.map(d => d.total ?? d.revenue ?? 0) : []), 1);

  const quickActions = [
    { label: 'Instructor Approvals', href: '/admin/instructor-approvals', icon: UserCheck, count: pendingInstructors, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Review Courses',  href: '/admin/courses?status=pending', icon: BookOpen,   count: pendingCourses,     color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'Process Payouts', href: '/admin/payouts',    icon: DollarSign, count: pendingPayouts,     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Manage Users',    href: '/admin/users',      icon: Users,      count: stats.totalUsers,   color: 'text-brand-600 bg-brand-50 border-brand-200' },
    { label: 'View Reports',    href: '/admin/revenue',    icon: TrendingUp, count: null,               color: 'text-violet-600 bg-violet-50 border-violet-200' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Admin Control</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Platform Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Real-time overview of LearnHub</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={formatCount(stats.totalUsers    ?? 0)} icon={<Users       className="w-5 h-5" />} color="brand"   />
        <StatCard label="Total Courses"  value={formatCount(stats.totalCourses  ?? 0)} icon={<BookOpen    className="w-5 h-5" />} color="violet"  />
        <StatCard label="Platform Revenue" value={formatPrice(stats.totalRevenue ?? 0)} icon={<DollarSign  className="w-5 h-5" />} color="emerald" />
        <StatCard label="Enrollments"    value={formatCount(stats.totalEnrollments ?? 0)} icon={<UserCheck className="w-5 h-5" />} color="amber"   />
      </div>

      {/* Alert banner for pending items */}
      {(pendingCourses > 0 || pendingPayouts > 0 || pendingInstructors > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-800">
            <span className="font-semibold">Action needed: </span>
            {pendingInstructors > 0 && `${pendingInstructors} instructor application${pendingInstructors > 1 ? 's' : ''} awaiting review`}
            {pendingInstructors > 0 && pendingCourses > 0 && ' · '}
            {pendingCourses > 0 && `${pendingCourses} course${pendingCourses > 1 ? 's' : ''} awaiting review`}
            {(pendingInstructors > 0 || pendingCourses > 0) && pendingPayouts > 0 && ' · '}
            {pendingPayouts > 0 && `${pendingPayouts} payout${pendingPayouts > 1 ? 's' : ''} pending approval`}
          </div>
          <Link to="/admin/instructor-approvals" className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 flex-shrink-0">
            Review <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-zinc-900">Monthly Revenue</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Platform-wide earnings</p>
            </div>
            <Link to="/admin/revenue" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-semibold">
              Full report <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {monthlyRevenue.length === 0 ? (
            <EmptyState compact icon="📊" title="No revenue data yet" />
          ) : (
            <div className="flex items-end gap-2 h-36">
              {monthlyRevenue.map((d, i) => {
                const val = d.total ?? d.revenue ?? 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-t-md transition-all bg-gradient-to-t from-zinc-800 to-zinc-600 hover:from-red-700 hover:to-red-500"
                      style={{ height: `${Math.max(4, (val / maxRev) * 120)}px` }}
                    />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {formatPrice(val)}
                    </div>
                    <span className="text-[9px] text-zinc-400 truncate w-full text-center">
                      {d.month ?? d._id?.month ?? ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-6">
          <h2 className="font-bold text-zinc-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map(({ label, href, icon: Icon, count, color }) => (
              <Link key={href} to={href}
                className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm', color)}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold">{label}</span>
                {count != null && (
                  <span className="text-xs font-bold opacity-70">{formatCount(count)}</span>
                )}
                <ArrowRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="font-bold text-zinc-900">Recent Users</h2>
            <Link to="/admin/users" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              All users <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <EmptyState compact icon="👤" title="No users yet" />
          ) : (
            <ul className="divide-y divide-zinc-50">
              {recentUsers.slice(0, 6).map((u) => (
                <li key={u._id} className="flex items-center gap-3 px-6 py-3">
                  <Avatar src={u.profilePicture} name={u.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{u.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                  </div>
                  <span className={clsx('badge text-[10px] capitalize',
                    u.role === 'admin' ? 'bg-red-100 text-red-700' :
                    u.role === 'instructor' ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-600')}>
                    {u.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent courses */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="font-bold text-zinc-900">Recent Courses</h2>
            <Link to="/admin/courses" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              All courses <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentCourses.length === 0 ? (
            <EmptyState compact icon="📚" title="No courses yet" />
          ) : (
            <ul className="divide-y divide-zinc-50">
              {recentCourses.slice(0, 6).map((c) => (
                <li key={c._id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-10 h-7 rounded bg-zinc-100 flex-shrink-0 overflow-hidden">
                    {c.thumbnail
                      ? <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm">📚</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{c.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{c.instructor?.name ?? '—'}</p>
                  </div>
                  <span className={clsx('badge text-[10px]',
                    c.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'pending'   ? 'bg-orange-100 text-orange-700' :
                    c.status === 'draft'     ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-100 text-amber-700')}>
                    {c.status === 'pending' ? 'In Review' : c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
