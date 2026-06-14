import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit2, Trash2, Copy, Eye, Users, Star, Globe, EyeOff, Clock, Send, ClipboardList } from 'lucide-react';
import { instructorApi } from '../../api/instructorApi';
import { formatPrice, formatCount } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_STYLES = {
  published: 'bg-emerald-100 text-emerald-700',
  draft:     'bg-stone-100 text-stone-600',
  archived:  'bg-red-100 text-red-600',
  pending:   'bg-orange-100 text-orange-700',
};

const STATUS_LABELS = {
  published: 'Published',
  draft:     'Draft',
  archived:  'Archived',
  pending:   'Pending Review',
};

export default function MyCourses() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['instructor-courses', filter],
    queryFn: () => instructorApi.getMyCourses(filter ? { status: filter } : {}),
  });

  const deleteMutation = useMutation({
    mutationFn: instructorApi.deleteCourse,
    onSuccess: () => { toast.success('Course deleted'); qc.invalidateQueries(['instructor-courses']); setDeleteTarget(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const dupMutation = useMutation({
    mutationFn: instructorApi.duplicateCourse,
    onSuccess: () => { toast.success('Course duplicated!'); qc.invalidateQueries(['instructor-courses']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Duplicate failed'),
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, status }) =>
      status === 'published' ? instructorApi.unpublishCourse(id) : instructorApi.publishCourse(id),
    onSuccess: (_, { status }) => {
      toast.success(
        status === 'published' ? 'Course unpublished' : 'Course submitted for review! Admin will publish it shortly.'
      );
      qc.invalidateQueries(['instructor-courses']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const courses = data?.courses ?? [];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="My Courses"
        subtitle={`${courses.length} course${courses.length !== 1 ? 's' : ''}`}
        actions={
          <Link to="/instructor/courses/new" className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> New Course
          </Link>
        }
      />

      {/* Status filter */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {[['', 'All'], ['published', 'Published'], ['pending', '⏳ In Review'], ['draft', 'Draft'], ['archived', 'Archived']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === val ? 'bg-white shadow text-brand-700' : 'text-stone-500 hover:text-stone-700')}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : courses.length === 0 ? (
        <div className="card">
          <EmptyState icon="📚" title="No courses yet"
            description="Create your first course and start teaching thousands of students."
            action={<Link to="/instructor/courses/new" className="btn-primary">Create Course</Link>} />
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course._id} className="card p-0 hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  {course.thumbnail
                    ? <img src={resolveUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-stone-900 text-sm truncate max-w-sm">{course.title}</h3>
                    <span className={clsx('badge text-[10px] font-bold uppercase', STATUS_STYLES[course.status] ?? STATUS_STYLES.draft)}>
                      {STATUS_LABELS[course.status] ?? course.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-stone-500">
                      <Users className="w-3 h-3" /> {formatCount(course.totalStudents ?? 0)} students
                    </span>
                    {course.avgRating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {course.avgRating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-stone-500">
                      {course.isFree ? 'Free' : formatPrice(course.discountPrice || course.price)}
                    </span>
                    {course.revenue > 0 && (
                      <span className="text-xs font-semibold text-emerald-600">{formatPrice(course.revenue)} earned</span>
                    )}
                  </div>
                  {/* Pending review notice */}
                  {course.status === 'pending' && (
                    <p className="mt-1.5 text-xs text-orange-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Submitted for review — awaiting admin approval
                    </p>
                  )}
                  {/* Rejection reason */}
                  {course.rejectionReason && course.status === 'draft' && (
                    <p className="mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1 inline-block">
                      ⚠️ Previously rejected: {course.rejectionReason} — please update and resubmit.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link to={`/courses/${course._id}`}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title="Preview">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link to={`/instructor/courses/${course._id}/quizzes`}
                    className="p-2 rounded-lg text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-colors" title="Quiz Manager">
                    <ClipboardList className="w-4 h-4" />
                  </Link>
                  <Link to={`/instructor/courses/${course._id}/edit`}
                    className="p-2 rounded-lg text-stone-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button onClick={() => dupMutation.mutate(course._id)}
                    disabled={dupMutation.isPending}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors" title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </button>
                  {/* Publish / Submit for Review / Unpublish button */}
                  {course.status === 'pending' ? (
                    <span className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-orange-600 bg-orange-50 font-medium">
                      <Clock className="w-3.5 h-3.5" /> In Review
                    </span>
                  ) : (
                    <button
                      onClick={() => togglePublish.mutate({ id: course._id, status: course.status })}
                      disabled={togglePublish.isPending}
                      className={clsx('flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        course.status === 'published'
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-brand-600 hover:bg-brand-50'
                      )}
                      title={course.status === 'published' ? 'Unpublish' : 'Submit for Review'}
                    >
                      {course.status === 'published'
                        ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                        : <><Send className="w-3.5 h-3.5" /> Submit</>}
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(course)}
                    className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
        title="Delete course?"
        message={`"${deleteTarget?.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Course"
      />
    </div>
  );
}
