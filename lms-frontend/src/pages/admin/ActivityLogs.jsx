import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Activity, Shield, BookOpen, FolderOpen, CreditCard, Settings, Mail } from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/common/Avatar';
import Loader from '../../components/common/Loader';
import { useDebounce } from '../../hooks/useDebounce';
import clsx from 'clsx';

const ACTION_CONFIG = {
  USER_BANNED:         { icon: <Shield    className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-600' },
  USER_ACTIVATED:      { icon: <Shield    className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-600' },
  USER_UPDATED:        { icon: <Shield    className="w-3.5 h-3.5" />, color: 'bg-sky-100 text-sky-600' },
  COURSE_APPROVED:     { icon: <BookOpen  className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-600' },
  COURSE_REJECTED:     { icon: <BookOpen  className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-600' },
  CATEGORY_CREATED:    { icon: <FolderOpen className="w-3.5 h-3.5" />, color: 'bg-violet-100 text-violet-600' },
  CATEGORY_UPDATED:    { icon: <FolderOpen className="w-3.5 h-3.5" />, color: 'bg-sky-100 text-sky-600' },
  CATEGORY_DELETED:    { icon: <FolderOpen className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-600' },
  PAYOUT_PROCESSED:    { icon: <CreditCard className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-600' },
  SETTINGS_UPDATED:    { icon: <Settings  className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-600' },
  EMAIL_TEMPLATE_UPDATED:{ icon: <Mail    className="w-3.5 h-3.5" />, color: 'bg-brand-100 text-brand-600' },
  default:             { icon: <Activity  className="w-3.5 h-3.5" />, color: 'bg-zinc-100 text-zinc-500' },
};

export default function ActivityLogs() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const dSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, dSearch],
    queryFn: () => adminApi.getActivityLogs({ page, limit: 20, search: dSearch || undefined }),
    placeholderData: prev => prev,
  });

  const logs       = data?.logs       ?? data?.data?.logs       ?? [];
  const total      = data?.total      ?? data?.data?.total      ?? 0;
  const totalPages = data?.pages      ?? data?.data?.pages      ?? 1;

  const getConfig = (action) => ACTION_CONFIG[action] ?? ACTION_CONFIG.default;

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Activity Logs"
        subtitle={`${total.toLocaleString()} recorded actions`}
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Activity Logs' }]}
      />

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search actions or admins…" className="input-field pl-10 bg-white" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon="📋" title="No activity logs" description="Admin actions will appear here as they happen." />
        </div>
      ) : (
        <div className="card divide-y divide-zinc-50">
          {logs.map((log) => {
            const cfg = getConfig(log.action);
            return (
              <div key={log._id} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50/50 transition-colors">
                {/* Action icon */}
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.color)}>
                  {cfg.icon}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {log.action}
                    </code>
                    {log.targetType && (
                      <span className="text-xs text-zinc-400">on {log.targetType}</span>
                    )}
                    {log.targetName && (
                      <span className="text-xs font-semibold text-zinc-600 truncate">"{log.targetName}"</span>
                    )}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                      {JSON.stringify(log.details).slice(0, 120)}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5">
                    {log.admin && (
                      <div className="flex items-center gap-1.5">
                        <Avatar src={log.admin?.profilePicture} name={log.admin?.name} size="xs" />
                        <span className="text-xs text-zinc-500">{log.admin?.name ?? 'Admin'}</span>
                      </div>
                    )}
                    {log.ipAddress && (
                      <span className="text-xs text-zinc-300 font-mono">{log.ipAddress}</span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-400">{formatRelativeTime(log.createdAt)}</p>
                  <p className="text-[10px] text-zinc-300 mt-0.5">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-5" />
    </div>
  );
}
