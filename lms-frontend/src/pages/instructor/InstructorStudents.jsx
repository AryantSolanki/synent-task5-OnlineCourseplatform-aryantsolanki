import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, TrendingUp } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { useQuery as useQ } from '@tanstack/react-query';
import Avatar from '../../components/common/Avatar';
import DataTable from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';
import { formatDate, formatCount, resolveUrl as fmtResolve } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import clsx from 'clsx';

export default function InstructorStudents() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [search, setSearch] = useState('');

  const { data: coursesData } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => instructorApi.getMyCourses({ status: 'published' }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-students', selectedCourse],
    queryFn: () => instructorApi.getCourseStudents(selectedCourse),
    enabled: !!selectedCourse,
  });

  const courses = coursesData?.courses?.filter(c => c.status === 'published') ?? [];
  const enrollments = (data?.enrollments ?? []).filter(e => {
    if (!search) return true;
    const name  = e.student?.name?.toLowerCase()  ?? '';
    const email = e.student?.email?.toLowerCase() ?? '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  const columns = [
    {
      key: 'student', header: 'Student',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.student?.profilePicture} name={row.student?.name} size="sm" />
          <div>
            <p className="font-semibold text-stone-800 text-sm">{row.student?.name}</p>
            <p className="text-xs text-stone-400">{row.student?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'progress', header: 'Progress', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full', row.completed ? 'bg-emerald-500' : 'bg-brand-500')}
              style={{ width: `${row.progress ?? 0}%` }} />
          </div>
          <span className="text-xs font-semibold text-stone-600 w-8">{row.progress ?? 0}%</span>
        </div>
      ),
    },
    {
      key: 'completed', header: 'Status',
      render: (_, row) => (
        <span className={clsx('badge text-[10px] font-bold', row.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
          {row.completed ? '✓ Completed' : 'In Progress'}
        </span>
      ),
    },
    {
      key: 'pricePaid', header: 'Paid',
      render: (val) => <span className="text-sm font-semibold text-stone-700">{val ? `₹${val}` : 'Free'}</span>,
    },
    {
      key: 'createdAt', header: 'Enrolled', sortable: true,
      render: (val) => <span className="text-xs text-stone-500">{formatDate(val)}</span>,
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Students" subtitle="View and manage students across your courses" />

      {/* Course selector */}
      <div className="card p-5 mb-6">
        <label className="text-sm font-semibold text-stone-700 mb-2 block">Select Course</label>
        {courses.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No published courses yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((c) => (
              <button key={c._id} onClick={() => setSelectedCourse(c._id)}
                className={clsx('flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  selectedCourse === c._id ? 'border-brand-500 bg-brand-50' : 'border-stone-200 hover:border-stone-300 bg-white')}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  {c.thumbnail
                    ? <img src={resolveUrl(c.thumbnail)} alt={c.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">📚</div>}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-800 truncate">{c.title}</p>
                  <p className="text-[10px] text-stone-400">{formatCount(c.totalStudents ?? 0)} students</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Students table */}
      {!selectedCourse ? (
        <div className="card">
          <EmptyState icon="👆" title="Select a course above" description="Choose a course to see its enrolled students." />
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              ['Total Enrolled',  data?.totalStudents ?? 0,     'bg-brand-50 text-brand-700'],
              ['Completed',       enrollments.filter(e => e.completed).length, 'bg-emerald-50 text-emerald-700'],
              ['Avg Progress',    `${Math.round(enrollments.reduce((s, e) => s + (e.progress ?? 0), 0) / (enrollments.length || 1))}%`, 'bg-amber-50 text-amber-700'],
            ].map(([label, val, cls]) => (
              <div key={label} className={clsx('rounded-xl px-4 py-3', cls)}>
                <p className="text-2xl font-extrabold">{val}</p>
                <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search students…" className="input-field pl-10 bg-white" />
          </div>

          <DataTable
            columns={columns}
            data={enrollments}
            rowKey="_id"
            emptyMessage="No students enrolled yet"
            loading={isLoading}
          />
        </>
      )}
    </div>
  );
}
