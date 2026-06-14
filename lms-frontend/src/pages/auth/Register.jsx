import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Clock, CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const [pendingApproval, setPendingApproval] = useState(false);
  const [registeredName, setRegisteredName] = useState('');

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email)                        e.email = 'Email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await register(form);
      if (data.requiresApproval) {
        // Instructor awaiting admin approval — show waiting screen
        setRegisteredName(form.name);
        setPendingApproval(true);
        toast.success('Application submitted! Awaiting admin approval.');
      } else if (data.token) {
        toast.success('Account created! Welcome to LearnHub 🎉');
        navigate('/student/dashboard');
      } else {
        toast.success('Account created! Please check your email to verify.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => { setForm(p => ({ ...p, [key]: e.target.value })); setErrors(p => ({ ...p, [key]: '' })); },
  });

  // ── Pending Approval Screen ──────────────────────────────────
  if (pendingApproval) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-stone-50">
        <div className="w-full max-w-md">
          <div className="card p-10 text-center space-y-6">
            {/* Icon */}
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Application Submitted!</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                Hi <strong>{registeredName}</strong>, your instructor application is now under review.
                Our admin team will verify your details and approve your account shortly.
              </p>
            </div>

            {/* Steps */}
            <div className="text-left space-y-3 bg-stone-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-stone-700">Application received</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-stone-700 font-medium">Admin review in progress…</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-stone-400" />
                </div>
                <span className="text-sm text-stone-400">Login access granted after approval</span>
              </div>
            </div>

            <p className="text-xs text-stone-400">
              Already approved?{' '}
              <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-stone-50">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-stone-900">Create your account</h2>
          <p className="mt-2 text-stone-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        <div className="card p-8">
          {/* Role toggle */}
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg mb-6">
            {['student', 'instructor'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm(p => ({ ...p, role: r }))}
                className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all ${
                  form.role === r ? 'bg-white shadow text-brand-700' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Instructor notice */}
          {form.role === 'instructor' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Instructor accounts require <strong>admin approval</strong> before you can log in.
                After registering, your application will be reviewed within 24–48 hours.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Full name</label>
              <input type="text" autoComplete="name" placeholder="John Doe" {...field('name')}
                className={`input-field ${errors.name ? 'border-red-400' : ''}`} />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Email address</label>
              <input type="email" autoComplete="email" placeholder="you@example.com" {...field('email')}
                className={`input-field ${errors.email ? 'border-red-400' : ''}`} />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-700">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="Minimum 6 characters" {...field('password')}
                  className={`input-field pr-10 ${errors.password ? 'border-red-400' : ''}`} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}

              {/* Strength bar */}
              <div className="flex gap-1 mt-1">
                {[6, 10, 14].map((min, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    form.password.length >= min ? ['bg-red-400', 'bg-amber-400', 'bg-emerald-500'][i] : 'bg-stone-200'
                  }`} />
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader size="sm" white /> Creating account…</span>
                : form.role === 'instructor' ? 'Submit Instructor Application' : 'Create student account'}
            </button>

            <p className="text-xs text-stone-400 text-center">
              By signing up, you agree to our{' '}
              <a href="#" className="text-brand-600 hover:underline">Terms</a> and{' '}
              <a href="#" className="text-brand-600 hover:underline">Privacy Policy</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
