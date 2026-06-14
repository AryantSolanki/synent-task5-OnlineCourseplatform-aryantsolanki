import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, Share2, CheckCircle, Calendar, BookOpen } from 'lucide-react';
import { enrollmentApi } from '../../api/enrollmentApi';
import { courseApi } from '../../api/courseApi';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/ui/PageHeader';

export default function Certificate() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const { data: courseData, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId),
  });

  const { data: progressData, isLoading: loadingProgress } = useQuery({
    queryKey: ['progress', courseId],
    queryFn: () => enrollmentApi.getCourseProgress(courseId),
  });

  const isLoading = loadingCourse || loadingProgress;
  const enrollment = progressData?.enrollment ?? courseData?.enrollment;
  const course     = courseData?.course;

  const handlePrint = () => window.print();

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;

  if (!enrollment?.completed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Certificate not yet earned</h2>
        <p className="text-stone-500 mb-6">Complete the course to unlock your certificate.</p>
        <Link to={`/learn/${courseId}`} className="btn-primary">Continue Learning</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader
        title="Certificate of Completion"
        breadcrumbs={[{ label: 'My Learning', href: '/student/my-learning' }, { label: 'Certificate' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>
        }
      />

      {/* Certificate */}
      <div id="certificate" className="card p-0 overflow-hidden print:shadow-none">
        {/* Top accent */}
        <div className="h-3 bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-600" />

        <div className="p-10 sm:p-16 text-center relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <Award className="w-96 h-96 text-brand-600" />
          </div>

          {/* Platform name */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-stone-900">LearnHub</span>
          </div>

          <p className="text-stone-500 text-sm font-semibold uppercase tracking-[0.2em] mb-6">
            Certificate of Completion
          </p>

          <p className="text-stone-500 mb-3">This certifies that</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 mb-6"
              style={{ fontFamily: "'Outfit', sans-serif" }}>
            {user?.name}
          </h1>
          <p className="text-stone-500 mb-3">has successfully completed</p>
          <h2 className="text-2xl font-bold text-brand-700 mb-6 max-w-lg mx-auto leading-snug">
            {course?.title}
          </h2>

          {/* Divider with medal */}
          <div className="flex items-center gap-4 max-w-xs mx-auto mb-8">
            <div className="flex-1 h-px bg-stone-200" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Details row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg mx-auto text-center mb-8">
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Completed</div>
              <div className="text-sm font-semibold text-stone-700">
                {formatDate(enrollment?.completedAt ?? enrollment?.updatedAt)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Instructor</div>
              <div className="text-sm font-semibold text-stone-700">{course?.instructor?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">Level</div>
              <div className="text-sm font-semibold text-stone-700 capitalize">{course?.level ?? '—'}</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Verified by LearnHub</span>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-brand-600 via-indigo-500 to-violet-600" />
      </div>
    </div>
  );
}
