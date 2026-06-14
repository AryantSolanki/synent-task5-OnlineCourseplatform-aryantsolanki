import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Flame, Award, ArrowRight, Clock } from 'lucide-react';
import { studentApi } from '../../api/studentApi';
import { useAuth } from '../../context/AuthContext';
import CourseCard from '../../components/course/CourseCard';
import CourseCardSkeleton from '../../components/course/CourseCardSkeleton';
import Avatar from '../../components/common/Avatar';
import { formatRelativeTime } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: studentApi.getDashboard,
  });

  const stats           = data?.stats           ?? {};
  const continueLearning = data?.continueLearning ?? [];
  const recommended     = data?.recommended      ?? [];

  const statCards = [
    { label: 'Enrolled',    value: stats.totalEnrolled   ?? 0, icon: <BookOpen   className="w-5 h-5" />, color: 'bg-brand-50 text-brand-700' },
    { label: 'Completed',   value: stats.totalCompleted  ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'In Progress', value: stats.inProgress      ?? 0, icon: <Flame       className="w-5 h-5" />, color: 'bg-amber-50 text-amber-700' },
    { label: 'Certificates', value: stats.certificatesEarned ?? 0, icon: <Award  className="w-5 h-5" />, color: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Welcome header ── */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar src={user?.profilePicture} name={user?.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">Here's what's happening with your learning today.</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-extrabold text-stone-900">{s.value}</div>
              <div className="text-xs text-stone-500 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Continue Learning ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {Array(3).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : continueLearning.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-brand-600 font-semibold text-sm">Pick up where you left off</p>
              <h2 className="section-title">Continue Learning</h2>
            </div>
            <Link to="/student/my-learning" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {continueLearning.map((enrollment) => {
              const course = enrollment.course;
              if (!course) return null;
              return (
                <div key={enrollment._id} className="card overflow-hidden hover:shadow-card-hover transition-all hover:-translate-y-0.5 group">
                  <div className="relative aspect-video overflow-hidden bg-stone-100">
                    {course.thumbnail
                      ? <img src={resolveUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div className="h-full bg-brand-500" style={{ width: `${enrollment.progress}%` }} />
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900 text-sm line-clamp-2 mb-2">{course.title}</h3>
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {enrollment.progress}% complete</span>
                    </div>
                    <Link to={`/learn/${course._id}`} className="btn-primary w-full text-center text-xs py-2">
                      Continue →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recommended ── */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-brand-600 font-semibold text-sm">Handpicked for you</p>
              <h2 className="section-title">Recommended Courses</h2>
            </div>
            <Link to="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              Browse all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommended.map((c) => <CourseCard key={c._id} course={c} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && continueLearning.length === 0 && (
        <div className="text-center py-16 card">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-bold text-stone-800 mb-2">Ready to start learning?</h3>
          <p className="text-stone-500 mb-6">Explore thousands of courses and start your journey today.</p>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
        </div>
      )}
    </div>
  );
}
