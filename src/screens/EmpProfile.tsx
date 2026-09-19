import React, { useRef, useState } from 'react';
import { NavProps, StaffCategory } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';

export default function EmpProfile({ nav }: { nav: NavProps }) {
  const { profile, user, logout, updateProfileData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    await logout();
    nav.setCheckInStatus('not-checked-in');
    nav.navigate('landing');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        await updateProfileData({ photoURL: dataUrl });
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const name = profile?.name || user?.displayName || 'Staff Member';
  const email = profile?.email || user?.email || 'staff@metroworks.gov.gh';
  const staffId = profile?.staffId || (profile?.id ? `MWI-${profile.id.slice(-4).toUpperCase()}` : 'MWI-00101');
  const category = profile?.category || 'Permanent Staff';
  const department = profile?.department || 'Operations';
  const position = profile?.position || 'Staff Specialist';
  const supervisor = profile?.supervisor || 'Department Head';
  const phone = profile?.phone || 'Not provided';
  const avatarText = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const openEditModal = () => {
    setEditName(name);
    setEditPhone(profile?.phone || '');
    setEditDepartment(profile?.department || 'Operations');
    setEditPosition(profile?.position || 'Staff Specialist');
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateProfileData({
      name: editName,
      phone: editPhone,
      department: editDepartment,
      position: editPosition,
    });
    setSaving(false);
    setShowEditModal(false);
  };

  return (
    <MobileShell nav={nav} currentTab="profile">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header Banner */}
      <div className="bg-navy px-6 py-7 sm:px-8 text-white">
        <button 
          onClick={() => nav.navigate('dashboard')} 
          className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-4 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Interactive Avatar with Photo Upload */}
            <div 
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Click to change your profile picture"
            >
              {profile?.photoURL || user?.photoURL ? (
                <img 
                  src={profile?.photoURL || user?.photoURL || ''} 
                  alt={name} 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/40 object-cover shadow-md transition-opacity group-hover:opacity-85" 
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20 transition-opacity group-hover:opacity-85">
                  <span className="text-2xl sm:text-3xl font-display font-800 text-white">{avatarText}</span>
                </div>
              )}
              {/* Camera Overlay Icon */}
              <div className="absolute inset-0 bg-navy/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-display font-bold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Edit</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-display font-800">{name}</h1>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-display font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg text-white/90 transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  {uploading ? 'Updating…' : 'Photo'}
                </button>
                <button
                  onClick={openEditModal}
                  className="text-[11px] font-display font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg text-white/90 transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
              </div>
              <div className="text-white/70 text-xs sm:text-sm font-mono mt-1">
                Staff ID: <span className="text-white font-bold">{staffId}</span> · {category}
              </div>
            </div>
          </div>

          <div className="self-start sm:self-auto">
            <span className="bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-xs font-display font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active Status
            </span>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="p-6 sm:p-8 bg-slate-50/50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Work Assignment Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="text-xs font-display font-bold text-slate-500 uppercase tracking-wider">
                Workplace Assignment
              </div>
              <button 
                onClick={openEditModal}
                className="text-navy text-xs font-display font-semibold hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Staff Category', value: category },
                { label: 'Department', value: department },
                { label: 'Position / Role', value: position },
                { label: 'Direct Supervisor', value: supervisor },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-muted font-display font-semibold">{item.label}</span>
                  <span className="text-xs text-slate-800 font-display font-bold text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="text-xs font-display font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
              Verified Contact
            </div>
            <div className="space-y-4">
              {[
                { label: 'Email', value: email },
                { label: 'Phone Number', value: phone },
                { label: 'Account Auth', value: 'Google OAuth 2.0' },
                { label: 'Cloud Database', value: 'Firebase Firestore' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-muted font-display font-semibold">{item.label}</span>
                  <span className="text-xs text-slate-800 font-display font-bold text-right truncate max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-display font-bold text-slate-900">Session & Authentication</div>
            <div className="text-xs text-slate-400 mt-0.5">Securely sign out of MetroAttend on this device</div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-display font-bold text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign Out of Account
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-display font-800 text-slate-900">Edit My Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-display font-bold text-slate-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display font-bold text-slate-600 uppercase mb-1">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={e => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display font-bold text-slate-600 uppercase mb-1">Position / Role</label>
                <input
                  type="text"
                  value={editPosition}
                  onChange={e => setEditPosition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-slate-600 font-display font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
