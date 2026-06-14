import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, DollarSign,
  BarChart2, Settings, ChevronLeft, Menu, X,
  LogOut, GraduationCap, Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import clsx from 'clsx';

const NAV = [
  { label: 'Dashboard',    href: '/instructor/dashboard', icon: LayoutDashboard },
  { label: 'My Courses',   href: '/instructor/courses',   icon: BookOpen },
  { label: 'Students',     href: '/instructor/students',  icon: Users },
  { label: 'Revenue',      href: '/instructor/revenue',   icon: DollarSign },
  { label: 'Analytics',    href: '/instructor/analytics', icon: BarChart2 },
];

export default function InstructorLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx('flex items-center gap-3 px-5 py-5 border-b border-stone-800 flex-shrink-0', collapsed && 'justify-center px-3')}>
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">Instructor</p>
            <p className="text-stone-500 text-xs mt-0.5">LearnHub</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => (
          <NavLink key={href} to={href}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-stone-400 hover:bg-stone-800 hover:text-white'
            )}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className={clsx('border-t border-stone-800 p-3 flex-shrink-0', collapsed ? 'items-center flex flex-col gap-2' : 'space-y-1')}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <Avatar src={user?.profilePicture} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-stone-500 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <Link to="/" className={clsx('flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-800 hover:text-white transition-colors', collapsed && 'justify-center px-2')}>
          <BookOpen className="w-4 h-4" />
          {!collapsed && 'Student View'}
        </Link>
        <button onClick={handleLogout} className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-red-900/30 hover:text-red-400 transition-colors', collapsed && 'justify-center px-2')}>
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden lg:flex flex-col bg-stone-900 flex-shrink-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}>
        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(v => !v)}
          className="absolute left-0 top-20 translate-x-full z-10 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-r-lg p-1.5 hidden lg:flex transition-colors"
          style={{ marginLeft: collapsed ? '3.8rem' : '13.5rem', transition: 'margin 300ms' }}>
          <ChevronLeft className={clsx('w-3.5 h-3.5 transition-transform', collapsed && 'rotate-180')} />
        </button>
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-56 bg-stone-900 flex flex-col animate-slide-up">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-stone-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-stone-100 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-stone-500">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-stone-900">Instructor Panel</span>
          <div className="ml-auto">
            <Avatar src={user?.profilePicture} name={user?.name} size="sm" />
          </div>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
