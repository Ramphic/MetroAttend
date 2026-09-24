import React, { useState, useEffect } from 'react';
import { NavProps, AttendanceRecord } from '../types';
import { getEmployeeAttendance } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import MobileShell from '../components/MobileShell';

type Filter = 'week' | 'month';

export default function AttendanceHistory({ nav }: { nav: NavProps }) {
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState<Filter>('month');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const uid = user?.uid || profile?.id || 'emp_1';
    getEmployeeAttendance(uid).then(setRecords);
  }, [user, profile]);

  const displayedRecords = filter === 'week' ? records.slice(0, 5) : records;

  const presentCount = records.filter(r => r.status === 'Present').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const rate = records.length > 0 ? Math.round(((presentCount + lateCount) / records.length) * 100) : 100;

  const statusColor = (s: string) => {
    if (s === 'Present') return 'bg-success-bg text-success';
    if (s === 'Late') return 'bg-late-bg text-late';
    if (s === 'Absent') return 'bg-danger-bg text-danger';
    return 'bg-slate-100 text-slate-400';
  };

  const currentMonth = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <MobileShell nav={nav} currentTab="attendance">
      {/* Header */}
      <div className="bg-navy px-6 py-6 sm:px-8 text-white">
        <button 
          onClick={() => nav.navigate('dashboard')} 
          className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>
        <h1 className="text-xl sm:text-2xl font-display font-800">My Attendance Logs</h1>
        <p className="text-white/60 text-xs mt-0.5">{currentMonth} · Full Record History</p>
      </div>

      <div className="p-6 sm:p-8 bg-slate-50/50 space-y-6">
        {/* Summary Cards */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
          <div className="text-xs font-display font-bold text-slate-500 uppercase tracking-wider mb-4">Summary Statistics</div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Present', val: presentCount, color: 'text-success', bg: 'bg-success-bg' },
              { label: 'Late', val: lateCount, color: 'text-late', bg: 'bg-late-bg' },
              { label: 'Absent', val: absentCount, color: 'text-danger', bg: 'bg-danger-bg' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <div className={`text-2xl sm:text-3xl font-display font-800 ${s.color}`}>{s.val}</div>
                <div className={`text-xs font-mono font-medium ${s.color} opacity-80 mt-0.5`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attendance progress bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs font-mono text-muted mb-2">
              <span className="font-semibold text-slate-700">Attendance Rate</span>
              <span className="text-success font-bold text-sm">{rate}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${rate}%` }} />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setFilter('month')}
            className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
              filter === 'month' ? 'bg-navy text-white shadow-sm' : 'bg-white text-slate-600 border border-border hover:bg-slate-50'
            }`}
          >
            All Monthly Records
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
              filter === 'week' ? 'bg-navy text-white shadow-sm' : 'bg-white text-slate-600 border border-border hover:bg-slate-50'
            }`}
          >
            Recent 5 Records
          </button>
        </div>

        {/* Records list in clean responsive rows */}
        <div className="space-y-3">
          {displayedRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-border p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
              </div>
              <div className="text-sm font-display font-bold text-slate-800 mb-1">No Attendance Records Yet</div>
              <p className="text-xs text-muted max-w-sm mx-auto mb-4">
                Your verified check-in sessions will appear here once you record your morning attendance on-site.
              </p>
              <button
                onClick={() => nav.navigate('location-verify')}
                className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-display font-bold hover:bg-navy-dark transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>📍</span> Verify GPS Location & Check In
              </button>
            </div>
          ) : (
            displayedRecords.map((r, i) => (
              <div key={r.id || i} className="bg-white rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-navy/20 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${r.locationVerified ? 'bg-success' : 'bg-slate-300'}`} />
                  <div>
                    <div className="text-sm font-display font-bold text-slate-800">{r.date}</div>
                    <div className="text-xs font-mono text-muted mt-0.5">
                      {r.status === 'Absent' ? (
                        <span className="text-red-600 font-display font-medium">
                          Reported Absent{r.absenceReason ? `: ${r.absenceReason}` : ''}
                        </span>
                      ) : (
                        <>
                          {r.dutyType === 'Field Site' && (
                            <span className="text-amber-800 font-display font-bold mr-1.5">
                              🚧 {r.siteName || 'Field Site'} ·
                            </span>
                          )}
                          Check-in: <span className="text-navy font-semibold">{r.checkIn}</span> · Check-out: <span className="text-slate-600">{r.checkOut}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {r.dutyType === 'Field Site' ? (
                    <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      📍 Site Tagged
                    </span>
                  ) : r.locationVerified ? (
                    <span className="text-[10px] font-mono text-success bg-success-bg px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      HQ Geofence
                    </span>
                  ) : null}
                  <span className={`text-[10px] font-display font-bold px-3 py-1 rounded-full uppercase ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  );
}
