import React, { useState, useEffect } from 'react';
import { NavProps, AttendanceStatus, AttendanceRecord } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getCategoryColor, getStatusColor } from '../../data';
import { 
  getAllAttendanceRecords, 
  updateAttendanceStatus, 
  deleteAttendanceRecord, 
  resetAllTodayAttendance,
  exportRecordsToCSV 
} from '../../lib/firebase';
import { getNearestLandmark } from '../../lib/geo';

export default function AttendanceManagement({ nav }: { nav: NavProps }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'All'>('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [onlyFlaggedDevices, setOnlyFlaggedDevices] = useState(false);
  const [onlyFieldSites, setOnlyFieldSites] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editingRow, setEditingRow] = useState<AttendanceRecord | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const list = await getAllAttendanceRecords();
    setRecords(list);
  };

  const statuses: (AttendanceStatus | 'All')[] = ['All', 'Present', 'Late', 'Absent'];
  const depts = ['All', 'Engineering', 'Administration', 'Finance', 'IT', 'HR', 'Legal', 'Operations'];

  const filtered = records.filter(row => {
    const matchStatus = statusFilter === 'All' || row.status === statusFilter;
    const matchDept = deptFilter === 'All' || (row.department || 'Operations') === deptFilter;
    const matchDate = !selectedDate || row.date === selectedDate || row.date === 'Today';
    const matchFlagged = !onlyFlaggedDevices || Boolean(row.isSharedDevice);
    const matchFieldSite = !onlyFieldSites || row.dutyType === 'Field Site';
    return matchStatus && matchDept && matchDate && matchFlagged && matchFieldSite;
  });

  const presentCount = filtered.filter(r => r.status === 'Present').length;
  const lateCount = filtered.filter(r => r.status === 'Late').length;
  const absentCount = filtered.filter(r => r.status === 'Absent').length;
  const locationVerifiedCount = filtered.filter(r => r.locationVerified).length;
  const sharedDeviceCount = records.filter(r => r.isSharedDevice).length;
  const fieldSiteCount = records.filter(r => r.dutyType === 'Field Site').length;

  const handleUpdateStatus = async (recordId: string, newStatus: AttendanceStatus) => {
    setSavingStatus(true);
    await updateAttendanceStatus(recordId, newStatus);
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
    setSavingStatus(false);
    setEditingRow(null);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to remove this attendance log?')) return;
    await deleteAttendanceRecord(recordId);
    setRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const handleResetToday = async () => {
    if (!window.confirm('Reset all attendance logs for today? This provides a fresh roster for presentation/demo.')) return;
    await resetAllTodayAttendance();
    await loadRecords();
    nav.setCheckInStatus('not-checked-in');
    nav.setCheckInTime('');
    nav.setCheckOutTime('');
  };

  return (
    <AdminShell nav={nav}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Attendance Roster Management</h1>
          <p className="text-muted text-sm mt-0.5">Real-time attendance logs, status overrides, and verification</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToday}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2.5 rounded-xl font-display font-semibold text-xs transition-all shadow-xs cursor-pointer"
            title="Wipe today's attendance logs for demo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <span>↻ Reset Today (Demo)</span>
          </button>
          <button 
            onClick={() => exportRecordsToCSV(filtered, `attendance_${selectedDate}.csv`)}
            className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl font-display font-semibold text-xs hover:bg-navy-dark transition-all shadow-xs cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV Report
          </button>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-bold text-slate-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-[11px] font-display font-semibold text-navy hover:underline"
              >
                Today
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${
                  statusFilter === s
                    ? s === 'All' ? 'bg-navy text-white shadow-xs' :
                      s === 'Present' ? 'bg-success text-white shadow-xs' :
                      s === 'Late' ? 'bg-late text-white shadow-xs' :
                      'bg-danger text-white shadow-xs'
                    : 'bg-surface text-slate-500 border border-border hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}

            {/* Anti-Proxy / Shared Device filter toggle */}
            {/* Anti-Proxy / Shared Device filter toggle */}
            <button
              onClick={() => setOnlyFlaggedDevices(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all flex items-center gap-1.5 ${
                onlyFlaggedDevices
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-surface text-amber-800 border border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span>🚨</span>
              <span>Shared Devices</span>
              {sharedDeviceCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${onlyFlaggedDevices ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900 font-bold'}`}>
                  {sharedDeviceCount}
                </span>
              )}
            </button>

            {/* Field / Road Site Duty Filter */}
            <button
              onClick={() => setOnlyFieldSites(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyFieldSites
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold'
                  : 'bg-surface text-amber-900 border border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span>🚧</span>
              <span>Road Sites</span>
              {fieldSiteCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${onlyFieldSites ? 'bg-amber-950 text-white' : 'bg-amber-200 text-amber-900 font-bold'}`}>
                  {fieldSiteCount}
                </span>
              )}
            </button>
          </div>

          {/* Dept filter */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-display font-bold text-slate-500">Dept:</span>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-display font-600 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Real Dynamic Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Present Today', val: presentCount, color: 'text-success', bg: 'bg-success-bg' },
          { label: 'Late Arrivals', val: lateCount, color: 'text-late', bg: 'bg-late-bg' },
          { label: 'Recorded Absent', val: absentCount, color: 'text-danger', bg: 'bg-danger-bg' },
          { label: 'Road Site Duty', val: fieldSiteCount, color: 'text-amber-800', bg: 'bg-amber-50' },
          { label: 'GPS Verified', val: locationVerifiedCount, color: 'text-navy', bg: 'bg-navy-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-100 shadow-xs`}>
            <div className={`text-2xl font-display font-800 ${s.color}`}>{s.val}</div>
            <div className={`text-xs font-display font-600 ${s.color} mt-0.5 opacity-80`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-surface">
                {['Staff Member', 'Category', 'Check-in', 'Check-out', 'Location Verification', 'Device & Security', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] font-display font-700 text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id || i} className="border-b border-slate-50 last:border-0 hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {row.photoURL ? (
                        <img src={row.photoURL} alt={row.name || 'SM'} className="w-8 h-8 rounded-full object-cover border border-navy/20 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-navy-50 border border-navy/10 flex items-center justify-center text-navy text-[10px] font-display font-800 flex-shrink-0">
                          {(row.name || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <button
                          onClick={() => { 
                            if (row.employeeId) nav.setSelectedEmployeeId(row.employeeId); 
                            nav.setAdminTab('staff'); 
                            nav.navigate('admin-staff-profile'); 
                          }}
                          className="text-sm font-display font-bold text-slate-800 hover:text-navy transition-colors text-left"
                        >
                          {row.name || 'Staff Member'}
                        </button>
                        <div className="text-[10px] font-mono text-muted">{row.department || 'Operations'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-display font-600 px-2 py-0.5 rounded-full ${getCategoryColor(row.category || 'Permanent Staff')}`}>
                      {row.category || 'Permanent Staff'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-700">{row.checkIn}</td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{row.checkOut}</td>
                  <td className="px-5 py-3.5">
                    {row.dutyType === 'Field Site' ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-amber-800 text-[10px] font-display font-bold flex items-center gap-1 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md w-fit">
                          <span>🚧</span> Field Site Duty
                        </span>
                        <span className="text-xs font-display font-bold text-slate-800 truncate max-w-[180px]" title={row.siteName || 'Road Project Corridor'}>
                          {row.siteName || 'Road Project Corridor'}
                        </span>
                        <span className="text-[11px] font-display font-semibold text-slate-600 flex items-center gap-1 truncate max-w-[180px]" title={row.locationAddress || (row.latitude && row.longitude ? getNearestLandmark(row.latitude, row.longitude) : 'Field Site')}>
                          <span>📍</span>
                          <span className="truncate">
                            {row.locationAddress || (row.latitude && row.longitude ? getNearestLandmark(row.latitude, row.longitude) : 'Field Project Corridor')}
                          </span>
                        </span>
                      </div>
                    ) : row.locationVerified ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-success text-[10px] font-display font-semibold flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          🏢 DUR Head Office
                        </span>
                        <span className="text-[11px] font-display font-medium text-slate-600">
                          {row.locationAddress || 'Ministries, Central Accra'} {row.distanceMeters ? `(~${row.distanceMeters}m)` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-danger text-[10px] font-display font-semibold flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        Failed
                      </span>
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
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-display font-700 px-2.5 py-1 rounded-full uppercase w-fit ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                      {row.status === 'Absent' && row.absenceReason && (
                        <span className="text-[10px] font-mono text-red-600 truncate max-w-[160px]" title={`${row.absenceReason}${row.absenceNote ? ` - ${row.absenceNote}` : ''}`}>
                          • {row.absenceReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setEditingRow(row)}
                        className="text-navy text-[11px] font-display font-bold px-2.5 py-1 rounded-lg hover:bg-navy-50 transition-colors border border-navy/20"
                      >
                        Adjust Status
                      </button>
                      {row.id && (
                        <button
                          onClick={() => handleDeleteRecord(row.id!)}
                          title="Delete attendance record"
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-muted text-sm font-display font-semibold">No attendance records found</div>
            <div className="text-slate-400 text-xs font-mono mt-1">Try choosing another date or adjusting status filters</div>
          </div>
        )}
      </div>

      {/* Adjust Status Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-display font-800 text-slate-900 mb-1">
              Adjust Attendance Status
            </h3>
            <p className="text-xs text-muted mb-4">
              Updating record for <strong className="text-slate-800">{editingRow.name}</strong> on {editingRow.date}
            </p>

            <div className="space-y-2 mb-5">
              {(['Present', 'Late', 'Absent'] as AttendanceStatus[]).map(st => (
                <button
                  key={st}
                  onClick={() => handleUpdateStatus(editingRow.id || '', st)}
                  disabled={savingStatus}
                  className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs flex items-center justify-between border transition-all ${
                    editingRow.status === st ? 'border-navy bg-navy-50 text-navy ring-2 ring-navy/20' : 'border-border hover:bg-surface text-slate-700'
                  }`}
                >
                  <span>Mark as {st}</span>
                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full ${getStatusColor(st)}`}>
                    {st}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setEditingRow(null)}
              className="w-full py-2.5 bg-surface border border-border text-slate-600 rounded-xl text-xs font-display font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
