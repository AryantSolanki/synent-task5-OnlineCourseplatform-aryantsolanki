import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BookOpen, CheckCircle, Award, MessageSquare, Megaphone, User, Check } from 'lucide-react';
import API from '../../api/axios';
import { formatRelativeTime } from '../../utils/formatters';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/common/Loader';
import clsx from 'clsx';

const TYPE_CONFIG = {
  enrollment:       { icon: <BookOpen className="w-4 h-4" />,     color: 'bg-brand-100 text-brand-600' },
  course_completed: { icon: <CheckCircle className="w-4 h-4" />,  color: 'bg-emerald-100 text-emerald-600' },
  certificate_issued:{ icon: <Award className="w-4 h-4" />,       color: 'bg-violet-100 text-violet-600' },
  discussion_reply: { icon: <MessageSquare className="w-4 h-4" />,color: 'bg-sky-100 text-sky-600' },
  announcement:     { icon: <Megaphone className="w-4 h-4" />,    color: 'bg-amber-100 text-amber-600' },
  new_student:      { icon: <User className="w-4 h-4" />,         color: 'bg-rose-100 text-rose-600' },
  default:          { icon: <Bell className="w-4 h-4" />,          color: 'bg-stone-100 text-stone-600' },
};

const fetchNotifications = () => API.get('/student/notifications').then(r => r.data);
const markAllRead        = () => API.put('/student/notifications/read-all').then(r => r.data);
const markOneRead   = (id) => API.put(`/student/notifications/${id}/read`).then(r => r.data);

export default function Notifications() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    // Gracefully degrade if endpoint doesn't exist yet
    retry: false,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const notifications = (data?.notifications ?? data?.data ?? []).filter(n => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = (data?.notifications ?? data?.data ?? []).filter(n => !n.isRead).length;

  const getConfig = (type) => TYPE_CONFIG[type] ?? TYPE_CONFIG.default;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Notifications' }]}
        actions={
          unreadCount > 0 && (
            <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}
              className="btn-secondary flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {['all', 'unread'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
              filter === f ? 'bg-white shadow text-brand-700' : 'text-stone-500 hover:text-stone-700')}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader /></div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState icon="🔔" title="No notifications" description="You're all caught up! New activity will appear here." />
        </div>
      ) : (
        <div className="card divide-y divide-stone-50">
          {notifications.map((n) => {
            const cfg = getConfig(n.type);
            return (
              <div key={n._id}
                className={clsx('flex items-start gap-4 px-5 py-4 transition-colors', !n.isRead && 'bg-brand-50/40')}>
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.color)}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm leading-snug', !n.isRead ? 'text-stone-900 font-semibold' : 'text-stone-700')}>
                    {n.title || n.message}
                  </p>
                  {n.title && n.message && n.title !== n.message && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* If API not implemented yet */}
      {!isLoading && !data && (
        <div className="card">
          <EmptyState icon="🔔" title="Notifications coming soon" description="This feature will be available once the notifications API is set up." />
        </div>
      )}
    </div>
  );
}
