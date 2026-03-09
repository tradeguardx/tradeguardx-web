import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24 bg-surface-950">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-white">TradeGuardX</Link>
            <h1 className="text-xl font-semibold text-white mt-6">Sign in</h1>
            <p className="text-slate-400 text-sm mt-2">Enter your account details</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-accent text-surface-950 font-semibold hover:bg-accent-hover transition-colors"
            >
              Sign in
            </button>
          </form>
          <div className="mt-5">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-700/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-surface-900/80 text-slate-500">or</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                loginWithGoogle();
                navigate(from, { replace: true });
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-accent/40 bg-accent/15 text-sm text-slate-100 hover:bg-accent/25 hover:border-accent/70 transition-colors"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <span className="text-[10px] font-bold text-slate-900">G</span>
              </span>
              Continue with Google
            </button>
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            Don’t have an account?{' '}
            <Link to="/signup" className="text-accent hover:underline">Create account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
