import React, { useState } from 'react';
import { NavProps } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Landing({ nav }: { nav: NavProps }) {
  const { signInWithGoogle, isConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { isNewUser, isAdmin } = await signInWithGoogle('employee');
      if (isAdmin) {
        nav.setAdminTab('dashboard');
        nav.navigate('admin-dashboard');
      } else if (isNewUser) {
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
      <div className="relative z-10 p-8 pt-12 flex items-start justify-between">
        <div>
          <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-2">MetroWorks Infrastructure Services</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center flex-shrink-0">
              <Logo size={32} />
            </div>
            <span className="text-white text-xl font-display font-800">MetroAttend</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-8 pb-8">
        {/* Visual */}
        <div className="mb-10 flex justify-center">
          <div className="relative w-72 h-44">
            {/* Phone mockup */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-32 h-44 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-3 shadow-2xl">
              <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-3" />
              {/* Check-in card */}
              <div className="bg-white/15 rounded-xl p-2.5 mb-2">
                <div className="text-white/60 text-[8px] font-mono mb-1">TODAY'S STATUS</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                  </div>
                  <div className="text-white text-[9px] font-display font-700">PRESENT</div>
                </div>
              </div>
              {/* Time */}
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-white/40 text-[7px] font-mono">CHECK-IN</div>
                <div className="text-white text-[11px] font-mono font-500">8:03 AM</div>
              </div>
              {/* Location badge */}
              <div className="flex items-center gap-1 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <div className="text-success text-[7px] font-display font-600">Location verified</div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-2 top-8 bg-white rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-success-bg flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <span className="text-slate-700 text-[10px] font-display font-600">GPS Verified</span>
            </div>

            <div className="absolute -right-2 bottom-4 bg-white rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <span className="text-slate-700 text-[10px] font-display font-600">Live Attendance</span>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="text-center mb-8">
          <div className="text-white/50 text-xs font-mono tracking-widest uppercase mb-3">Digital Attendance System</div>
          <h1 className="text-white text-3xl font-display font-800 leading-tight mb-3">
            Attendance,<br />
            <span className="text-white/60">verified & simple.</span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            Securely sign in with your Google account, verify workplace GPS, and track your daily work logs.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-200 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* CTA with Google Sign-in */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-navy-dark py-4 px-5 rounded-2xl font-display font-700 text-base transition-all hover:bg-white/95 active:scale-[0.98] shadow-xl flex items-center justify-center gap-3"
          >
            {/* Google Logo SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27A7.2 7.2 0 014.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 000 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            {loading ? 'Authenticating…' : 'Continue with Google'}
          </button>

          <button
            onClick={() => nav.navigate('register')}
            className="w-full bg-white/10 text-white py-3.5 rounded-2xl font-display font-600 text-sm border border-white/20 transition-all hover:bg-white/15"
          >
            Create Staff Account
          </button>

          <button
            onClick={() => {
              nav.onAdminBypass?.();
              nav.setAdminTab('dashboard');
              nav.navigate('admin-dashboard');
            }}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border border-blue-400/30 py-3.5 rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Open Admin Dashboard
          </button>
        </div>

        {/* Discreet Admin Entry */}
        <div className="mt-8 text-center">
          <button
            onClick={() => nav.navigate('admin-login')}
            className="text-white/30 text-[11px] font-mono hover:text-white/60 transition-colors uppercase tracking-widest"
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
    </div>
  );
}
