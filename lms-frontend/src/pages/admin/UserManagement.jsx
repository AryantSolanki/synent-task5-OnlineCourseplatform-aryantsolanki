import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserX, UserCheck, Trash2, Edit2, Shield, ChevronDown, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ROLE_STYLES = {
  admin:      'bg-red-100 text-red-700',
  instructor: 'bg-violet-100 text-violet-700',
  student:    'bg-zinc-100 text-zinc-600',
};

const APPROVAL_STYLES = {
  pending:      'bg-amber-100 text-amber-700',
  approved:     'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-600',
  not_required: null,
};

export default function UserManagement() {
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const navigate = useNavigate();

  const dSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, dSearch, roleFilter, approvalFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 15, search: dSearch || undefined, role: roleFilter || undefined, approvalStatus: approvalFilter || undefined }),
    placeholderData: prev => prev,
  });

  const users      = data?.users      ?? data?.data?.users      ?? [];
  const total      = data?.total      ?? data?.data?.total      ?? 0;
  const totalPages = data?.pages      ?? data?.data?.pages      ?? 1;

  const invalidate = () => qc.invalidateQueries(['admin-users']);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => { toast.success('User updated'); invalidate(); setEditTarget(null); },
    onError: err => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => { toast.success('User deleted'); invalidate(); setDeleteTarget(null); },
    onError: err => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => active ? adminApi.suspendUser(id) : adminApi.activateUser(id),
    onSuccess: (_, { active }) => { toast.success(active ? 'User suspended' : 'User activated'); invalidate(); setSuspendTarget(null); },
    onError: err => toast.error(err.response?.data?.message || 'Action failed'),
  });

  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
  };

  const columns = [
    {
      key: 'name', header: 'User',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.profilePicture} name={row.name} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-800 text-sm truncate">{row.name}</p>
            <p className="text-xs text-zinc-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (v) => <span className={clsx('badge text-[10px] font-bold capitalize', ROLE_STYLES[v] ?? ROLE_STYLES.student)}>{v}</span>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (v, row) => (
        <div className="flex flex-col gap-1">
          <span className={clsx('badge text-[10px] font-bold', v ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
            {v ? 'Active' : 'Suspended'}
          </span>
          {row.role === 'instructor' && row.approvalStatus && row.approvalStatus !== 'not_required' && (
            <span className={clsx('badge text-[10px] font-bold capitalize', APPROVAL_STYLES[row.approvalStatus])}>
              {row.approvalStatus === 'pending' && <Clock className="inline w-2.5 h-2.5 mr-0.5" />}
              {row.approvalStatus}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Joined',
      render: (v) => <span className="text-xs text-zinc-500">{formatDate(v)}</span>,
    },
    {
      key: 'lastLogin', header: 'Last Login',
      render: (v) => <span className="text-xs text-zinc-400">{v ? formatRelativeTime(v) : 'Never'}</span>,
    },
    {
      key: '_id', header: 'Actions', className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setSuspendTarget(row)}
            className={clsx('p-1.5 rounded-lg transition-colors',
              row.isActive ? 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50')}
            title={row.isActive ? 'Suspend' : 'Activate'}>
            {row.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="User Management"
        subtitle={`${total.toLocaleString()} total users`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…" className="input-field pl-10 bg-white" />
        </div>

        <div className="relative">
          <select value={roleFilter} onChange={e => { setRole(e.target.value); setPage(1); }}
            className="input-field pr-8 appearance-none cursor-pointer bg-white">
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="instructor">Instructors</option>
            <option value="admin">Admins</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>

        {/* Quick filter: Pending instructor approvals */}
        <button
          onClick={() => { setRole('instructor'); setApprovalFilter(approvalFilter === 'pending' ? '' : 'pending'); setPage(1); }}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
            approvalFilter === 'pending'
              ? 'bg-amber-100 text-amber-700 border-amber-300'
              : 'bg-white text-zinc-500 border-zinc-200 hover:border-amber-300 hover:text-amber-600'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Approvals
        </button>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} loading={isLoading} emptyMessage="No users found" />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-5" />

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit User" size="sm"
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => updateMutation.mutate({ id: editTarget._id, data: editForm })}
              disabled={updateMutation.isPending} className="btn-primary flex items-center gap-2">
              {updateMutation.isPending && <Loader size="sm" white />} Save Changes
            </button>
          </>
        }>
        {editTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Avatar src={editTarget.profilePicture} name={editTarget.name} size="md" />
              <div>
                <p className="font-semibold text-zinc-900">{editTarget.name}</p>
                <p className="text-xs text-zinc-400">{editTarget.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Full Name</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Email</label>
              <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Role</label>
              <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend confirm */}
      <ConfirmDialog
        open={!!suspendTarget} onClose={() => setSuspendTarget(null)}
        onConfirm={() => toggleMutation.mutate({ id: suspendTarget._id, active: suspendTarget.isActive })}
        loading={toggleMutation.isPending}
        variant={suspendTarget?.isActive ? 'warning' : 'info'}
        title={suspendTarget?.isActive ? 'Suspend this user?' : 'Activate this user?'}
        message={suspendTarget?.isActive
          ? `${suspendTarget?.name} will lose access to the platform.`
          : `${suspendTarget?.name} will regain access to the platform.`}
        confirmLabel={suspendTarget?.isActive ? 'Suspend User' : 'Activate User'}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
        loading={deleteMutation.isPending}
        title="Delete user permanently?"
        message={`"${deleteTarget?.name}" and all their data will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete User"
      />
    </div>
  );
}
