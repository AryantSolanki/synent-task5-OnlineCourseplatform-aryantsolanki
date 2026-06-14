import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, User, Mail, Calendar } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { formatDate } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';

export default function InstructorApprovals() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-instructors', page],
    queryFn: () => adminApi.getPendingInstructors({ page, limit: 15 }),
    placeholderData: prev => prev,
  });

  const instructors = data?.instructors ?? data?.data?.instructors ?? [];
  const total       = data?.total       ?? data?.data?.total       ?? 0;
  const totalPages  = data?.pages       ?? data?.data?.pages       ?? 1;

  const invalidate = () => {
    qc.invalidateQueries(['pending-instructors']);
    qc.invalidateQueries(['admin-dashboard']);
  };

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.approveInstructor(id),
    onSuccess: (_, id) => {
      toast.success('Instructor approved! They can now log in.');
      invalidate();
    },
    onError: err => toast.error(err.response?.data?.message || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.rejectInstructor(id, reason),
    onSuccess: () => {
      toast.success('Instructor application rejected.');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: err => toast.error(err.response?.data?.message || 'Rejection failed'),
  });

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate({ id: rejectTarget._id, reason: rejectReason });
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Instructor Approvals"
        subtitle={`${total} pending application${total !== 1 ? 's' : ''}`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Instructor Approvals' }]}
      />

      {/* Empty / loading states */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader size="lg" /></div>
      ) : instructors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🎉"
            title="No pending applications"
            description="All instructor applications have been reviewed. Check back later."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {instructors.map((instructor) => (
            <div key={instructor._id} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar src={instructor.profilePicture} name={instructor.name} size="lg" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-zinc-900">{instructor.name}</h3>
                    <span className="badge bg-amber-100 text-amber-700 text-[10px] font-bold uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending Review
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {instructor.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Applied {formatDate(instructor.createdAt)}
                    </span>
                  </div>

                  {instructor.bio ? (
                    <p className="text-sm text-zinc-600 line-clamp-2 max-w-xl">{instructor.bio}</p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">No bio provided.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(instructor._id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    title="Approve instructor"
                  >
                    {approveMutation.isPending ? <Loader size="sm" white /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => { setRejectTarget(instructor); setRejectReason(''); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 border border-red-200 transition-colors"
                    title="Reject instructor"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-6" />

      {/* Reject modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Instructor Application"
        size="sm"
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-2"
            >
              {rejectMutation.isPending && <Loader size="sm" white />} Reject Application
            </button>
          </>
        }
      >
        {rejectTarget && (
          <div className="space-y-4">
            {/* Applicant summary */}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
              <Avatar src={rejectTarget.profilePicture} name={rejectTarget.name} size="sm" />
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{rejectTarget.name}</p>
                <p className="text-xs text-zinc-400">{rejectTarget.email}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600">
              Please provide a reason so the applicant understands why their application was not approved.
            </p>
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Incomplete profile, unable to verify credentials, insufficient teaching experience…"
                className="input-field resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
