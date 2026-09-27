import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings, SystemNotification } from '../../types';
import AdminShell from '../../components/AdminShell';
import { 
  getWorkplaceSettings, 
  saveWorkplaceSettings, 
  DEFAULT_WORKPLACE,
  getNotifications,
  sendBroadcastAnnouncement,
  deleteNotification,
  DESIGNATED_ADMIN_EMAIL,
  saveStoredCredential
} from '../../lib/firebase';

const SECTIONS = [
  { id: 'attendance', label: 'Attendance & Work Shifts', icon: '⏱️' },
  { id: 'organization', label: 'Organization Profile', icon: '🏛️' },
  { id: 'bulletins', label: 'Broadcast Bulletins', icon: '📢' },
  { id: 'security', label: 'Security & Admin Account', icon: '🔐' },
];

export default function Settings({ nav }: { nav: NavProps }) {
  const [activeTab, setActiveTab] = useState('attendance');
  const [settings, setSettings] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // 1. Attendance & Work Shifts
  const [startTime, setStartTime] = useState('08:00');
  const [grace, setGrace] = useState(15);
  const [allowCheckout, setAllowCheckout] = useState(true);
  const [endTime, setEndTime] = useState('17:00');
  const [breakTime, setBreakTime] = useState('12:30');
  const [weekendWork, setWeekendWork] = useState(false);

  // 2. Organization Profile
  const [orgName, setOrgName] = useState('Department of Urban Roads');
  const [orgCode, setOrgCode] = useState('DUR');
  const [orgEmail, setOrgEmail] = useState('info@dur.gov.gh');
  const [orgPhone, setOrgPhone] = useState('+233 30 268 5685');
  const [orgAddress, setOrgAddress] = useState('Treasury Road, Ministries, Accra, Ghana (GA-143-4328)');
  const [timezone, setTimezone] = useState('Africa/Accra (GMT+0)');

  // 3. Bulletins
  const [broadcasts, setBroadcasts] = useState<SystemNotification[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState<'info' | 'warning' | 'success'>('info');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // 4. Security & Admin Account
  const [antiSpoofing, setAntiSpoofing] = useState(true);
  const [deviceLock, setDeviceLock] = useState(true);
  const [adminName, setAdminName] = useState('Administrator');
  const [adminEmail, setAdminEmail] = useState(DESIGNATED_ADMIN_EMAIL);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadBroadcasts();
  }, []);

  const loadSettings = async () => {
    const wp = await getWorkplaceSettings();
    setSettings(wp);
    setStartTime(wp.workStartTime || '08:00');
    setGrace(wp.gracePeriodMinutes ?? 15);
    setAllowCheckout(wp.allowCheckout ?? true);
    setEndTime(wp.workEndTime || '17:00');
    setBreakTime(wp.breakTime || '12:30');
    setWeekendWork(wp.weekendWorkAllowed ?? false);

    setOrgName(wp.orgName || 'Department of Urban Roads');
    setOrgCode(wp.orgCode || 'DUR');
    setOrgEmail(wp.orgEmail || 'info@dur.gov.gh');
    setOrgPhone(wp.orgPhone || '+233 30 268 5685');
    setOrgAddress(wp.orgAddress || 'Treasury Road, Ministries, Accra, Ghana (GA-143-4328)');
    setTimezone(wp.timezone || 'Africa/Accra (GMT+0)');

    setAntiSpoofing(wp.antiSpoofing ?? true);
    setDeviceLock(wp.deviceLock ?? true);
  };

  const loadBroadcasts = async () => {
    const list = await getNotifications();
    setBroadcasts(list.filter(n => n.broadcast));
  };

  const showSavedFeedback = (msg: string = 'Settings saved successfully!') => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const updated: WorkplaceSettings = {
      ...settings,
      workStartTime: startTime,
      gracePeriodMinutes: grace,
      allowCheckout,
      workEndTime: endTime,
      breakTime,
      weekendWorkAllowed: weekendWork,
      orgName,
      orgCode,
      orgEmail,
      orgPhone,
      orgAddress,
      timezone,
      antiSpoofing,
      deviceLock,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setSaving(false);
    showSavedFeedback('✓ Changes saved and applied across all devices.');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setSendingBroadcast(true);
    await sendBroadcastAnnouncement(newTitle.trim(), newBody.trim(), newType);
    setNewTitle('');
    setNewBody('');
    await loadBroadcasts();
    setSendingBroadcast(false);
    showSavedFeedback('✓ Broadcast bulletin published to all staff mobile apps.');
  };

  const handleDeleteBroadcast = async (id: string) => {
    await deleteNotification(id);
    await loadBroadcasts();
    showSavedFeedback('Bulletin deleted.');
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice('Passwords do not match.');
      return;
    }
    try {
      await saveStoredCredential(adminEmail, newPassword, 'admin_designated', adminName);
      setPasswordNotice('✓ Administrator password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordNotice(null), 4000);
    } catch {
      setPasswordNotice('Failed to update password.');
    }
  };

  return (
    <AdminShell nav={nav}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">System Preferences & Settings</h1>
          <p className="text-muted text-sm mt-0.5">Configure operational policies, staff announcements, and admin security</p>
        </div>
        {savedMessage && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-display font-bold animate-fade-in shadow-xs">
            {savedMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-border p-3 shadow-xs h-fit space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === s.id ? 'bg-navy text-white shadow-xs' : 'text-slate-600 hover:bg-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
              {activeTab === s.id && <span>›</span>}
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="xl:col-span-3 space-y-4">
          {/* TAB 1: ATTENDANCE & WORK SHIFTS */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-display font-800 text-slate-900">Attendance Policies & Work Shifts</h2>
                <p className="text-muted text-xs mt-0.5">Define official shift boundaries, grace periods, and departure logging</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Official Work Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <p className="text-muted text-[11px] mt-1">Arrivals up to start time are marked "Present".</p>
                </div>

                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Punctuality Grace Period (Minutes)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={grace}
                      onChange={e => setGrace(Number(e.target.value))}
                      className="flex-1 accent-navy"
                    />
                    <span className="w-16 px-2.5 py-2 rounded-xl border border-border bg-surface text-center text-xs font-mono font-bold text-navy">
                      +{grace}m
                    </span>
                  </div>
                  <p className="text-muted text-[11px] mt-1">Arrivals within +{grace} mins are counted on-time.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Daily Shift End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <p className="text-muted text-[11px] mt-1">Official close of business.</p>
                </div>

                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Lunch / Recess Hour
                  </label>
                  <input
                    type="time"
                    value={breakTime}
                    onChange={e => setBreakTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <p className="text-muted text-[11px] mt-1">Designated 60-minute recess.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Allow End-of-Day Check-Out Recording</div>
                    <div className="text-muted text-[11px]">Staff can record their departure on the mobile dashboard</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowCheckout(!allowCheckout)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${allowCheckout ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${allowCheckout ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Saturday & Weekend Work Authorization</div>
                    <div className="text-muted text-[11px]">Allows engineers and emergency road maintenance teams to log weekend duty</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekendWork(!weekendWork)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${weekendWork ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${weekendWork ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-3 rounded-xl font-display font-bold text-xs bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Attendance & Shift Rules'}
              </button>
            </div>
          )}

          {/* TAB 2: ORGANIZATION PROFILE */}
          {activeTab === 'organization' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-display font-800 text-slate-900">Organization Profile & Contact</h2>
                <p className="text-muted text-xs mt-0.5">Institutional credentials shown across employee badges and official reports</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-display text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Agency Code / Prefix
                  </label>
                  <input
                    type="text"
                    value={orgCode}
                    onChange={e => setOrgCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Official Support Email
                  </label>
                  <input
                    type="email"
                    value={orgEmail}
                    onChange={e => setOrgEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                    Official Helpline Phone
                  </label>
                  <input
                    type="text"
                    value={orgPhone}
                    onChange={e => setOrgPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                  Headquarters Physical Address
                </label>
                <input
                  type="text"
                  value={orgAddress}
                  onChange={e => setOrgAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold text-slate-700 uppercase mb-1">
                  Regional Timezone
                </label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                >
                  <option value="Africa/Accra (GMT+0)">Africa/Accra (GMT+0 - Ghana Standard Time)</option>
                  <option value="UTC (GMT+0)">UTC Universal Standard</option>
                  <option value="Africa/Lagos (GMT+1)">Africa/Lagos (West Africa Time GMT+1)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-3 rounded-xl font-display font-bold text-xs bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save Organization Profile'}
              </button>
            </div>
          )}

          {/* TAB 3: BROADCAST BULLETINS */}
          {activeTab === 'bulletins' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-base font-display font-800 text-slate-900">Broadcast Bulletins to Staff</h2>
                  <p className="text-muted text-xs mt-0.5">Announcements appear directly on all employee mobile apps in real time</p>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-display font-bold text-slate-600 mb-1 uppercase">Notice Priority</label>
                    <div className="flex gap-2">
                      {(['info', 'warning', 'success'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewType(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold capitalize transition-all border cursor-pointer ${
                            newType === t
                              ? t === 'warning' ? 'bg-amber-100 border-amber-300 text-amber-800' : t === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-navy-50 border-navy/30 text-navy'
                              : 'bg-surface border-border text-slate-600'
                          }`}
                        >
                          {t === 'info' ? 'ℹ General Info' : t === 'warning' ? '⚠ Urgent Alert' : '✓ Commendation'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-display font-bold text-slate-600 mb-1 uppercase">Bulletin Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. All-Hands Briefing Scheduled for Friday 10:00 AM"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-bold text-slate-600 mb-1 uppercase">Announcement Message</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter the official details to communicate to all personnel..."
                      value={newBody}
                      onChange={e => setNewBody(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="px-6 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {sendingBroadcast ? 'Broadcasting...' : 'Publish Announcement Now'}
                  </button>
                </form>
              </div>

              {/* Published Notices */}
              <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <h3 className="text-sm font-display font-bold text-slate-800 mb-1">Active Staff Bulletins ({broadcasts.length})</h3>
                <div className="space-y-2 mt-3">
                  {broadcasts.length === 0 ? (
                    <div className="p-6 text-center text-muted text-xs bg-surface rounded-xl border border-dashed border-border font-display">
                      No active bulletins published. Use the form above to post announcements.
                    </div>
                  ) : (
                    broadcasts.map(b => (
                      <div key={b.id} className="p-3.5 rounded-xl border border-slate-100 bg-surface flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase ${
                              b.type === 'warning' ? 'bg-amber-100 text-amber-800' : b.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-50 text-navy'
                            }`}>
                              {b.type}
                            </span>
                            <span className="text-[10px] font-mono text-muted">{b.time}</span>
                          </div>
                          <h4 className="text-xs font-display font-bold text-slate-800">{b.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{b.body}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Bulletin"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & ADMIN ACCOUNT */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-display font-800 text-slate-900">Security & Designated Admin Account</h2>
                <p className="text-muted text-xs mt-0.5">Manage administrator credentials and anti-fraud safeguards</p>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">GPS Anti-Spoofing & Mock Location Shield</div>
                    <div className="text-muted text-[11px]">Detects and prevents simulated or mocked GPS signals</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAntiSpoofing(!antiSpoofing)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${antiSpoofing ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${antiSpoofing ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Single Device Hardware Binding</div>
                    <div className="text-muted text-[11px]">Alerts admin when multiple staff clock in using the same phone</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceLock(!deviceLock)}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${deviceLock ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${deviceLock ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Designated Admin Account info */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="p-3.5 bg-navy-50 border border-navy/10 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-navy/70 font-bold">Authorized Super Administrator</div>
                    <div className="text-sm font-display font-bold text-navy">{adminEmail}</div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Primary Admin
                  </span>
                </div>

                <form onSubmit={handleUpdateAdminPassword} className="space-y-3 pt-2">
                  <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wide">
                    Set / Update Admin Password
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 uppercase mb-1">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs"
                      />
                    </div>
                  </div>

                  {passwordNotice && (
                    <div className={`text-xs p-2.5 rounded-xl font-display ${passwordNotice.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700'}`}>
                      {passwordNotice}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white rounded-xl text-xs font-display font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Update Admin Password
                  </button>
                </form>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl font-display font-bold text-xs bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Security Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
