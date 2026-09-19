import React, { useState } from 'react';
import { NavProps } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DESIGNATED_ADMIN_EMAIL } from '../../lib/firebase';
import Logo from '../../components/Logo';

export default function AdminLogin({ nav }: { nav: NavProps }) {
  const { signInWithGoogle, isConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { isAdmin } = await signInWithGoogle('admin');
      if (isAdmin) {
        nav.setAdminTab('dashboard');
        nav.navigate('admin-dashboard');
      } else {
        setError(`Access Denied: Your account does not have administrator privileges. Only the designated administrator (${DESIGNATED_ADMIN_EMAIL}) is authorized.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminBypass = () => {
    nav.onAdminBypass?.();
    nav.setAdminTab('dashboard');
    nav.navigate('admin-dashboard');
  };

  return (
    <div className="min-h-screen bg-navy-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-navy-mid rounded-full blur-3xl opacity-30 translate-x-1/3 translate-y-1/3" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-3">MetroWorks Infrastructure Services</div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center flex-shrink-0">
              <Logo size={36} />
            </div>
            <div>
              <div className="text-white text-xl font-display font-800">MetroAttend</div>
              <div className="text-white/40 text-[10px] font-mono">Protected Admin Gateway</div>
            </div>
          </div>
        </div>

        {/* Security badge note */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md">
          <div className="flex items-center gap-2 text-white text-sm font-display font-700 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Protected Management Console
          </div>
          <p className="text-white/60 text-xs leading-relaxed font-sans mb-3">
            This dashboard contains sensitive workforce analytics, attendance overrides, and GPS geofence controls. Only authorized system administrators may log in.
          </p>
          <div className="text-[11px] font-mono text-white/40">
            Designated Admin: <span className="text-white/80 font-bold">{DESIGNATED_ADMIN_EMAIL}</span>
          </div>
        </div>

        <div className="relative z-10 text-white/20 text-xs font-mono">
          © 2026 MetroWorks Infrastructure Services · All rights reserved
        </div>
      </div>

      {/* Right panel - Secure Login */}
      <div className="flex-1 flex items-center justify-center bg-white rounded-l-3xl lg:rounded-l-[2rem] p-8">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-slate-200 p-2 shadow-sm flex items-center justify-center mb-3">
              <Logo size={42} />
            </div>
            <div className="text-navy text-2xl font-display font-800">MetroAttend</div>
            <div className="text-muted text-xs font-mono">Protected Admin Gateway</div>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Restricted Area
            </div>
            <h1 className="text-2xl font-display font-800 text-slate-900">Administrator Portal</h1>
            <p className="text-muted text-xs mt-1">Authenticate using your designated administrator account.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl leading-relaxed">
              <div className="font-bold mb-0.5">Authorization Error</div>
              {error}
            </div>
          )}

          {/* Primary Admin Sign-in via Google */}
          <div className="space-y-4 mb-6">
            <button
              onClick={handleAdminGoogleLogin}
              disabled={loading}
              className="w-full bg-navy text-white py-4 px-4 rounded-2xl font-display font-700 text-sm transition-all hover:bg-navy-dark active:scale-[0.98] shadow-md flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27A7.2 7.2 0 014.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 000 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              {loading ? 'Verifying Admin Privileges…' : 'Sign in as Administrator'}
            </button>

            <button
              onClick={handleDemoAdminBypass}
              type="button"
              className="w-full bg-surface border border-slate-200 text-slate-700 py-3 rounded-xl font-display font-semibold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
            >
              <span>👁</span> Preview Admin Console (Instant Access)
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-display font-700 text-slate-700 mb-1">Access Protocol</div>
            <p className="text-muted text-[11px] leading-relaxed">
              Standard employees are restricted to the mobile check-in interface. Unauthorized attempts are logged.
            </p>
          </div>

          <button
            onClick={() => nav.navigate('landing')}
            className="w-full mt-5 text-muted text-xs font-display font-600 hover:text-navy transition-colors text-center"
          >
            ← Return to Employee Check-in
          </button>
        </div>
      </div>
    </div>
  );
}
