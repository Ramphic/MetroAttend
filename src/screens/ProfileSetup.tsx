import React, { useState, useRef } from 'react';
import { NavProps, StaffCategory } from '../types';
import { useAuth } from '../context/AuthContext';

const departments = [
  'Engineering',
  'Administration',
  'Finance',
  'Information Technology',
  'Human Resources',
  'Legal Affairs',
  'Operations',
];

export default function ProfileSetup({ nav }: { nav: NavProps }) {
  const { profile, user, updateProfileData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staffId, setStaffId] = useState(profile?.staffId || '');
  const [department, setDepartment] = useState(profile?.department || 'Engineering');
  const [position, setPosition] = useState(profile?.position || '');
  const [supervisor, setSupervisor] = useState(profile?.supervisor || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [category, setCategory] = useState<StaffCategory>(profile?.category || 'Permanent Staff');
  const [photoURL, setPhotoURL] = useState<string | undefined>(profile?.photoURL || user?.photoURL || undefined);
  const [submitting, setSubmitting] = useState(false);

  // Compute completion progress
  const fields = [staffId, department, position, supervisor, phone];
  const filledCount = fields.filter(f => f.trim().length > 0).length;
  const pct = Math.round((filledCount / fields.length) * 100);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoURL(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProfileData({
        staffId: staffId || `MWI-${Math.floor(1000 + Math.random() * 9000)}`,
        department,
        position: position || 'Staff Member',
        supervisor: supervisor || 'Department Head',
        phone: phone || '+233 24 000 0000',
        category,
        photoURL,
        profileComplete: true,
      });
      nav.navigate('dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = profile?.name || user?.displayName || 'Staff Member';
  const displayEmail = profile?.email || user?.email || '';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-6 py-6 sm:px-8 text-white">
          <button 
            onClick={() => nav.navigate('landing')} 
            className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Cancel
          </button>
          <h1 className="text-xl sm:text-2xl font-display font-800">Staff Profile Setup</h1>
          <p className="text-white/60 text-xs mt-0.5">Upload your employee photo and complete your workplace records</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Avatar Upload Box */}
          <div className="bg-surface rounded-2xl p-5 border border-border flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt={displayName} 
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-navy shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-navy-50 border-2 border-dashed border-navy/30 text-navy flex items-center justify-center font-display font-bold text-xl shadow-xs">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-navy/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <div className="flex-1">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                className="hidden" 
              />
              <div className="text-sm font-display font-bold text-slate-900">{displayName}</div>
              <div className="text-xs text-muted font-mono">{displayEmail}</div>
              <div className="mt-2.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-navy text-white text-xs font-display font-bold rounded-xl hover:bg-navy-dark transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {photoURL ? 'Change Photo' : 'Upload Profile Photo'}
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={() => setPhotoURL(undefined)}
                    className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-display font-semibold rounded-xl hover:bg-slate-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Completion Bar */}
          <div className="bg-surface rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-display font-semibold text-slate-600">Profile Completion</span>
              <span className="text-xs font-mono font-bold text-navy">{pct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-navy rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Staff Category */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Staff Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as StaffCategory)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm font-display font-bold focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              >
                <option value="Permanent Staff">Permanent Staff</option>
                <option value="National Service Personnel">National Service Personnel</option>
                <option value="Intern">Intern</option>
                <option value="Contract Staff">Contract Staff</option>
              </select>
            </div>

            {/* Staff ID */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Staff / ID Number
              </label>
              <input
                type="text"
                placeholder="e.g. MWI-00482"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Department
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Position / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Civil Engineer"
                value={position}
                onChange={e => setPosition(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
            </div>

            {/* Supervisor */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Immediate Supervisor
              </label>
              <input
                type="text"
                placeholder="e.g. Daniel Owusu"
                value={supervisor}
                onChange={e => setSupervisor(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-display font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+233 24 123 4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy text-white py-4 rounded-xl font-display font-bold text-base mt-6 transition-all hover:bg-navy-dark active:scale-[0.99] shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? 'Saving Profile & Photo…' : 'Complete Setup & Go to Dashboard →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
