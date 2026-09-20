import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings, AttendanceRecord, SystemNotification } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  getWorkplaceSettings, 
  recordCheckOut, 
  cancelCheckOut,
  recordAbsence,
  cancelAbsence,
  addNotification, 
  getEmployeeAttendance,
  getNotifications,
  calculateDistanceMeters,
  DEFAULT_WORKPLACE 
} from '../lib/firebase';

export default function Dashboard({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<SystemNotification | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [cancellingCheckOut, setCancellingCheckOut] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Absence reporting state
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('Illness / Medical Appointment');
  const [absenceNote, setAbsenceNote] = useState('');
  const [reportingAbsence, setReportingAbsence] = useState(false);
  const [cancellingAbsence, setCancellingAbsence] = useState(false);

  const uid = user?.uid || profile?.id || profile?.uid || 'emp_1';

  useEffect(() => {
    getWorkplaceSettings().then(setWorkplace);
    if (uid) {
      getEmployeeAttendance(uid).then(setRecords);
      getNotifications(uid).then((all) => {
        const broadcasts = all.filter(n => n.broadcast || n.type === 'warning');
        if (broadcasts.length > 0) {
          setLatestAnnouncement(broadcasts[0]);
        }
      });
    }
  }, [uid, nav.checkInStatus]);

  const isCheckedIn = nav.checkInStatus === 'checked-in';
  const isCheckedOut = nav.checkInStatus === 'checked-out';
  const isAbsent = nav.checkInStatus === 'absent';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date === todayStr || r.date === 'Today');
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const firstName = profile?.name 
    ? profile.name.split(' ')[0] 
    : user?.displayName 
      ? user.displayName.split(' ')[0] 
      : 'Staff Member';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleMarkAbsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceReason) return;
    setReportingAbsence(true);
    try {
      const name = profile?.name || user?.displayName || 'Staff Member';
      const category = profile?.category || 'Permanent Staff';
      const department = profile?.department || 'Operations';
      const photoURL = profile?.photoURL || user?.photoURL;
      
      await recordAbsence(uid, name, category, department, photoURL, absenceReason, absenceNote);
      nav.setCheckInStatus('absent');
      nav.setCheckInTime('—');
      nav.setCheckOutTime('—');
      await addNotification({
        title: 'Absence Notice Recorded',
        body: `You reported absence for today. Reason: ${absenceReason}${absenceNote ? ` (${absenceNote})` : ''}.`,
        type: 'warning',
        time: 'Just now',
        timestamp: Date.now(),
        unread: true,
        targetUserId: uid,
      });
      const updatedRecords = await getEmployeeAttendance(uid);
      setRecords(updatedRecords);
      setShowAbsenceModal(false);
      setAbsenceNote('');
    } catch (err) {
      console.error('Error marking absent:', err);
    } finally {
      setReportingAbsence(false);
    }
  };

  const handleCancelAbsence = async () => {
    setCancellingAbsence(true);
    try {
      await cancelAbsence(uid);
      nav.setCheckInStatus('not-checked-in');
      nav.setCheckInTime('');
      nav.setCheckOutTime('');
      await addNotification({
        title: 'Absence Notice Retracted',
        body: 'Your absence notice for today has been cancelled. You can now verify GPS location and clock in.',
        type: 'info',
        time: 'Just now',
        timestamp: Date.now(),
        unread: true,
        targetUserId: uid,
      });
      const updatedRecords = await getEmployeeAttendance(uid);
      setRecords(updatedRecords);
    } catch (err) {
      console.error('Error cancelling absence:', err);
    } finally {
      setCancellingAbsence(false);
    }
  };

  // Real attendance stats computed dynamically
  const presentCount = records.filter(r => r.status === 'Present').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;

  const formatCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    const timeStr = formatCurrentTime();

    // Check GPS positioning if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const dist = calculateDistanceMeters(lat, lng, workplace.latitude, workplace.longitude);
          const isVerified = dist <= workplace.geofenceRadius;

          await finishCheckOut(timeStr, isVerified, dist);
        },
        async () => {
          await finishCheckOut(timeStr, false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      await finishCheckOut(timeStr, false);
    }
  };

  const finishCheckOut = async (timeStr: string, isVerified = true, dist?: number) => {
    nav.setCheckOutTime(timeStr);
    nav.setCheckInStatus('checked-out');
    await recordCheckOut(uid, timeStr);
    await addNotification({
      title: 'Shift Check-Out Recorded',
      body: isVerified 
        ? `You logged your check-out at ${timeStr}. GPS verified on-site (~${dist ?? 20}m).`
        : `You logged your check-out at ${timeStr}. Today's work session is complete.`,
      type: 'info',
      time: `${timeStr} today`,
      timestamp: Date.now(),
      unread: true,
      targetUserId: uid,
    });
    setCheckingOut(false);
  };

  const handleCancelCheckOut = async () => {
    setCancellingCheckOut(true);
    await cancelCheckOut(uid);
    nav.setCheckInStatus('checked-in');
    nav.setCheckOutTime('');
    await addNotification({
      title: 'Check-Out Cancelled · Shift Resumed',
      body: 'Your previous check-out has been cancelled. You are currently clocked in and can record your departure when you leave.',
      type: 'info',
      time: 'Just now',
      timestamp: Date.now(),
      unread: true,
      targetUserId: uid,
    });
    setCancellingCheckOut(false);
    setShowCancelModal(false);
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
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="text-white/60 text-xs sm:text-sm font-sans mt-1">
              {profile?.position || 'Staff Member'} · {profile?.department || 'Operations'} · <span className="text-white/80 font-mono">{profile?.staffId || 'ID Pending'}</span>
            </p>
          </div>

          {/* Real Dynamic Attendance Stats */}
          <div className="flex gap-2 sm:gap-3">
            {[
              { label: 'Present', value: presentCount, color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' },
              { label: 'Late', value: lateCount, color: 'bg-amber-500/20 text-amber-200 border-amber-500/30' },
              { label: 'Absent', value: absentCount, color: 'bg-red-500/20 text-red-200 border-red-500/30' },
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
      <div className="p-6 sm:p-8 bg-slate-50/50 space-y-6">
        {/* Latest Announcement Pill if available */}
        {latestAnnouncement && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center flex-shrink-0 text-sm">
              📢
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-navy bg-white px-2 py-0.5 rounded-md border border-blue-100">
                  Bulletin
                </span>
                <span className="text-[10px] font-mono text-slate-400">{latestAnnouncement.time}</span>
              </div>
              <h4 className="text-xs font-display font-bold text-slate-900 mt-0.5">{latestAnnouncement.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{latestAnnouncement.body}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Attendance Card (Left 2 cols on desktop) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="text-xs font-mono text-muted uppercase tracking-wider mb-0.5">Today's Attendance Status</div>
                <div className="text-lg font-display font-800 text-slate-800">
                  {!isCheckedIn && !isCheckedOut && !isAbsent && 'Awaiting Daily Check-In'}
                  {isCheckedIn && 'Currently Clocked In'}
                  {isCheckedOut && 'Workday Completed · Checked Out'}
                  {isAbsent && 'Absence Reported for Today'}
                </div>
              </div>

              {!isCheckedIn && !isCheckedOut && !isAbsent && (
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
              {isAbsent && (
                <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-display font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  ABSENT
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
                <div className="text-[10px] font-mono text-muted uppercase mb-1">Work Shift</div>
                <div className="text-base font-mono font-bold text-slate-700">{workplace.workStartTime || '08:00'} AM</div>
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
                  {isAbsent
                    ? 'Absence recorded. If attending work, you can retract notice and check in.'
                    : isCheckedIn 
                      ? 'GPS positioning verified on-site ✓' 
                      : `Check-in open anytime (Early, regular, or late shifts supported within ${workplace.geofenceRadius}m)`}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isCheckedIn && !isCheckedOut && !isAbsent && (
              <div className="space-y-3">
                <button
                  onClick={() => nav.navigate('location-verify')}
                  className="w-full bg-navy text-white py-4 rounded-2xl font-display font-bold text-base transition-all hover:bg-navy-dark active:scale-[0.99] shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Verify GPS Location & Check In
                </button>

                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(true)}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-slate-600 hover:text-red-700 text-xs font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>🗓️</span>
                  <span>Won't make it to work today? <span className="underline decoration-red-400">Mark as Absent</span></span>
                </button>
              </div>
            )}

            {isCheckedIn && (
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="w-full bg-danger text-white py-4 rounded-2xl font-display font-bold text-base transition-all hover:bg-red-700 active:scale-[0.99] shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {checkingOut ? 'Verifying Location & Checking Out…' : 'Record Daily Check Out'}
              </button>
            )}

            {/* Absent State Card with Cancel Option */}
            {isAbsent && (
              <div className="space-y-4">
                <div className="w-full bg-red-50 border border-red-200 text-red-900 p-4 sm:p-5 rounded-2xl font-display text-xs sm:text-sm text-left flex items-start gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl flex-shrink-0">
                    🗓️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-red-950 text-sm sm:text-base">Absence Notice Active Today</div>
                    <div className="text-red-800 text-xs mt-1 leading-relaxed">
                      <strong>Reason:</strong> {todayRecord?.absenceReason || 'Self-Reported Absence'}
                      {todayRecord?.absenceNote ? ` · "${todayRecord.absenceNote}"` : ''}
                    </div>
                    <p className="text-[11px] text-red-600/80 font-mono mt-1">
                      Logged in administrative records. Management has been notified.
                    </p>
                  </div>
                </div>

                {/* Change plans / Cancel absence notice */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Change of plans or attending work after all?</div>
                    <p className="text-[11px] text-muted">
                      You can retract your absence notice and proceed to verify GPS location to check in.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelAbsence}
                    disabled={cancellingAbsence}
                    className="px-4 py-2.5 rounded-xl bg-white border border-navy/30 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors shadow-2xs whitespace-nowrap self-start sm:self-auto cursor-pointer disabled:opacity-60"
                  >
                    {cancellingAbsence ? 'Cancelling…' : '↩ Cancel Notice & Check In'}
                  </button>
                </div>
              </div>
            )}

            {/* Checked Out State with Cancel Check-out Capability */}
            {isCheckedOut && (
              <div className="space-y-4">
                <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl font-display font-bold text-sm text-center flex items-center justify-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Checked out at {nav.checkOutTime} · Workday Completed
                </div>

                {/* Smart Cancel Checkout Option */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Checked out early or resuming shift?</div>
                    <p className="text-[11px] text-muted">
                      You can cancel your previous check-out, return to active duty, and check out again when leaving.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 rounded-xl bg-white border border-navy/30 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors shadow-2xs whitespace-nowrap self-start sm:self-auto"
                  >
                    ↩ Resume Shift & Re-Check Out
                  </button>
                </div>
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

      {/* Cancel Checkout Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
              ↩
            </div>
            <div>
              <h3 className="text-base font-display font-800 text-slate-900">Cancel Previous Check-Out?</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                This will cancel your recorded departure time ({nav.checkOutTime}) and return your status to <strong>Clocked In</strong>. You will be able to log your official check-out again later.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-surface"
              >
                Keep Checked Out
              </button>
              <button
                type="button"
                onClick={handleCancelCheckOut}
                disabled={cancellingCheckOut}
                className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all shadow-md disabled:opacity-60"
              >
                {cancellingCheckOut ? 'Resuming…' : 'Yes, Resume Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Absent Modal */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-lg">
                  🗓️
                </div>
                <div>
                  <h3 className="text-base font-display font-800 text-slate-900">Mark as Absent Today</h3>
                  <p className="text-xs text-muted">Notify administration that you will not make it to work</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAbsenceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMarkAbsent} className="space-y-4">
              <div>
                <label className="block text-xs font-display font-bold text-slate-700 mb-2">
                  Select Reason for Absence <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'Illness / Medical Appointment', label: 'Illness / Medical Appointment', icon: '🩺' },
                    { key: 'Personal / Family Emergency', label: 'Personal / Family Emergency', icon: '🚨' },
                    { key: 'Excused Casual Leave', label: 'Excused Casual Leave / Approved Off', icon: '🏖️' },
                    { key: 'Official Field Assignment', label: 'Official Field Assignment / External Duty', icon: '💼' },
                    { key: 'Bereavement / Compassionate', label: 'Bereavement / Compassionate Leave', icon: '🕊️' },
                    { key: 'Other Reason', label: 'Other Reason', icon: '📝' },
                  ].map(r => (
                    <label
                      key={r.key}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-display font-semibold cursor-pointer transition-all ${
                        absenceReason === r.key 
                          ? 'border-red-500 bg-red-50/60 text-red-900 shadow-2xs' 
                          : 'border-border bg-surface text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="absenceReason"
                        value={r.key}
                        checked={absenceReason === r.key}
                        onChange={() => setAbsenceReason(r.key)}
                        className="accent-red-600 w-4 h-4"
                      />
                      <span>{r.icon}</span>
                      <span className="flex-1">{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-slate-700 mb-1">
                  Additional Note / Explanation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={absenceNote}
                  onChange={e => setAbsenceNote(e.target.value)}
                  placeholder="e.g. Approved by supervisor, attending clinic in morning..."
                  rows={2}
                  className="w-full bg-surface border border-border rounded-xl p-3 text-xs font-display text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <span className="text-sm">ℹ️</span>
                <div>
                  This entry will be recorded in the live administrative attendance log. If your plans change later today, you can cancel this notice and clock in.
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAbsenceModal(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportingAbsence}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-display font-bold text-xs hover:bg-red-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {reportingAbsence ? 'Submitting…' : 'Submit Absence Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
