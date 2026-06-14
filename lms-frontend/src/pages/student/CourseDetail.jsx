import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Users, BarChart2, Globe, Award, ChevronDown, ChevronUp,
  Play, FileText, Lock, CheckCircle, Star
} from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import { enrollmentApi } from '../../api/enrollmentApi';
import { useAuth } from '../../context/AuthContext';
import { formatPrice, formatDuration, formatCount } from '../../utils/formatters';
import StarRating from '../../components/common/StarRating';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import { resolveUrl } from '../../api/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function CourseDetail() {
  const { id }  = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [openSections, setOpenSections] = useState({ 0: true });

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => courseApi.getById(id),
  });

  const { data: reviewData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => courseApi.getReviews(id, { limit: 5 }),
    enabled: !!id,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentApi.enroll(id),
    onSuccess: () => {
      toast.success('Enrolled successfully! 🎉');
      // Remove the stale course cache so CoursePlayer fetches fresh data
      // (with isEnrolled: true). invalidateQueries alone is async and the
      // stale value would be read before the refetch completes.
      qc.removeQueries({ queryKey: ['course', id] });
      navigate(`/learn/${id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Enrollment failed'),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (!data?.course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-bold mb-2">Course not found</h2>
        <Link to="/courses" className="btn-primary">Browse Courses</Link>
      </div>
    );
  }

  const { course, isEnrolled, enrollment } = data;
  const reviews = reviewData?.reviews ?? [];

  const totalLectures = course.curriculum?.reduce((t, s) => t + (s.lectures?.length ?? 0), 0) ?? 0;
  const totalDuration = course.curriculum?.reduce(
    (t, s) => t + s.lectures?.reduce((lt, l) => lt + (l.duration ?? 0), 0), 0
  ) ?? 0;
  const previewCount = course.curriculum?.reduce(
    (t, s) => t + s.lectures?.filter((l) => l.isPreview).length, 0
  ) ?? 0;

  const toggleSection = (i) => setOpenSections((p) => ({ ...p, [i]: !p[i] }));

  const handleEnroll = () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: { pathname: `/courses/${id}` } } }); return; }
    enrollMutation.mutate();
  };

  const effectivePrice = course.isFree ? 0 : (course.discountPrice || course.price);

  return (
    <div className="bg-stone-50">
      {/* ── Hero banner (dark) ── */}
      <div className="bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl">
            {course.categoryName && (
              <p className="text-brand-400 text-sm font-semibold mb-2">{course.categoryName}</p>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-stone-300">{course.subtitle}</p>}

            {/* Rating row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-stone-300">
              {course.avgRating > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">{course.avgRating.toFixed(1)}</span>
                  <StarRating rating={course.avgRating} size="sm" />
                  <span>({formatCount(course.totalReviews)} reviews)</span>
                </div>
              )}
              {course.totalStudents > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {formatCount(course.totalStudents)} students
                </span>
              )}
            </div>

            {/* Instructor */}
            {course.instructor && (
              <div className="mt-4 flex items-center gap-2">
                <Avatar src={course.instructor.profilePicture} name={course.instructor.name} size="sm" />
                <span className="text-sm text-stone-300">by <span className="text-white font-medium">{course.instructor.name}</span></span>
              </div>
            )}

            {/* Meta badges */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-400">
              <span className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" /> {course.level}</span>
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {course.language}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(totalDuration)}</span>
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {totalLectures} lectures</span>
              {course.hasCertificate !== false && (
                <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Certificate</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column (main content) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* What you'll learn */}
            {course.whatYouWillLearn?.length > 0 && (
              <section className="card p-6">
                <h2 className="text-xl font-bold text-stone-900 mb-4">What you'll learn</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {course.whatYouWillLearn.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-stone-700">
                      <CheckCircle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Curriculum */}
            {course.curriculum?.length > 0 && (
              <section className="card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-stone-900">Course Curriculum</h2>
                  <span className="text-xs text-stone-400">
                    {totalLectures} lectures · {formatDuration(totalDuration)} · {previewCount} free previews
                  </span>
                </div>

                <div className="space-y-2">
                  {course.curriculum.map((section, si) => (
                    <div key={section._id ?? si} className="border border-stone-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(si)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-stone-50 hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {openSections[si]
                            ? <ChevronUp className="w-4 h-4 text-stone-500 flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />}
                          <span className="font-semibold text-stone-800 text-sm text-left truncate">{section.title}</span>
                        </div>
                        <span className="text-xs text-stone-400 flex-shrink-0 ml-4">
                          {section.lectures?.length ?? 0} lectures
                        </span>
                      </button>

                      {openSections[si] && (
                        <ul className="divide-y divide-stone-50">
                          {section.lectures?.map((lec, li) => (
                            <li key={lec._id ?? li}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50/50 text-sm">
                              {lec.isPreview
                                ? <Play className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                                : <Lock className="w-3.5 h-3.5 text-stone-300 flex-shrink-0" />}
                              <span className={clsx('flex-1 truncate', lec.isPreview ? 'text-stone-700' : 'text-stone-500')}>
                                {lec.title}
                              </span>
                              {lec.isPreview && (
                                <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                  Preview
                                </span>
                              )}
                              {lec.duration > 0 && (
                                <span className="text-xs text-stone-400 flex-shrink-0">
                                  {formatDuration(lec.duration)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            {course.requirements?.length > 0 && (
              <section className="card p-6">
                <h2 className="text-xl font-bold text-stone-900 mb-3">Requirements</h2>
                <ul className="space-y-1.5">
                  {course.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <span className="text-brand-500 mt-0.5 flex-shrink-0">•</span> {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="card p-6">
                <h2 className="text-xl font-bold text-stone-900 mb-4">Student Reviews</h2>
                <div className="flex items-center gap-6 mb-6 pb-6 border-b border-stone-100">
                  <div className="text-center">
                    <div className="text-5xl font-extrabold text-stone-900">{course.avgRating.toFixed(1)}</div>
                    <StarRating rating={course.avgRating} size="md" className="mt-1" />
                    <p className="text-xs text-stone-400 mt-1">Course Rating</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {reviews.map((r) => (
                    <div key={r._id} className="flex gap-3">
                      <Avatar src={r.student?.profilePicture} name={r.student?.name} size="sm" className="flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-stone-900">{r.student?.name}</span>
                          <StarRating rating={r.rating} size="xs" />
                        </div>
                        <p className="text-sm text-stone-600 leading-relaxed">{r.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sticky sidebar CTA ── */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20 space-y-5">
              {/* Thumbnail */}
              <div className="aspect-video rounded-lg overflow-hidden bg-stone-100">
                {course.thumbnail
                  ? <img src={resolveUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl">📚</div>}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-stone-900">
                    {course.isFree ? 'Free' : formatPrice(effectivePrice)}
                  </span>
                  {!course.isFree && course.discountPrice > 0 && course.discountPrice < course.price && (
                    <>
                      <span className="text-lg text-stone-400 line-through">{formatPrice(course.price)}</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {Math.round((1 - course.discountPrice / course.price) * 100)}% off
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* CTA button */}
              {isEnrolled ? (
                <Link to={`/learn/${id}`} className="btn-primary w-full py-3 text-base text-center block">
                  Continue Learning →
                </Link>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                  className="btn-primary w-full py-3 text-base"
                >
                  {enrollMutation.isPending
                    ? <span className="flex items-center justify-center gap-2"><Loader size="sm" white /> Enrolling…</span>
                    : course.isFree ? 'Enroll for Free' : 'Enroll Now'}
                </button>
              )}

              {/* Course includes */}
              <ul className="space-y-2 text-sm text-stone-600 pt-2 border-t border-stone-100">
                {[
                  [<Clock className="w-3.5 h-3.5" />,     `${formatDuration(totalDuration)} on-demand video`],
                  [<FileText className="w-3.5 h-3.5" />,  `${totalLectures} lectures`],
                  [<Globe className="w-3.5 h-3.5" />,     'Full lifetime access'],
                  [<Award className="w-3.5 h-3.5" />,     'Certificate of completion'],
                ].map(([icon, text], i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-stone-400">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>

              {enrollment?.progress > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Your progress</span>
                    <span>{enrollment.progress}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
