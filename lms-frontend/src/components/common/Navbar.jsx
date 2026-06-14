import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, BookOpen, ChevronDown, Bell, LogOut, User, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';
import clsx from 'clsx';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [search, setSearch]         = useState('');
  const [userMenu, setUserMenu]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/courses?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    setUserMenu(false);
    navigate('/');
  };

  const navLinkClass = ({ isActive }) =>
    clsx('text-sm font-medium transition-colors', isActive ? 'text-brand-600' : 'text-stone-600 hover:text-stone-900');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-stone-900 text-lg tracking-tight">LearnHub</span>
          </Link>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search for courses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10 pr-4 py-2 bg-stone-50 border-stone-200"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 ml-auto">
            <NavLink to="/courses" className={navLinkClass}>Browse</NavLink>
            {isAuthenticated && (
              <NavLink to="/student/my-learning" className={navLinkClass}>My Learning</NavLink>
            )}
          </nav>

          {/* Auth buttons / user menu */}
          <div className="hidden md:flex items-center gap-3 ml-4">
            {!isAuthenticated ? (
              <>
                <Link to="/login"    className="btn-ghost">Log in</Link>
                <Link to="/register" className="btn-primary">Sign up</Link>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-stone-50 transition-colors"
                >
                  <Avatar src={user.profilePicture} name={user.name} size="sm" />
                  <ChevronDown className={clsx('w-4 h-4 text-stone-400 transition-transform', userMenu && 'rotate-180')} />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-modal border border-stone-100 py-1.5 animate-fade-in z-50">
                    <div className="px-4 py-2.5 border-b border-stone-100">
                      <p className="text-sm font-semibold text-stone-900 truncate">{user.name}</p>
                      <p className="text-xs text-stone-400 truncate">{user.email}</p>
                    </div>
                    <MenuLink to="/student/dashboard"    icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setUserMenu(false)}>Dashboard</MenuLink>
                    <MenuLink to="/student/my-learning"  icon={<BookOpen className="w-4 h-4" />} onClick={() => setUserMenu(false)}>My Learning</MenuLink>
                    <MenuLink to="/student/profile"      icon={<User className="w-4 h-4" />} onClick={() => setUserMenu(false)}>Profile</MenuLink>
                    <MenuLink to="/student/notifications" icon={<Bell className="w-4 h-4" />} onClick={() => setUserMenu(false)}>Notifications</MenuLink>
                    {(user.role === 'instructor' || user.role === 'admin') && (
                      <MenuLink to="/instructor/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setUserMenu(false)}>Instructor Panel</MenuLink>
                    )}
                    {user.role === 'admin' && (
                      <MenuLink to="/admin/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} onClick={() => setUserMenu(false)}>Admin Panel</MenuLink>
                    )}
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden ml-auto p-2" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-4 space-y-3 animate-slide-up">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…" className="input-field pl-10" />
          </form>
          <Link to="/courses" className="block text-sm font-medium text-stone-700 py-2" onClick={() => setMobileOpen(false)}>Browse Courses</Link>
          {isAuthenticated ? (
            <>
              <Link to="/student/dashboard"   className="block text-sm font-medium text-stone-700 py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link to="/student/my-learning" className="block text-sm font-medium text-stone-700 py-2" onClick={() => setMobileOpen(false)}>My Learning</Link>
              <button onClick={handleLogout} className="block w-full text-left text-sm font-medium text-red-600 py-2">Sign out</button>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/login"    className="flex-1 btn-secondary text-center" onClick={() => setMobileOpen(false)}>Log in</Link>
              <Link to="/register" className="flex-1 btn-primary text-center"   onClick={() => setMobileOpen(false)}>Sign up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function MenuLink({ to, icon, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
      <span className="text-stone-400">{icon}</span>
      {children}
    </Link>
  );
}
