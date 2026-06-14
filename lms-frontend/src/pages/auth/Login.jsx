import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/student/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-xl">LearnHub</span>
        </div>

        <div className="space-y-6 max-w-sm">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Continue your learning journey
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed">
            Access thousands of courses, track your progress, and earn certificates.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[['10K+', 'Courses'],['50K+', 'Students'],['4.8★', 'Avg Rating']].map(([v, l]) => (
              <div key={l} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-white">{v}</div>
                <div className="text-xs text-brand-200 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-300 text-sm">© 2025 LearnHub</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-stone-50">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-stone-900">Sign in</h2>
            <p className="mt-2 text-stone-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 font-semibold hover:underline">Sign up free</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => { setForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-stone-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => { setForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="••••••••"
                  className={`input-field pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? <span className="flex items-center justify-center gap-2"><Loader size="sm" white /> Signing in…</span> : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="border border-dashed border-stone-300 rounded-xl p-4 bg-white space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Demo credentials</p>
            {[
              { role: 'Student', email: 'student@demo.com', pw: 'password123' },
              { role: 'Instructor', email: 'instructor@demo.com', pw: 'password123' },
            ].map(({ role, email, pw }) => (
              <button key={role} onClick={() => setForm({ email, password: pw })}
                className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-stone-50 hover:bg-brand-50 transition-colors border border-stone-100">
                <span className="font-semibold text-brand-600">{role}</span>
                <span className="text-stone-500 ml-2">{email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
