import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Play, Star, Users, BookOpen, Award } from 'lucide-react';
import { courseApi } from '../api/courseApi';
import CourseCard from '../components/course/CourseCard';
import CourseCardSkeleton from '../components/course/CourseCardSkeleton';

const CATEGORY_ICONS = {
  'web development': '💻', 'data science': '📊', 'mobile development': '📱',
  'ui/ux design': '🎨', 'business': '📈', 'ai & machine learning': '🤖',
  'photography': '📷', 'marketing': '📣',
};

export default function Home() {
  const { data: featuredData, isLoading: loadingCourses } = useQuery({
    queryKey: ['courses', 'featured'],
    queryFn: () => courseApi.getAll({ sort: '-totalStudents', limit: 8 }),
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: courseApi.getCategories,
  });

  const courses    = featuredData?.courses ?? [];
  const categories = catData?.categories?.slice(0, 8) ?? [];

  return (
    <div className="bg-stone-50">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-600/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6 border border-white/20">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm text-white/90 font-medium">Over 50,000 students learning today</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Learn without limits.
              <span className="block text-brand-400 mt-1">Grow without bounds.</span>
            </h1>

            <p className="mt-6 text-lg text-stone-300 max-w-xl leading-relaxed">
              Access thousands of courses taught by expert instructors. Start learning today and take your skills to the next level.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/courses" className="btn-primary py-3.5 px-8 text-base bg-brand-500 hover:bg-brand-400">
                Browse Courses <ArrowRight className="w-4 h-4 inline ml-1.5" />
              </Link>
              <Link to="/register?role=instructor" className="btn-secondary py-3.5 px-8 text-base bg-white/10 text-white border-white/20 hover:bg-white/20">
                Teach on LearnHub
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-stone-400">
              {[
                [<BookOpen className="w-4 h-4" />, '10K+ Courses'],
                [<Users className="w-4 h-4" />,    '50K+ Students'],
                [<Award className="w-4 h-4" />,    'Certificates Included'],
                [<Star  className="w-4 h-4" />,    '4.8 Avg Rating'],
              ].map(([icon, label], i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-brand-400">{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-brand-600 font-semibold text-sm mb-1">Explore topics</p>
              <h2 className="section-title">Top Categories</h2>
            </div>
            <Link to="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.map((cat) => {
              const emoji = CATEGORY_ICONS[cat.name.toLowerCase()] ?? cat.icon ?? '📚';
              return (
                <Link
                  key={cat._id}
                  to={`/courses?category=${encodeURIComponent(cat.name)}`}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-stone-100 hover:border-brand-200 hover:shadow-card-hover hover:-translate-y-0.5 transition-all group text-center"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs font-semibold text-stone-700 group-hover:text-brand-700 leading-tight">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured Courses ──────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brand-600 font-semibold text-sm mb-1">What's popular</p>
            <h2 className="section-title">Top Courses</h2>
          </div>
          <Link to="/courses" className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {loadingCourses
            ? Array(8).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)
            : courses.map((c) => <CourseCard key={c._id} course={c} />)
          }
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="bg-brand-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to start learning?</h2>
          <p className="mt-3 text-brand-200 text-lg">Join thousands of students already learning on LearnHub.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/register" className="bg-white text-brand-700 px-8 py-3.5 rounded-lg font-bold text-sm hover:bg-brand-50 transition-colors">
              Get started — it's free
            </Link>
            <Link to="/courses" className="bg-white/10 text-white px-8 py-3.5 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors border border-white/20">
              Browse courses
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
