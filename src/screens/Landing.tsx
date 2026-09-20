import React, { useState } from 'react';
import { NavProps } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Landing({ nav }: { nav: NavProps }) {
  const { signInWithGoogle, signInWithEmail, sendPasswordReset, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { isNewUser } = await signInWithGoogle('employee');
      if (isNewUser) {
        nav.navigate('profile-setup');
      } else {
        nav.navigate('dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { isNewUser } = await signInWithEmail(email.trim(), password, 'employee');
      if (isNewUser) {
        nav.navigate('profile-setup');
      } else {
        nav.navigate('dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Sign in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await sendPasswordReset(forgotEmail.trim());
      setForgotSuccess(true);
      setTimeout(() => {
        setForgotSuccess(false);
        setShowForgotModal(false);
        setForgotEmail('');
      }, 3000);
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark flex flex-col overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }} />

      {/* Top accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-navy rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy-mid rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/4" />

      {/* Header */}
      <div className="relative z-10 p-6 sm:p-8 pt-8 sm:pt-12 flex items-start justify-between">
        <div>
          <div className="text-white/40 text-[10px] sm:text-xs font-mono tracking-widest uppercase mb-1.5">MetroWorks Infrastructure Services</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center flex-shrink-0">
              <Logo size={32} />
            </div>
            <span className="text-white text-xl font-display font-800">MetroAttend</span>
          </div>
        </div>
      </div>

      {/* Hero & Login Card */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 pb-10 max-w-md w-full mx-auto">
        {/* Visual Badge */}
        <div className="mb-6 flex justify-center">
          <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-xs font-display font-bold">Office Geofence Active</span>
              </div>
              <span className="text-emerald-300 text-[10px] font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                GPS Ready
              </span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="text-center mb-6">
          <h1 className="text-white text-2xl sm:text-3xl font-display font-800 leading-tight mb-2">
            Workforce Attendance
          </h1>
          <p className="text-white/50 text-xs sm:text-sm leading-relaxed">
            Verify workplace presence and manage your daily check-in logs.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-200 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Dual Authentication Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl space-y-4">
          {/* 1. Google 1-Click Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-navy-dark py-3.5 px-4 rounded-xl font-display font-bold text-sm transition-all hover:bg-white/95 active:scale-[0.98] shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27A7.2 7.2 0 014.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 000 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            {loading ? 'Authenticating…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-[10px] font-mono tracking-wider uppercase">or with email</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* 2. Email & Password Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div>
              <label className="block text-white/70 text-[11px] font-mono uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@metroworks.gov.gh"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-white/30 text-xs font-display focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white/70 text-[11px] font-mono uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-blue-300 hover:text-blue-200 text-[10px] font-display transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 pr-10 text-white placeholder-white/30 text-xs font-display focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-display font-bold text-xs transition-all shadow-md active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing in…' : 'Sign In with Email'}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => nav.navigate('register')}
              className="w-full bg-white/5 hover:bg-white/10 text-white/90 py-2.5 rounded-xl font-display font-semibold text-xs border border-white/10 transition-colors"
            >
              New staff member? Create Account
            </button>
          </div>
        </div>

        {/* Discreet Admin Entry */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => nav.navigate('admin-login')}
            className="text-white/30 text-[11px] font-mono hover:text-white/60 transition-colors uppercase tracking-widest cursor-pointer"
          >
            Administrator Console →
          </button>
          {!isConfigured && (
            <p className="text-white/25 text-[10px] font-mono mt-1">
              (Demo mode active — add Firebase keys in .env for live cloud sync)
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy flex items-center justify-center text-xl mx-auto mb-3 font-bold">
              🔑
            </div>
            <h3 className="text-base font-display font-800 text-slate-900 text-center mb-1">
              Reset Your Password
            </h3>
            <p className="text-slate-500 text-xs text-center mb-4 leading-relaxed">
              Enter your work email address and we'll send you a password recovery link.
            </p>

            {forgotSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl text-center mb-4 font-display font-semibold">
                ✓ Reset instructions sent! Please check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-3">
                {forgotError && (
                  <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-lg text-center">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1 font-bold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="staff@metroworks.gov.gh"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-slate-900 text-xs font-display focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotError(null); }}
                    className="flex-1 py-2.5 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-60"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
