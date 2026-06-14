import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '../../api/authApi';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

export function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Email is required'); return; }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Check your email</h2>
          <p className="text-stone-500">We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.</p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2 mt-4">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-stone-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900">Forgot password?</h2>
          <p className="mt-2 text-stone-500 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader size="sm" white /> Sending…</span>
              : 'Send Reset Link'}
          </button>

          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6)     { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm)     { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-stone-50">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900">Set new password</h2>
          <p className="mt-2 text-stone-500 text-sm">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength bar */}
            <div className="flex gap-1 mt-1">
              {[6, 10, 14].map((min, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  password.length >= min
                    ? ['bg-red-400','bg-amber-400','bg-emerald-500'][i]
                    : 'bg-stone-200'
                }`} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-700">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              className={`input-field ${confirm && confirm !== password ? 'border-red-400' : ''}`}
            />
            {confirm && confirm !== password && (
              <p className="text-xs text-red-500">Passwords don't match</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading
              ? <span className="flex items-center justify-center gap-2"><Loader size="sm" white /> Resetting…</span>
              : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
