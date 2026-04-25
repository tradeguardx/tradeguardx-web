import { useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AppLoader from '../components/common/AppLoader';
import { useToast } from '../components/common/ToastProvider';

export default function LoginPage() {
  useSEO({ title: 'Log In', url: 'https://tradeguardx.com/login' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully', 'Welcome back to TradeGuardX.');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error('Sign in failed', error?.message || 'Please check credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      toast.info('Redirecting to Google', 'Complete sign-in and you will return to the dashboard.');
      window.setTimeout(() => setIsSubmitting(false), 3000);
    } catch (error) {
      toast.error('Google sign-in failed', error?.message || 'Please try again in a moment.');
      setIsSubmitting(false);
      return;
    }
  };

  const ring = (f) => focused === f
    ? 'border-accent/40 bg-surface-800/80 ring-1 ring-accent/20'
    : 'border-surface-700/60 bg-surface-800/50 hover:border-surface-600/60';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative">
      {isSubmitting && <AppLoader />}
      {/* bg */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-accent/[0.07] blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-[440px]"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <span className="w-8 h-8 rounded-lg bg-accent/15 grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="font-display text-lg font-bold text-white">TradeGuardX</span>
          </Link>
          <h1 className="font-display text-[28px] font-bold text-white mb-1.5">Welcome back</h1>
          <p className="text-slate-500 text-[15px]">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/70 backdrop-blur-xl p-7 sm:p-8 shadow-xl shadow-black/25">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-surface-700/60 bg-surface-800/50 hover:bg-surface-800 hover:border-surface-600/60 transition-all text-[14px] text-slate-200 font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-700/50" />
            <span className="text-xs text-slate-600 font-medium">OR</span>
            <div className="flex-1 h-px bg-surface-700/50" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                required
                placeholder="you@example.com"
                className={`w-full h-12 px-4 rounded-xl border text-white text-[14px] placeholder-slate-600 focus:outline-none transition-all ${ring('email')}`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium text-slate-400">Password</label>
                <Link
                  to="/support"
                  className="text-[12px] text-slate-600 hover:text-accent transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                  required
                  placeholder="Enter your password"
                  className={`w-full h-12 px-4 pr-12 rounded-xl border text-white text-[14px] placeholder-slate-600 focus:outline-none transition-all ${ring('pw')}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPw ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-accent text-surface-950 font-semibold text-[14px] hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30 mt-1"
            >
              Sign in
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-[14px] mt-7">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-accent hover:text-accent-hover font-medium transition-colors">Create one</Link>
        </p>

        <div className="flex items-center justify-center gap-5 mt-8">
          {['Secure login', '2,500+ traders', 'Free plan available'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-1 h-1 rounded-full bg-accent/50" />
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
