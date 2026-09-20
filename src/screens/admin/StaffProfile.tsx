import React, { useState, useEffect } from 'react';
import { NavProps, Employee, AttendanceRecord, StaffCategory } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getCategoryColor, getStatusColor } from '../../data';
import { 
  getAllEmployees, 
  getEmployeeAttendance, 
  saveUserProfile, 
  toggleEmployeeStatus, 
  deleteEmployee, 
  exportRecordsToCSV, 
  addNotification 
} from '../../lib/firebase';

export default function StaffProfile({ nav }: { nav: NavProps }) {
  const [emp, setEmp] = useState<Employee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStaffId, setEditStaffId] = useState('');
  const [editCategory, setEditCategory] = useState<StaffCategory>('Permanent Staff');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editSupervisor, setEditSupervisor] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [savingEdit, setSavingEdit] = useState(false);

  // Send Direct Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertBody, setAlertBody] = useState('');
  const [alertType, setAlertType] = useState<'info' | 'warning' | 'success'>('info');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getAllEmployees();
      let found: Employee | undefined;
      if (nav.selectedEmployeeId) {
        found = list.find(e => e.id === nav.selectedEmployeeId || e.uid === nav.selectedEmployeeId);
      }
      if (!found && list.length > 0) {
        found = list[0];
      }
      if (found) {
        setEmp(found);
        const targetId = found.id || found.uid || '';
        const userRecords = await getEmployeeAttendance(targetId);
        setRecords(userRecords);
      } else {
        setEmp(null);
        setRecords([]);
      }
    } catch (err) {
      console.warn('Error loading staff profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [nav.selectedEmployeeId]);

  const openEditModal = () => {
    if (!emp) return;
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditPhone(emp.phone);
    setEditStaffId(emp.staffId);
    setEditCategory(emp.category);
    setEditDepartment(emp.department);
    setEditPosition(emp.position);
    setEditSupervisor(emp.supervisor);
    setEditStatus(emp.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp) return;
    setSavingEdit(true);
    const targetId = emp.id || emp.uid || '';
    const updated: Partial<Employee> = {
      name: editName,
      email: editEmail,
      phone: editPhone,
      staffId: editStaffId,
      category: editCategory,
      department: editDepartment,
      position: editPosition,
      supervisor: editSupervisor,
      status: editStatus,
    };
    await saveUserProfile(targetId, updated);
    setEmp(prev => prev ? ({ ...prev, ...updated }) : null);
    setSavingEdit(false);
    setShowEditModal(false);
  };

  const handleToggleStatus = async () => {
    if (!emp) return;
    const targetId = emp.id || emp.uid || '';
    const nextStatus = await toggleEmployeeStatus(targetId, emp.status);
    setEmp(prev => prev ? ({ ...prev, status: nextStatus }) : null);
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emp || !alertTitle.trim() || !alertBody.trim()) return;
    setSendingAlert(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
    const targetId = emp.id || emp.uid || '';
    await addNotification({
      title: alertTitle,
      body: alertBody,
      type: alertType,
      time: timeStr,
      timestamp: Date.now(),
      unread: true,
      targetUserId: targetId,
    });
    setSendingAlert(false);
    setAlertSuccess(true);
    setTimeout(() => {
      setAlertSuccess(false);
      setShowAlertModal(false);
      setAlertTitle('');
      setAlertBody('');
    }, 1500);
  };

  const handleDeleteStaff = async () => {
    if (!emp) return;
    setDeleting(true);
    const targetId = emp.id || emp.uid || '';
    await deleteEmployee(targetId);
    setDeleting(false);
    setShowDeleteModal(false);
    nav.navigate('admin-staff');
  };

  if (loading) {
    return (
      <AdminShell nav={nav}>
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-3 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-mono text-muted">Loading employee profile…</div>
        </div>
      </AdminShell>
    );
  }

  if (!emp) {
    return (
      <AdminShell nav={nav}>
        <div className="bg-white rounded-3xl border border-border p-12 text-center max-w-md mx-auto shadow-sm my-12">
          <div className="w-16 h-16 rounded-2xl bg-navy-50 text-navy flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
            👥
          </div>
          <h2 className="text-lg font-display font-800 text-slate-900 mb-1">No Staff Member Found</h2>
          <p className="text-slate-500 text-xs mb-6 leading-relaxed">
            There are currently no staff profiles to display, or the selected staff member was not found. Select a member from the directory or register a new account.
          </p>
          <button
            onClick={() => nav.navigate('admin-staff')}
            className="px-5 py-2.5 rounded-xl bg-navy text-white text-xs font-display font-bold hover:bg-navy-dark transition-all shadow-sm"
          >
            ← View Staff Directory
          </button>
        </div>
      </AdminShell>
    );
  }

  const presentCount = records.filter(r => r.status === 'Present').length;
  const lateCount = records.filter(r => r.status === 'Late').length;
  const absentCount = records.filter(r => r.status === 'Absent').length;
  const punctualityRate = records.length ? Math.round((presentCount / records.length) * 100) : 100;

  return (
    <AdminShell nav={nav}>
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={() => nav.navigate('admin-staff')}
          className="flex items-center gap-1.5 text-sm font-display font-semibold text-muted hover:text-navy transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Staff Directory
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-navy/20 bg-navy-50 text-navy font-display font-bold text-xs hover:bg-navy/10 transition-colors shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Send Direct Notice
          </button>
          <button
            onClick={() => exportRecordsToCSV(records, `${emp.name.replace(/\s+/g, '_')}_attendance.csv`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white text-slate-700 font-display font-bold text-xs hover:border-navy/30 transition-colors shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Log (CSV)
          </button>
          <button
            onClick={openEditModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-colors shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Profile
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-600 font-display font-bold text-xs hover:bg-red-100 transition-colors"
            title="Delete Staff Record"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Profile Card & Info */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            {/* Avatar & Title */}
            <div className="flex flex-col items-center text-center mb-5 pb-5 border-b border-slate-100">
              {emp.photoURL ? (
                <img 
                  src={emp.photoURL} 
                  alt={emp.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-navy/20 mb-3 shadow-sm" 
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-navy-50 border-2 border-navy/10 flex items-center justify-center mb-3">
                  <span className="text-3xl font-display font-800 text-navy">{emp.avatar || emp.name.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <h2 className="text-xl font-display font-800 text-slate-900">{emp.name}</h2>
              <div className="text-muted text-xs font-mono mt-0.5">{emp.staffId}</div>
              
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[10px] font-display font-bold px-3 py-1 rounded-full ${getCategoryColor(emp.category)}`}>
                  {emp.category}
                </span>
                <button
                  onClick={handleToggleStatus}
                  className={`text-[10px] font-display font-bold px-3 py-1 rounded-full cursor-pointer transition-all ${
                    emp.status === 'Active' 
                      ? 'bg-success-bg text-success hover:bg-success/20' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title="Click to toggle Active/Inactive"
                >
                  {emp.status} ⇄
                </button>
              </div>
            </div>

            {/* Performance Mini Stats */}
            <div className="grid grid-cols-3 gap-2 mb-5 pb-5 border-b border-slate-100 text-center">
              <div className="bg-surface rounded-xl p-2.5">
                <div className="text-lg font-display font-800 text-slate-800">{records.length}</div>
                <div className="text-[9px] font-mono text-muted uppercase">Logs</div>
              </div>
              <div className="bg-surface rounded-xl p-2.5">
                <div className="text-lg font-display font-800 text-success">{presentCount}</div>
                <div className="text-[9px] font-mono text-muted uppercase">On Time</div>
              </div>
              <div className="bg-surface rounded-xl p-2.5">
                <div className="text-lg font-display font-800 text-navy">{punctualityRate}%</div>
                <div className="text-[9px] font-mono text-muted uppercase">Rate</div>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-3">
              {[
                { label: 'Department', value: emp.department },
                { label: 'Position', value: emp.position },
                { label: 'Supervisor', value: emp.supervisor },
                { label: 'Email', value: emp.email },
                { label: 'Phone', value: emp.phone },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <div className="text-[10px] font-mono text-muted uppercase tracking-wide">{item.label}</div>
                  <div className="text-xs font-display font-bold text-slate-800 truncate max-w-[60%]">{item.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real Attendance Log History */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-800">Verified Attendance History</h3>
                <p className="text-muted text-xs font-mono mt-0.5">
                  {records.length} total recorded sessions • GPS geofence verified
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 bg-surface px-2.5 py-1 rounded-lg border border-border">
                  Late: <strong className="text-amber-600">{lateCount}</strong>
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-surface px-2.5 py-1 rounded-lg border border-border">
                  Absent: <strong className="text-red-600">{absentCount}</strong>
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted font-display font-500 text-sm">
                Loading attendance records...
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-muted font-display font-500 text-sm bg-surface rounded-xl border border-dashed border-border">
                No attendance sessions recorded yet for {emp.name}.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {records.map((record, i) => (
                  <div key={record.id || i} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-surface transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        record.status === 'Present' ? 'bg-success' : record.status === 'Late' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-xs font-display font-bold text-slate-800">{record.date}</div>
                        <div className="text-[10px] font-mono text-muted flex items-center gap-2">
                          <span>{record.dayLabel}</span>
                          {record.locationVerified && (
                            <span className="text-emerald-600 font-semibold text-[9px] flex items-center gap-0.5">
                              ✓ GPS ({record.distanceMeters ?? 40}m)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-slate-600">In: <strong className="text-slate-800">{record.checkIn || '—'}</strong></span>
                      <span className="text-slate-600">Out: <strong className="text-slate-800">{record.checkOut || '—'}</strong></span>
                      <span className={`text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full uppercase ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT STAFF MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-display font-800 text-slate-900">Edit Staff Profile</h2>
                <p className="text-muted text-xs font-mono mt-0.5">Update records in live database</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-muted hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    value={editStaffId}
                    onChange={e => setEditStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as StaffCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white"
                  >
                    <option value="Permanent Staff">Permanent Staff</option>
                    <option value="National Service Personnel">National Service Personnel</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract Staff">Contract Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Position</label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={e => setEditPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Direct Supervisor</label>
                <input
                  type="text"
                  value={editSupervisor}
                  onChange={e => setEditSupervisor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-display font-bold text-xs text-slate-600 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT ALERT NOTIFICATION MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-display font-800 text-slate-900">Direct Notice to Employee</h2>
                <p className="text-muted text-xs font-mono mt-0.5">Delivered to {emp.name}'s notification bell</p>
              </div>
              <button onClick={() => setShowAlertModal(false)} className="text-muted hover:text-slate-700">✕</button>
            </div>

            {alertSuccess ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                  ✓
                </div>
                <p className="font-display font-bold text-slate-800 text-sm">Notice Sent Successfully!</p>
                <p className="text-muted text-xs mt-1">Employee will receive this upon next login.</p>
              </div>
            ) : (
              <form onSubmit={handleSendAlert} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Notice Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['info', 'warning', 'success'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAlertType(t)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-display font-bold capitalize transition-all border ${
                          alertType === t
                            ? t === 'warning' ? 'bg-amber-100 border-amber-300 text-amber-800' : t === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-navy-50 border-navy/30 text-navy'
                            : 'bg-surface border-border text-slate-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Change or Verification Note"
                    value={alertTitle}
                    onChange={e => setAlertTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Message Body</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Write message to staff member..."
                    value={alertBody}
                    onChange={e => setAlertBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAlertModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-border font-display font-bold text-xs text-slate-600 hover:bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingAlert}
                    className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50"
                  >
                    {sendingAlert ? 'Sending...' : 'Send Notice'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h3 className="text-base font-display font-800 text-slate-900 mb-1">Delete Employee Record?</h3>
            <p className="text-muted text-xs mb-5">
              Are you sure you want to delete <strong>{emp.name}</strong> ({emp.staffId})? This action removes their profile from the active directory.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border font-display font-bold text-xs text-slate-600 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-display font-bold text-xs hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
