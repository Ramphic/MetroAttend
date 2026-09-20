import React, { useState, useEffect } from 'react';
import { NavProps, AttendanceRecord, Employee, StaffCategory } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getStatusColor, getCategoryColor } from '../../data';
import { 
  subscribeTodayAttendance, 
  getAllEmployees, 
  getAllAttendanceRecords, 
  sendBroadcastAnnouncement, 
  exportRecordsToCSV 
} from '../../lib/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface CategoryMetric {
  key: StaffCategory;
  label: string;
  count: number;
  total: number;
  color: string;
}

export default function AdminDashboard({ nav }: { nav: NavProps }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success'>('info');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    // 1. Subscribe to real-time attendance
    const unsubscribe = subscribeTodayAttendance((updated) => {
      setRecords(updated);
    });

    // 2. Fetch all staff members
    getAllEmployees().then(list => {
      setEmployees(list);
    });

    // 3. Fetch all attendance history for weekly velocity
    getAllAttendanceRecords().then(all => {
      setHistoryRecords(all);
    });

    return () => unsubscribe();
  }, []);

  const totalStaffCount = employees.length;
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const presentCount = records.filter(r => r.status === 'Present').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const attendanceRate = totalStaffCount > 0 ? (((presentCount + lateCount) / totalStaffCount) * 100).toFixed(1) : '0';

  // Dynamic Category Metrics
  const categoriesList: { key: StaffCategory; label: string; color: string }[] = [
    { key: 'Permanent Staff', label: 'Permanent Staff', color: 'bg-navy' },
    { key: 'National Service Personnel', label: 'National Service', color: 'bg-purple-500' },
    { key: 'Intern', label: 'Interns', color: 'bg-amber-500' },
    { key: 'Contract Staff', label: 'Contract Staff', color: 'bg-slate-500' },
  ];

  const categoryMetrics: CategoryMetric[] = categoriesList.map(c => {
    const total = employees.filter(e => e.category === c.key).length;
    const checked = records.filter(r => r.category === c.key).length;
    return {
      key: c.key,
      label: c.label,
      count: checked,
      total: total,
      color: c.color,
    };
  });

  // Dynamic Weekly Velocity Calculation
  const weeklyTrendData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const currentDayIdx = new Date().getDay();

    return days.map((day, idx) => {
      const dayNum = idx + 1;
      const dayRecords = [...historyRecords, ...records].filter(r => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return d.getDay() === dayNum;
      });

      const p = dayRecords.filter(r => r.status === 'Present').length;
      const l = dayRecords.filter(r => r.status === 'Late').length;
      const a = dayRecords.filter(r => r.status === 'Absent').length;

      if (dayNum === currentDayIdx) {
        return {
          day,
          present: Math.max(p, presentCount),
          late: Math.max(l, lateCount),
          absent: Math.max(a, absentCount),
        };
      }

      return { day, present: p, late: l, absent: a };
    });
  }, [historyRecords, records, presentCount, lateCount, absentCount]);

  const statCards = [
    { label: 'Total Registered Staff', value: totalStaffCount, icon: '👥', color: 'bg-navy-50 text-navy', trend: 'Active roster' },
    { label: 'Present Today', value: presentCount, icon: '✓', color: 'bg-success-bg text-success', trend: `${attendanceRate}% of workforce` },
    { label: 'Late Arrivals', value: lateCount, icon: '⏱', color: 'bg-late-bg text-late', trend: 'Checked in past cutoff' },
    { label: 'Recorded Absent', value: absentCount, icon: '✗', color: 'bg-danger-bg text-danger', trend: 'Unexcused / Leave' },
  ];

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    setBroadcasting(true);
    await sendBroadcastAnnouncement(announcementTitle.trim(), announcementBody.trim(), announcementType);
    setBroadcasting(false);
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastOpen(false);
      setAnnouncementTitle('');
      setAnnouncementBody('');
    }, 1500);
  };

  const sharedDeviceCount = records.filter(r => r.isSharedDevice).length;

  return (
    <AdminShell nav={nav}>
      {/* Page title & Actions */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Live Executive Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">Real-time workforce attendance & operations · {dateStr}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-xs font-display font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <span>📢</span>
            Broadcast Announcement
          </button>
          <div className="hidden lg:flex items-center gap-2 bg-success-bg text-success text-xs font-mono px-3 py-2 rounded-xl border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-ping" />
            Live Cloud Sync
          </div>
        </div>
      </div>

      {/* Anti-Proxy Shared Device Warning Banner */}
      {sharedDeviceCount > 0 && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-xl flex-shrink-0">
            🚨
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-amber-900">
              Anti-Proxy Alert: {sharedDeviceCount} Shared Device Check-In{sharedDeviceCount > 1 ? 's' : ''} Detected Today
            </h3>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Multiple employees used the exact same physical phone/browser to clock in. Look for the highlighted <span className="font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Shared Device</span> badges in the live stream below.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center text-lg font-display font-800`}>
                {card.icon}
              </div>
            </div>
            <div className="text-3xl font-display font-800 text-slate-900 mb-1">{card.value}</div>
            <div className="text-slate-500 text-xs font-display font-600">{card.label}</div>
            <div className="text-[11px] font-mono text-muted mt-1">{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Charts & Category Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        {/* Weekly trend */}
        <div className="xl:col-span-3 bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-display font-700 text-slate-800">Weekly Attendance Velocity</h2>
              <p className="text-muted text-xs font-mono mt-0.5">Aggregate status trend</p>
            </div>
            <div className="flex gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-navy inline-block"/>Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-late inline-block"/>Late</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block"/>Absent</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyTrendData} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#94A3B8' }} axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontFamily: 'Inter', fontSize: 12 }}
                cursor={{ fill: '#F8FAFC' }}
              />
              <Bar dataKey="present" fill="#1B3A6B" radius={[4,4,0,0]} name="Present"/>
              <Bar dataKey="late" fill="#B45309" radius={[4,4,0,0]} name="Late"/>
              <Bar dataKey="absent" fill="#DC2626" radius={[4,4,0,0]} name="Absent"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Real Dynamic Category breakdown */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-border shadow-sm">
          <h2 className="text-sm font-display font-700 text-slate-800 mb-1">Staff by Category</h2>
          <p className="text-muted text-xs font-mono mb-5">Current check-in ratio</p>
          <div className="space-y-3">
            {categoryMetrics.map(cat => {
              const pct = cat.total > 0 ? Math.min(100, Math.round((cat.count / cat.total) * 100)) : 0;
              return (
                <div key={cat.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-display font-600 text-slate-600">{cat.label}</span>
                    <span className="text-xs font-mono text-muted">{cat.count}/{cat.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-muted mb-0.5">Overall Attendance Rate</div>
              <div className="text-2xl font-display font-800 text-navy">{attendanceRate}%</div>
            </div>
            <button
              onClick={() => { nav.setAdminTab('attendance'); nav.navigate('admin-attendance'); }}
              className="text-xs font-display font-700 text-navy hover:underline"
            >
              Full Roster →
            </button>
          </div>
        </div>
      </div>

      {/* Today's attendance live stream table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-display font-700 text-slate-800">Today's Check-in Stream</h2>
            <p className="text-muted text-xs font-mono mt-0.5">Real-time attendance log ({records.length} records)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportRecordsToCSV(records)}
              className="text-xs font-display font-semibold text-slate-600 bg-surface border border-border hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button
              onClick={() => { nav.setAdminTab('attendance'); nav.navigate('admin-attendance'); }}
              className="text-xs font-display font-600 text-navy hover:underline"
            >
              Manage Records →
            </button>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-3 text-xl">
              ⏱
            </div>
            <div className="text-sm font-display font-bold text-slate-700">No Check-ins Recorded Today</div>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Real-time attendance logs will appear here as employees check in within the workplace geofence perimeter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Staff Member', 'Category', 'Department', 'Check-in', 'Check-out', 'Location Verification', 'Device & Security', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] font-display font-700 text-slate-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((row, i) => (
                  <tr
                    key={row.id || i}
                    className="border-b border-slate-50 last:border-0 hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => { 
                      if (row.employeeId) nav.setSelectedEmployeeId(row.employeeId); 
                      nav.setAdminTab('staff'); 
                      nav.navigate('admin-staff-profile'); 
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {row.photoURL ? (
                          <img src={row.photoURL} alt={row.name || 'SM'} className="w-7 h-7 rounded-full object-cover border border-navy/20 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-navy-50 border border-navy/10 flex items-center justify-center text-navy text-[10px] font-display font-800 flex-shrink-0">
                            {(row.name || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-display font-600 text-slate-800">{row.name || 'Staff Member'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-display font-600 px-2 py-0.5 rounded-full ${getCategoryColor(row.category || 'Permanent Staff')}`}>
                        {row.category || 'Permanent Staff'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-display font-500 text-slate-600">{row.department || 'Operations'}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-700">{row.checkIn}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{row.checkOut}</td>
                    <td className="px-5 py-3.5">
                      {row.locationVerified ? (
                        <span className="text-success text-[10px] font-display font-600 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          GPS Verified {row.distanceMeters ? `(~${row.distanceMeters}m)` : ''}
                        </span>
                      ) : (
                        <span className="text-danger text-[10px] font-display font-600">Failed</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-display font-medium text-slate-700 flex items-center gap-1.5">
                          {row.deviceLabel || '📱 Mobile Device'}
                        </span>
                        {row.isSharedDevice ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md w-fit">
                            🚨 Shared with {row.sharedWithEmployeeName || 'Another Worker'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit">
                            🔒 Personal Device
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-display font-700 px-2.5 py-1 rounded-full uppercase ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <h3 className="text-base font-display font-800 text-slate-900">Broadcast Official Announcement</h3>
                  <p className="text-xs text-muted">Instantly notifies all employees on their devices</p>
                </div>
              </div>
              <button
                onClick={() => setBroadcastOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {broadcastSent ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-success-bg text-success flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  ✓
                </div>
                <div className="text-base font-display font-800 text-slate-800">Announcement Broadcasted!</div>
                <div className="text-xs text-muted mt-1">This bulletin has been delivered to all staff devices.</div>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display font-700 uppercase tracking-wide text-slate-600 mb-1">
                    Announcement Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Change, Site Safety Briefing, Public Holiday"
                    value={announcementTitle}
                    onChange={e => setAnnouncementTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-display font-600 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display font-700 uppercase tracking-wide text-slate-600 mb-1">
                    Priority / Bulletin Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'info', label: 'Standard Info', color: 'bg-navy-50 text-navy border-navy/30' },
                      { key: 'warning', label: 'Important Notice', color: 'bg-late-bg text-late border-late/30' },
                      { key: 'success', label: 'Commendation', color: 'bg-success-bg text-success border-success/30' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setAnnouncementType(t.key as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-display font-bold transition-all ${
                          announcementType === t.key ? `${t.color} shadow-xs ring-2 ring-navy/20` : 'bg-surface text-slate-500 border-border'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display font-700 uppercase tracking-wide text-slate-600 mb-1">
                    Message Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter the full announcement text that staff will read in their notification feed..."
                    value={announcementBody}
                    onChange={e => setAnnouncementBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-sans focus:outline-none focus:ring-2 focus:ring-navy/20 leading-relaxed"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-border bg-surface text-xs font-display font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="flex-1 py-3 rounded-xl bg-navy hover:bg-navy-dark text-white text-xs font-display font-bold shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {broadcasting ? 'Broadcasting…' : 'Send to All Staff'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
