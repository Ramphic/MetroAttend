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
          <div className="relative max-w-sm w-full bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center">
                  <Logo size={24} />
                </div>
                <div>
                  <div className="text-white text-xs font-display font-bold">MetroWorks Main Office</div>
                  <div className="text-white/60 text-[10px] font-mono">Geofence Perimeter Active</div>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live GPS
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 my-3.5">
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <div className="text-white/60 text-[9px] font-mono uppercase">Check-In Open</div>
                <div className="text-white text-sm font-display font-bold mt-0.5">Flexible Hours</div>
                <div className="text-emerald-300 text-[9px] font-mono mt-0.5">Early & late supported</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                <div className="text-white/60 text-[9px] font-mono uppercase">Verification</div>
                <div className="text-white text-sm font-display font-bold mt-0.5">Satellite GPS</div>
                <div className="text-blue-200 text-[9px] font-mono mt-0.5">Within 100m radius</div>
              </div>
            </div>

            <div className="bg-emerald-500/15 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-white text-xs font-display font-semibold flex items-center gap-2">
                <span>📱</span> Official Mobile PWA Ready
              </span>
              <span className="text-emerald-300 text-[10px] font-mono font-bold">iOS & Android</span>
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
