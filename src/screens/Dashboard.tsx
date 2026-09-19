import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { getWorkplaceSettings, recordCheckOut, addNotification, DEFAULT_WORKPLACE } from '../lib/firebase';

export default function Dashboard({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);

  useEffect(() => {
    getWorkplaceSettings().then(setWorkplace);
  }, []);

  const isCheckedIn = nav.checkInStatus === 'checked-in';
  const isCheckedOut = nav.checkInStatus === 'checked-out';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const firstName = profile?.name 
    ? profile.name.split(' ')[0] 
    : user?.displayName 
      ? user.displayName.split(' ')[0] 
      : 'Staff Member';

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCheckOut = async () => {
    const timeStr = formatCurrentTime();
    nav.setCheckOutTime(timeStr);
    nav.setCheckInStatus('checked-out');
    const uid = user?.uid || profile?.id || 'emp_1';
    await recordCheckOut(uid, timeStr);
    await addNotification({
      title: 'Shift Check-Out Recorded',
      body: `You logged your end-of-day check-out at ${timeStr}. Today's work session is complete.`,
      type: 'info',
      time: `${timeStr} today`,
      timestamp: Date.now(),
      unread: true,
      targetUserId: uid,
    });
  };

  return (
    <MobileShell nav={nav} showBottomNav currentTab="home">
      {/* Top Banner */}
      <div className="bg-navy px-6 py-7 sm:px-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono mb-1">
              <span>{dateStr}</span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">{workplace.officeName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-800 leading-tight">
              Good morning, {firstName} 👋
            </h1>
            <p className="text-white/60 text-xs sm:text-sm font-sans mt-1">
              {profile?.position || 'Staff Specialist'} · {profile?.department || 'Operations'} · <span className="text-white/80 font-mono">{profile?.staffId || 'ID Pending'}</span>
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex gap-2 sm:gap-3">
            {[
              { label: 'Present', value: '18', color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
              { label: 'Late', value: '2', color: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
              { label: 'Absent', value: '1', color: 'bg-red-500/20 text-red-200 border-red-500/30' },
            ].map(s => (
              <div key={s.label} className={`flex-1 sm:w-20 px-3 py-2 rounded-2xl border text-center ${s.color}`}>
                <div className="text-base sm:text-lg font-display font-800 leading-tight">{s.value}</div>
                <div className="text-[10px] font-mono opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Responsive Content Grid */}
      <div className="p-6 sm:p-8 bg-slate-50/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Attendance Card (Left 2 cols on desktop) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-0.5">Today's Attendance Status</div>
                <div className="text-lg font-display font-800 text-slate-800">
                  {!isCheckedIn && !isCheckedOut && 'Awaiting Daily Check-In'}
                  {isCheckedIn && 'Currently Clocked In'}
                  {isCheckedOut && 'Workday Completed · Checked Out'}
                </div>
              </div>

              {!isCheckedIn && !isCheckedOut && (
                <span className="bg-slate-100 text-slate-500 text-xs font-display font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  PENDING
                </span>
              )}
              {isCheckedIn && (
                <span className="bg-success-bg text-success text-xs font-display font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-ping" />
                  PRESENT
                </span>
              )}
              {isCheckedOut && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-display font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  COMPLETE
                </span>
              )}
            </div>

            {/* Time Metrics Row */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="bg-surface rounded-2xl p-4 border border-border">
                <div className="text-[10px] font-mono text-muted uppercase mb-1">Check-in</div>
                <div className={`text-base font-mono font-bold ${nav.checkInTime ? 'text-navy' : 'text-slate-300'}`}>
                  {nav.checkInTime || '— —'}
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-4 border border-border">
                <div className="text-[10px] font-mono text-muted uppercase mb-1">Check-out</div>
                <div className={`text-base font-mono font-bold ${nav.checkOutTime ? 'text-navy' : 'text-slate-300'}`}>
                  {nav.checkOutTime || '— —'}
                </div>
              </div>
              <div className="bg-surface rounded-2xl p-4 border border-border">
                <div className="text-[10px] font-mono text-muted uppercase mb-1">Work Starts</div>
                <div className="text-base font-mono font-bold text-slate-700">{workplace.workStartTime} AM</div>
              </div>
            </div>

            {/* Geofence Notice Pill */}
            <div className="flex items-center gap-3.5 bg-navy-50 rounded-2xl p-4 mb-6 border border-navy/15">
              <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-navy text-sm font-display font-bold truncate">{workplace.officeName}</div>
                <div className="text-navy/60 text-xs font-mono">
                  {isCheckedIn ? 'GPS positioning verified on-site ✓' : `Requires verified GPS presence within ${workplace.geofenceRadius}m`}
                </div>
              </div>
            </div>

            {/* Action CTA Button */}
            {!isCheckedIn && !isCheckedOut && (
              <button
                onClick={() => nav.navigate('location-verify')}
                className="w-full bg-navy text-white py-4 rounded-2xl font-display font-bold text-base transition-all hover:bg-navy-dark active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Verify GPS Location & Check In
              </button>
            )}

            {isCheckedIn && (
              <button
                onClick={handleCheckOut}
                className="w-full bg-danger text-white py-4 rounded-2xl font-display font-bold text-base transition-all hover:bg-red-700 active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Record Daily Check Out
              </button>
            )}

            {isCheckedOut && (
              <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 py-4 rounded-2xl font-display font-bold text-base text-center flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Checked out at {nav.checkOutTime} · Have a great evening!
              </div>
            )}
          </div>

          {/* Right Column: Quick Links & Summary Info */}
          <div className="space-y-4">
            {/* View History tile */}
            <button
              onClick={() => nav.navigate('attendance-history')}
              className="w-full bg-white rounded-2xl p-5 border border-border text-left hover:border-navy/30 transition-all shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy flex items-center justify-center mb-3 group-hover:bg-navy group-hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="text-slate-800 text-sm font-display font-bold">Attendance Records</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                View your monthly calendar, punctuality stats, and verified timestamps.
              </p>
            </button>

            {/* Profile tile */}
            <button
              onClick={() => nav.navigate('emp-profile')}
              className="w-full bg-white rounded-2xl p-5 border border-border text-left hover:border-navy/30 transition-all shadow-xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy flex items-center justify-center mb-3 group-hover:bg-navy group-hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="text-slate-800 text-sm font-display font-bold">Staff Credentials</div>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Review your department assignment, supervisor, and contact details.
              </p>
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
