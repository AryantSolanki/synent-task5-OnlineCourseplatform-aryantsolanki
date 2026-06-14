import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckCircle, XCircle, Star, Eye, ChevronDown, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatPrice, formatCount, formatDate } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_STYLES = {
  published:    'bg-emerald-100 text-emerald-700',
  draft:        'bg-zinc-100 text-zinc-600',
  archived:     'bg-red-100 text-red-600',
  under_review: 'bg-amber-100 text-amber-700',
  pending:      'bg-orange-100 text-orange-700',
};

const STATUS_LABELS = {
  published: 'Published',
  draft:     'Draft',
  archived:  'Rejected',
  pending:   'Pending Review',
};

export default function CourseManagement() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Supports drill-down from Category page via ?category=<id>
  const categoryFilter = searchParams.get('category') || '';

  const dSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses', page, dSearch, status, categoryFilter],
    queryFn: () => adminApi.getCourses({
      page,
      limit: 12,
      search: dSearch || undefined,
      status: status || undefined,
      category: categoryFilter || undefined,
    }),
    placeholderData: prev => prev,
  });

  const courses    = data?.courses    ?? data?.data?.courses    ?? [];
  const total      = data?.total      ?? data?.data?.total      ?? 0;
  const totalPages = data?.pages      ?? data?.data?.pages      ?? 1;

  const invalidate = () => qc.invalidateQueries(['admin-courses']);

  const statusMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCourseStatus(id, data),
    onSuccess: (_, { data: { status } }) => {
      toast.success(status === 'published' ? 'Course approved!' : status === 'archived' ? 'Course rejected' : 'Status updated');
      invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: err => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const approve = (id) => statusMutation.mutate({ id, data: { status: 'published' } });
  const reject  = (id, reason) => statusMutation.mutate({ id, data: { status: 'archived', reason } });
  const feature = (id, current) => statusMutation.mutate({ id, data: { isFeatured: !current } });

  // Default filter to pending if no status is set (highlight review queue)
  const effectiveStatus = status;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Course Management"
        subtitle={`${total.toLocaleString()} courses`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Courses' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search courses…" className="input-field pl-10 bg-white" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input-field pr-8 appearance-none cursor-pointer bg-white">
            <option value="">All Statuses</option>
            <option value="pending">⏳ Pending Review</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Rejected</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
        {categoryFilter && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">
            <span>Filtered by category</span>
            <button
              onClick={() => { setSearchParams({}); setPage(1); }}
              className="ml-1 p-0.5 rounded hover:bg-brand-100 transition-colors"
              title="Clear category filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : courses.length === 0 ? (
        <div className="card"><EmptyState icon="📚" title="No courses found" description="Try adjusting your filters." /></div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course._id} className="card p-0 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4 p-4">
                {/* Thumb */}
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                  {course.thumbnail
                    ? <img src={resolveUrl(course.thumbnail)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-zinc-900 text-sm truncate max-w-xs">{course.title}</h3>
                    <span className={clsx('badge text-[10px] font-bold uppercase', STATUS_STYLES[course.status] ?? STATUS_STYLES.draft)}>
                      {STATUS_LABELS[course.status] ?? course.status}
                    </span>
                    {course.isFeatured && <span className="badge bg-amber-100 text-amber-700 text-[10px]">★ Featured</span>}
                    {course.isBestSeller && <span className="badge bg-orange-100 text-orange-700 text-[10px]">Bestseller</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-zinc-500">
                    <span>By {course.instructor?.name ?? '—'}</span>
                    <span>{course.categoryName ?? '—'}</span>
                    <span>{formatCount(course.totalStudents ?? 0)} students</span>
                    <span>{course.isFree ? 'Free' : formatPrice(course.discountPrice || course.price)}</span>
                    {course.avgRating > 0 && <span className="text-amber-600">{course.avgRating.toFixed(1)} ★</span>}
                    <span>Created {formatDate(course.createdAt)}</span>
                  </div>
                  {/* Show rejection reason if the course was previously rejected */}
                  {course.rejectionReason && course.status === 'draft' && (
                    <p className="mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1 inline-block">
                      ⚠️ Rejected: {course.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <Link to={`/courses/${course._id}`} target="_blank"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Preview">
                    <Eye className="w-3.5 h-3.5" />
                  </Link>

                  <button onClick={() => feature(course._id, course.isFeatured)}
                    disabled={statusMutation.isPending}
                    className={clsx('p-1.5 rounded-lg transition-colors',
                      course.isFeatured ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-zinc-400 hover:text-amber-500 hover:bg-amber-50')}
                    title={course.isFeatured ? 'Unfeature' : 'Feature'}>
                    <Star className="w-3.5 h-3.5" />
                  </button>

                  {/* Pending courses get prominent approve/reject buttons */}
                  {course.status === 'pending' && (
                    <span className="text-[10px] text-orange-600 font-semibold bg-orange-50 border border-orange-200 rounded px-2 py-0.5 mr-1">
                      Awaiting Review
                    </span>
                  )}

                  {course.status !== 'published' && (
                    <button onClick={() => approve(course._id)} disabled={statusMutation.isPending}
                      className={clsx(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        course.status === 'pending'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      )}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}

                  {course.status !== 'archived' && (
                    <button onClick={() => { setRejectTarget(course); setRejectReason(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 border border-red-200 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-6" />

      {/* Reject modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Course" size="sm"
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => reject(rejectTarget._id, rejectReason)}
              disabled={statusMutation.isPending || !rejectReason.trim()}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2">
              {statusMutation.isPending && <Loader size="sm" white />} Reject Course
            </button>
          </>
        }>
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Rejecting <strong>{rejectTarget.title}</strong>. Please provide a reason so the instructor can improve their course.
            </p>
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Rejection Reason *</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                rows={3} placeholder="e.g. Content quality needs improvement, missing lecture descriptions…"
                className="input-field resize-none" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
