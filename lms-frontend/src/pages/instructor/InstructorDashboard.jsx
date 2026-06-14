import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Users, DollarSign, Star, ArrowRight, TrendingUp, PlusCircle } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { formatPrice, formatCount, formatRelativeTime } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import StatCard from '../../components/ui/StatCard';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import clsx from 'clsx';

export default function InstructorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['instructor-dashboard'],
    queryFn: instructorApi.getDashboard,
  });

  const stats           = data?.stats             ?? {};
  const chartData       = data?.chartData         ?? [];
  const recentEnrollments = data?.recentEnrollments ?? [];
  const topCourses      = data?.topCourses        ?? [];

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-0.5">Overview of your teaching activity</p>
        </div>
        <Link to="/instructor/courses/new" className="btn-primary flex items-center gap-2">
          <PlusCircle className="w-4 h-4" /> New Course
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={formatCount(stats.totalStudents ?? 0)} icon={<Users className="w-5 h-5" />} color="brand" />
        <StatCard label="Total Revenue"  value={formatPrice(stats.totalRevenue  ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
        <StatCard label="Courses"        value={stats.totalCourses ?? 0}               icon={<BookOpen className="w-5 h-5" />} color="violet" />
        <StatCard label="Avg Rating"     value={`${(stats.avgRating ?? 0).toFixed(1)} ★`} icon={<Star className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-stone-900">Revenue Trend</h2>
              <p className="text-xs text-stone-400 mt-0.5">Last 6 months</p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>

          {chartData.length === 0 ? (
            <EmptyState compact icon="📊" title="No revenue data yet" description="Start selling courses to see your revenue here." />
          ) : (
            <div className="flex items-end gap-3 h-40">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-700">{d.revenue > 0 ? formatPrice(d.revenue).replace('₹','') : ''}</span>
                  <div className="w-full relative group">
                    <div
                      className="w-full bg-brand-600 rounded-t-md transition-all duration-500 hover:bg-brand-500"
                      style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 120)}px` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-stone-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {formatPrice(d.revenue)} · {d.enrollments} enrollments
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400">{d.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top courses */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-900">Top Courses</h2>
            <Link to="/instructor/courses" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {topCourses.length === 0 ? (
            <EmptyState compact icon="📚" title="No courses yet" />
          ) : (
            <ul className="space-y-3">
              {topCourses.map((c, i) => (
                <li key={c._id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-300 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    {c.thumbnail
                      ? <img src={resolveUrl(c.thumbnail)} alt={c.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">📚</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-800 truncate">{c.title}</p>
                    <p className="text-[10px] text-stone-400">{formatCount(c.totalStudents)} students</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent enrollments */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">Recent Enrollments</h2>
          <Link to="/instructor/students" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentEnrollments.length === 0 ? (
          <EmptyState compact icon="👥" title="No enrollments yet" description="Share your courses to start getting students." />
        ) : (
          <ul className="divide-y divide-stone-50">
            {recentEnrollments.map((enrollment) => (
              <li key={enrollment._id} className="flex items-center gap-4 px-6 py-3">
                <Avatar src={enrollment.student?.profilePicture} name={enrollment.student?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">{enrollment.student?.name}</p>
                  <p className="text-xs text-stone-400 truncate">{enrollment.course?.title}</p>
                </div>
                <span className="text-xs text-stone-400 flex-shrink-0">{formatRelativeTime(enrollment.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
