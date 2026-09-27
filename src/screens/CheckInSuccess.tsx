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

  const uid = user?.uid || profile?.id || profile?.uid || 'emp_1';
  const name = profile?.name ? profile.name.split(' ')[0] : (user?.displayName ? user.displayName.split(' ')[0] : 'Staff Member');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dutyType = localStorage.getItem('metroattend_last_duty_type') || 'Office HQ';
  const siteName = localStorage.getItem('metroattend_last_site_name') || 'Department HQ';
  const siteAddress = localStorage.getItem('metroattend_last_site_address') || 'Ministries, Central Accra';
  const siteCoords = localStorage.getItem('metroattend_last_site_coords') || '5.5492° N, -0.1978° W';

  return (
    <MobileShell nav={nav} showBottomNav={false}>
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-lg mx-auto">
        {/* Checkmark animation */}
        <div className={`mb-6 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-100 opacity-60 animate-ping" />
            <div className={`w-24 h-24 rounded-full ${dutyType === 'Field Site' ? 'bg-amber-500' : 'bg-success'} flex items-center justify-center relative shadow-lg`}>
              {dutyType === 'Field Site' ? (
                <span className="text-3xl">🚧</span>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className={`transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-2xl sm:text-3xl font-display font-800 text-slate-900 mb-2">
            {dutyType === 'Field Site' ? 'Site Check-in Confirmed!' : 'Check-in Confirmed!'}
          </h1>
          <p className="text-slate-600 text-sm">{getGreeting()}, {name}.</p>
          <p className="text-slate-500 text-sm mt-0.5">
            Your attendance was timestamped at <span className="font-display font-bold text-navy">{nav.checkInTime || '8:03 AM'}</span> today.
          </p>
        </div>

        {/* Status badge */}
        <div className={`mt-5 transition-all duration-500 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <span className={`${dutyType === 'Field Site' ? 'bg-amber-500 text-slate-950 font-800' : 'bg-success text-white font-bold'} text-xs font-display px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm`}>
            {dutyType === 'Field Site' ? 'STATUS: PRESENT (ROAD SITE DUTY)' : 'STATUS: PRESENT'}
          </span>
        </div>

        {/* Verification Card */}
        <div className={`w-full mt-8 bg-surface rounded-2xl border border-border p-5 text-left space-y-3 transition-all duration-500 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {dutyType === 'Field Site' ? (
            <>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-muted font-display font-semibold">Duty Assignment</span>
                <span className="text-xs font-display font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>🚧</span> Road Corridor Inspection
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-muted font-display font-semibold">Project Corridor</span>
                <span className="text-xs font-display font-bold text-slate-800 max-w-[200px] text-right truncate" title={siteName}>
                  {siteName}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-muted font-display font-semibold">Field Locality / Area</span>
                <span className="text-xs font-display font-bold text-navy max-w-[210px] text-right truncate" title={siteAddress}>
                  📍 {siteAddress}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted font-display font-semibold">Cloud Verification</span>
                <span className="text-xs font-mono font-bold text-success">Logged to Admin Roster ✓</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-muted font-display font-semibold">Location Verification</span>
                <span className="text-xs font-display font-bold text-success flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  GPS Confirmed On-Site
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-xs text-muted font-display font-semibold">Facility Location</span>
                <span className="text-xs font-display font-bold text-slate-800">📍 Ministries, Central Accra</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted font-display font-semibold">Cloud Database Status</span>
                <span className="text-xs font-mono font-bold text-navy">Synced with Firestore ✓</span>
              </div>
            </>
          )}
        </div>

        <div className="w-full mt-6 space-y-2.5">
          <button
            onClick={() => nav.navigate('dashboard')}
            className="w-full bg-navy text-white py-3.5 rounded-xl font-display font-bold text-sm hover:bg-navy-dark transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Return to Dashboard</span>
            <span>→</span>
          </button>

          <button
            onClick={() => nav.navigate('attendance-history')}
            className="w-full py-3 px-3 bg-surface hover:bg-slate-100 text-slate-700 hover:text-navy border border-border font-display font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>View My Attendance Records</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
