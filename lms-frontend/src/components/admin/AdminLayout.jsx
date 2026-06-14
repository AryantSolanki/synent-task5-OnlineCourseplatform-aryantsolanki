import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, BookOpen, FolderOpen,
  DollarSign, CreditCard, Settings, FileText,
  Activity, Mail, ShieldCheck, Menu, X,
  LogOut, ChevronRight, BarChart2, UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
import Avatar from '../common/Avatar';
import clsx from 'clsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Revenue',      href: '/admin/revenue',   icon: BarChart2 },
      { label: 'Activity Logs',href: '/admin/logs',      icon: Activity },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users',                href: '/admin/users',                icon: Users },
      { label: 'Instructor Approvals', href: '/admin/instructor-approvals',  icon: UserCheck, badge: 'pendingInstructors' },
      { label: 'Courses',              href: '/admin/courses',               icon: BookOpen },
      { label: 'Categories',           href: '/admin/categories',            icon: FolderOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payouts',      href: '/admin/payouts',   icon: CreditCard },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Settings',        href: '/admin/settings',        icon: Settings },
      { label: 'Email Templates', href: '/admin/email-templates', icon: Mail },
    ],
  },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live pending instructor count for sidebar badge
  const { data: statsData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboardStats,
    staleTime: 60_000,
  });
  const pendingInstructors = statsData?.data?.stats?.pendingInstructors ?? 0;
  const badgeCounts = { pendingInstructors };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-zinc-700/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none tracking-tight">Admin Panel</p>
            <p className="text-zinc-500 text-[10px] mt-0.5 font-medium uppercase tracking-wider">LearnHub Control</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, badge }) => (
                <NavLink key={href} to={href}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                      : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100'
                  )}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && badgeCounts[badge] > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badgeCounts[badge]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-700/60 p-3 flex-shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <Avatar src={user?.profilePicture} name={user?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-zinc-200 text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-zinc-500 text-[10px] truncate">{user?.email}</p>
          </div>
        </div>
        <Link to="/student/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 transition-colors">
          <BookOpen className="w-4 h-4" /> Student View
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-zinc-900 flex-shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-zinc-900 flex flex-col animate-slide-up shadow-2xl">
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 p-1">
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-zinc-900 border-b border-zinc-700/60 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-zinc-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Admin Panel</span>
          </div>
          <div className="ml-auto">
            <Avatar src={user?.profilePicture} name={user?.name} size="sm" />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
