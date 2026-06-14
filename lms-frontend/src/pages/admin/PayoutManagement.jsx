import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { formatPrice, formatDate } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_STYLES = {
  pending:    'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  completed:  'bg-emerald-100 text-emerald-700',
  rejected:   'bg-red-100 text-red-600',
};

export default function PayoutManagement() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [statusFilter, setStatus] = useState('pending');
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType]     = useState('');
  const [rejectNote, setRejectNote]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payouts', page, statusFilter],
    queryFn: () => adminApi.getPayouts({ page, limit: 15, status: statusFilter || undefined }),
    placeholderData: prev => prev,
  });

  const payouts    = data?.payouts    ?? data?.data?.payouts    ?? [];
  const total      = data?.total      ?? data?.data?.total      ?? 0;
  const totalPages = data?.pages      ?? data?.data?.pages      ?? 1;

  const invalidate = () => qc.invalidateQueries(['admin-payouts']);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updatePayout(id, data),
    onSuccess: (_, { data: { status } }) => {
      toast.success(status === 'completed' ? 'Payout approved!' : 'Payout rejected');
      invalidate();
      setActionTarget(null);
      setRejectNote('');
    },
    onError: err => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const handleAction = () => {
    if (actionType === 'approve') {
      updateMutation.mutate({ id: actionTarget._id, data: { status: 'completed' } });
    } else {
      updateMutation.mutate({ id: actionTarget._id, data: { status: 'rejected', notes: rejectNote } });
    }
  };

  const openAction = (payout, type) => { setActionTarget(payout); setActionType(type); setRejectNote(''); };

  const columns = [
    {
      key: 'instructor', header: 'Instructor',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.instructor?.profilePicture} name={row.instructor?.name} size="sm" />
          <div>
            <p className="font-semibold text-zinc-800 text-sm">{row.instructor?.name ?? '—'}</p>
            <p className="text-xs text-zinc-400">{row.instructor?.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Amount', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-bold text-zinc-900">{formatPrice(v)}</p>
          <p className="text-xs text-zinc-400 capitalize">{row.method?.replace('_', ' ')}</p>
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (v) => <span className={clsx('badge text-[10px] font-bold capitalize', STATUS_STYLES[v] ?? 'bg-zinc-100 text-zinc-600')}>{v}</span>,
    },
    {
      key: 'createdAt', header: 'Requested',
      render: (v) => <span className="text-xs text-zinc-500">{formatDate(v)}</span>,
    },
    {
      key: '_id', header: 'Actions', className: 'text-right',
      render: (_, row) => row.status === 'pending' ? (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => openAction(row, 'approve')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
          <button onClick={() => openAction(row, 'reject')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors">
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      ) : (
        <span className="text-xs text-zinc-400">
          {row.processedAt ? `Processed ${formatDate(row.processedAt)}` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Payout Management"
        subtitle={`${total} payout requests`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Payouts' }]}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Pending',    'pending',    'bg-amber-50 text-amber-700'],
          ['Processing', 'processing', 'bg-sky-50 text-sky-700'],
          ['Completed',  'completed',  'bg-emerald-50 text-emerald-700'],
          ['Rejected',   'rejected',   'bg-red-50 text-red-600'],
        ].map(([label, val, cls]) => (
          <button key={val} onClick={() => setStatus(val === statusFilter ? '' : val)}
            className={clsx('rounded-xl px-4 py-3 text-left border-2 transition-all', cls,
              statusFilter === val ? 'border-current opacity-100' : 'border-transparent opacity-70 hover:opacity-90')}>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-extrabold mt-0.5">—</p>
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative">
          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input-field pr-8 appearance-none cursor-pointer bg-white">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      <DataTable columns={columns} data={payouts} loading={isLoading}
        emptyMessage={`No ${statusFilter || ''} payouts found`} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-5" />

      {/* Action modal */}
      <Modal open={!!actionTarget} onClose={() => setActionTarget(null)}
        title={actionType === 'approve' ? 'Approve Payout' : 'Reject Payout'} size="sm"
        footer={
          <>
            <button onClick={() => setActionTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleAction}
              disabled={updateMutation.isPending || (actionType === 'reject' && !rejectNote.trim())}
              className={clsx('px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center gap-2 text-white',
                actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')}>
              {updateMutation.isPending && <Loader size="sm" white />}
              {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </>
        }>
        {actionTarget && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar src={actionTarget.instructor?.profilePicture} name={actionTarget.instructor?.name} size="md" />
                <div>
                  <p className="font-bold text-zinc-900">{actionTarget.instructor?.name}</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">{formatPrice(actionTarget.amount)}</p>
                  <p className="text-xs text-zinc-400 capitalize">{actionTarget.method?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
            {actionType === 'reject' && (
              <div>
                <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Rejection Note *</label>
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                  rows={3} placeholder="Reason for rejection…" className="input-field resize-none" />
              </div>
            )}
            {actionType === 'approve' && (
              <p className="text-sm text-zinc-500">
                This will mark the payout as completed. Make sure you've processed the actual bank transfer before confirming.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
