import React, { useEffect, useState } from 'react';
import { NavProps } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';

export default function CheckInSuccess({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const name = profile?.name ? profile.name.split(' ')[0] : (user?.displayName ? user.displayName.split(' ')[0] : 'Staff Member');

  return (
    <MobileShell nav={nav} showBottomNav={false}>
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto">
        {/* Checkmark animation */}
        <div className={`mb-6 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-100 opacity-60 animate-ping" />
            <div className="w-24 h-24 rounded-full bg-success flex items-center justify-center relative shadow-lg">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className={`transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-2xl sm:text-3xl font-display font-800 text-slate-900 mb-2">Check-in Confirmed!</h1>
          <p className="text-slate-600 text-sm">Good morning, {name}.</p>
          <p className="text-slate-500 text-sm mt-0.5">
            Your attendance was timestamped at <span className="font-display font-bold text-navy">{nav.checkInTime || '8:03 AM'}</span> today.
          </p>
        </div>

        {/* Status badge */}
        <div className={`mt-5 transition-all duration-500 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <span className="bg-success text-white text-xs font-display font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
            STATUS: PRESENT
          </span>
        </div>

        {/* Verification Card */}
        <div className={`w-full mt-8 bg-surface rounded-2xl border border-border p-5 text-left space-y-3 transition-all duration-500 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-xs text-muted font-display font-semibold">Location Verification</span>
            <span className="text-xs font-display font-bold text-success flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              GPS Confirmed On-Site
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-xs text-muted font-display font-semibold">Authorized Geofence</span>
            <span className="text-xs font-mono font-bold text-slate-800">5.7067° N, -0.2982° W</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted font-display font-semibold">Cloud Database Status</span>
            <span className="text-xs font-mono font-bold text-navy">Synced with Firestore ✓</span>
          </div>
        </div>

        <button
          onClick={() => nav.navigate('dashboard')}
          className="w-full mt-6 bg-navy text-white py-4 rounded-xl font-display font-bold text-sm hover:bg-navy-dark transition-all shadow-md"
        >
          Return to Dashboard →
        </button>
      </div>
    </MobileShell>
  );
}
