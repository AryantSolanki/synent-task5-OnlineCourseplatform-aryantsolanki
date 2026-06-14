import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { enrollmentApi } from '../../api/enrollmentApi';
import { resolveUrl } from '../../api/axios';
import { useDebounce } from '../../hooks/useDebounce';
import CourseCardSkeleton from '../../components/course/CourseCardSkeleton';
import Avatar from '../../components/common/Avatar';
import clsx from 'clsx';

const TABS = [
  { id: '',             label: 'All Courses',  icon: <BookOpen className="w-4 h-4" /> },
  { id: 'in-progress',  label: 'In Progress',  icon: <Clock className="w-4 h-4" /> },
  { id: 'completed',    label: 'Completed',    icon: <CheckCircle className="w-4 h-4" /> },
];

export default function MyLearning() {
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['my-enrollments', activeTab],
    queryFn: () => enrollmentApi.getMyEnrollments(activeTab || undefined),
  });

  const enrollments = (data?.enrollments ?? []).filter((e) => {
    if (!debouncedSearch) return true;
    return e.course?.title?.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">My Learning</h1>
        <p className="text-stone-500 text-sm mt-1">
          {data?.enrollments?.length ?? 0} courses enrolled
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search your courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 bg-white"
          />
        </div>
      </div>

      {/* Course list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="text-5xl mb-4">{activeTab === 'completed' ? '🏆' : '📚'}</div>
          <h3 className="text-xl font-semibold text-stone-700 mb-2">
            {activeTab === 'completed' ? 'No completed courses yet' : 'No courses found'}
          </h3>
          <p className="text-stone-400 mb-6">
            {activeTab === 'completed'
              ? 'Keep learning and complete your enrolled courses.'
              : 'Explore courses and start your learning journey.'}
          </p>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {enrollments.map((enrollment) => (
            <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  );
}

function EnrollmentCard({ enrollment }) {
  const { course, progress, completed, lastAccessedAt } = enrollment;
  if (!course) return null;

  return (
    <div className="card hover:shadow-card-hover transition-all hover:-translate-y-0.5 overflow-hidden group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-stone-100 overflow-hidden">
        {course.thumbnail
          ? <img src={resolveUrl(course.thumbnail)} alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        {completed && (
          <div className="absolute inset-0 bg-emerald-900/30 flex items-center justify-center">
            <div className="bg-emerald-500 text-white rounded-full p-2">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-stone-900 text-sm line-clamp-2">{course.title}</h3>

        {course.instructor && (
          <div className="flex items-center gap-1.5">
            <Avatar src={course.instructor?.profilePicture} name={course.instructor?.name} size="xs" />
            <span className="text-xs text-stone-500">{course.instructor?.name}</span>
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-stone-500 mb-1.5">
            <span>{completed ? '✅ Completed' : `${progress}% complete`}</span>
            {lastAccessedAt && <span className="text-stone-400">Last accessed recently</span>}
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full', completed ? 'bg-emerald-500' : 'bg-brand-500')}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          to={`/learn/${course._id}`}
          className={clsx(
            'block w-full text-center py-2 rounded-lg text-sm font-semibold transition-colors',
            completed
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              : 'btn-primary'
          )}
        >
          {completed ? 'Review Course' : progress > 0 ? 'Continue →' : 'Start Learning →'}
        </Link>
      </div>
    </div>
  );
}
