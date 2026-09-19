import React, { useState, useEffect } from 'react';
import { NavProps, StaffCategory, Employee } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getCategoryColor } from '../../data';
import { getAllEmployees, saveUserProfile, toggleEmployeeStatus, deleteEmployee } from '../../lib/firebase';

type Filter = 'All' | StaffCategory;
const filters: Filter[] = ['All', 'Permanent Staff', 'National Service Personnel', 'Intern', 'Contract Staff'];

export default function StaffManagement({ nav }: { nav: NavProps }) {
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Delete modal
  const [staffToDelete, setStaffToDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [category, setCategory] = useState<StaffCategory>('Permanent Staff');
  const [department, setDepartment] = useState('Engineering');
  const [position, setPosition] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const list = await getAllEmployees();
    setEmployeesList(list);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const newUid = `emp_${Date.now()}`;
    const newStaff: Employee = {
      id: newUid,
      uid: newUid,
      name,
      email,
      staffId: staffId || `MWI-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      department,
      position: position || 'Specialist',
      supervisor: supervisor || 'Manager',
      phone: phone || '+233 24 000 0000',
      status: 'Active',
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      role: 'employee',
      profileComplete: true,
    };

    await saveUserProfile(newUid, newStaff);
    await loadEmployees();
    setSaving(false);
    setShowAddModal(false);
    // Reset form
    setName('');
    setEmail('');
    setStaffId('');
    setPosition('');
    setSupervisor('');
    setPhone('');
  };

  const handleToggleStatus = async (emp: Employee) => {
    const targetId = emp.id || emp.uid || '';
    if (!targetId) return;
    const nextStatus = await toggleEmployeeStatus(targetId, emp.status);
    setEmployeesList(prev => prev.map(e => (e.id === targetId || e.uid === targetId) ? { ...e, status: nextStatus } : e));
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setDeleting(true);
    const targetId = staffToDelete.id || staffToDelete.uid || '';
    await deleteEmployee(targetId);
    await loadEmployees();
    setDeleting(false);
    setStaffToDelete(null);
  };

  const handleExportStaffCSV = () => {
    const headers = ['Name', 'Staff ID', 'Category', 'Department', 'Position', 'Supervisor', 'Email', 'Phone', 'Status'];
    const rows = employeesList.map(e => [
      `"${e.name}"`,
      `"${e.staffId}"`,
      `"${e.category}"`,
      `"${e.department}"`,
      `"${e.position}"`,
      `"${e.supervisor}"`,
      `"${e.email}"`,
      `"${e.phone}"`,
      `"${e.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `metroworks_staff_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = employeesList.filter(e => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.staffId.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeFilter === 'All' || e.category === activeFilter;
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminShell nav={nav}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Staff Management</h1>
          <p className="text-muted text-sm mt-0.5">
            {employeesList.length} registered employees • {employeesList.filter(e => e.status === 'Active').length} Active
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportStaffCSV}
            className="border border-border bg-white text-slate-700 px-3.5 py-2.5 rounded-xl font-display font-bold text-xs hover:border-navy/30 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Staff (CSV)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-navy text-white px-4 py-2.5 rounded-xl font-display font-bold text-xs hover:bg-navy-dark transition-all flex items-center gap-2 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-4 flex flex-wrap gap-3 shadow-xs">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by name, staff ID, email, or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
          {(['All', 'Active', 'Inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-display font-bold transition-all ${
                statusFilter === s ? 'bg-white text-navy shadow-xs border border-border' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all whitespace-nowrap ${
                activeFilter === f ? 'bg-navy text-white shadow-xs' : 'bg-surface text-slate-600 border border-border hover:border-navy/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-surface">
              {['Employee', 'Staff ID', 'Category', 'Department', 'Position', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-[10px] font-display font-bold text-slate-400 uppercase tracking-wide px-5 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr
                key={emp.id || emp.uid}
                className="border-b border-slate-50 last:border-0 hover:bg-surface transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {emp.photoURL ? (
                      <img src={emp.photoURL} alt={emp.name} className="w-9 h-9 rounded-xl object-cover border border-navy/10 shadow-2xs" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-navy-50 border border-navy/10 flex items-center justify-center text-navy text-xs font-display font-800 flex-shrink-0">
                        {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-display font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] font-mono text-muted">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-slate-600 font-semibold">{emp.staffId}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-display font-bold px-2.5 py-0.5 rounded-full ${getCategoryColor(emp.category)}`}>
                    {emp.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs font-display font-semibold text-slate-700">{emp.department}</td>
                <td className="px-5 py-3.5 text-xs font-display font-500 text-slate-600">{emp.position || 'Specialist'}</td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => handleToggleStatus(emp)}
                    className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      emp.status === 'Active' 
                        ? 'bg-success-bg text-success hover:bg-success/20' 
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title="Click to toggle status"
                  >
                    {emp.status}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { nav.setSelectedEmployeeId(emp.id || emp.uid || ''); nav.navigate('admin-staff-profile'); }}
                      className="text-navy text-xs font-display font-bold px-3 py-1 rounded-lg hover:bg-navy-50 border border-navy/20 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setStaffToDelete(emp)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Employee"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-muted text-sm font-display font-500">No employees found</div>
            <div className="text-slate-400 text-xs font-mono mt-1">Try adjusting your search query or filter pills</div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-display font-800 text-slate-900">Add Staff Member</h2>
                <p className="text-muted text-xs font-mono mt-0.5">Register new personnel in organization directory</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ama Serwaa"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="a.serwaa@metroworks.gov.gh"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    placeholder="MWI-00501"
                    value={staffId}
                    onChange={e => setStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as StaffCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white"
                  >
                    <option value="Permanent Staff">Permanent Staff</option>
                    <option value="National Service Personnel">National Service Personnel</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract Staff">Contract Staff</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Civil Infrastructure"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Position</label>
                  <input
                    type="text"
                    placeholder="e.g. Civil Engineer"
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Supervisor</label>
                  <input
                    type="text"
                    placeholder="e.g. Ing. Kwame Asante"
                    value={supervisor}
                    onChange={e => setSupervisor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-display font-600 text-slate-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+233 24 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-display font-bold text-xs text-slate-600 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50"
                >
                  {saving ? 'Creating Profile...' : 'Create Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-border text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h3 className="text-base font-display font-800 text-slate-900 mb-1">Remove Staff Member?</h3>
            <p className="text-muted text-xs mb-5">
              Remove <strong>{staffToDelete.name}</strong> ({staffToDelete.staffId}) from the directory?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStaffToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-border font-display font-bold text-xs text-slate-600 hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-display font-bold text-xs hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
