import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings, SystemNotification } from '../../types';
import AdminShell from '../../components/AdminShell';
import { 
  getWorkplaceSettings, 
  saveWorkplaceSettings, 
  DEFAULT_WORKPLACE,
  getNotifications,
  sendBroadcastAnnouncement,
  deleteNotification
} from '../../lib/firebase';

const sections = [
  'Attendance Rules',
  'Work Hours',
  'Notifications & Bulletins',
  'Organization Settings',
  'Security & Compliance',
  'User Roles',
  'Account Settings',
];

export default function Settings({ nav }: { nav: NavProps }) {
  const [active, setActive] = useState('Attendance Rules');
  const [settings, setSettings] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Attendance Rules
  const [startTime, setStartTime] = useState('08:00');
  const [grace, setGrace] = useState(15);
  const [allowCheckout, setAllowCheckout] = useState(true);

  // Work Hours
  const [endTime, setEndTime] = useState('17:00');
  const [breakTime, setBreakTime] = useState('12:30');
  const [weekendWork, setWeekendWork] = useState(false);

  // Organization Settings
  const [orgName, setOrgName] = useState('MetroWorks Infrastructure Agency');
  const [orgCode, setOrgCode] = useState('MWI');
  const [orgEmail, setOrgEmail] = useState('info@metroworks.gov.gh');
  const [orgPhone, setOrgPhone] = useState('+233 30 200 0000');
  const [orgAddress, setOrgAddress] = useState('P.O. Box GP 1234, High Street, Accra, Ghana');
  const [timezone, setTimezone] = useState('Africa/Accra (GMT+0)');

  // Security
  const [antiSpoofing, setAntiSpoofing] = useState(true);
  const [deviceLock, setDeviceLock] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(60);

  // Notifications / Bulletins
  const [broadcasts, setBroadcasts] = useState<SystemNotification[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newType, setNewType] = useState<'info' | 'warning' | 'success'>('info');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Account Settings
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@metroworks.gov.gh');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

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
    setOrgName(wp.orgName || 'MetroWorks Infrastructure Agency');
    setOrgCode(wp.orgCode || 'MWI');
    setOrgEmail(wp.orgEmail || 'info@metroworks.gov.gh');
    setOrgPhone(wp.orgPhone || '+233 30 200 0000');
    setOrgAddress(wp.orgAddress || 'P.O. Box GP 1234, High Street, Accra, Ghana');
    setTimezone(wp.timezone || 'Africa/Accra (GMT+0)');
    setAntiSpoofing(wp.antiSpoofing ?? true);
    setDeviceLock(wp.deviceLock ?? true);
    setSessionTimeout(wp.sessionTimeout ?? 60);
  };

  const loadBroadcasts = async () => {
    const list = await getNotifications();
    setBroadcasts(list.filter(n => n.broadcast));
  };

  const triggerSavedFeedback = (msg: string = 'Settings saved successfully!') => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 2500);
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
      sessionTimeout,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setSaving(false);
    triggerSavedFeedback('Changes saved and applied across organization.');
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    setSendingBroadcast(true);
    await sendBroadcastAnnouncement(newTitle, newBody, newType);
    setNewTitle('');
    setNewBody('');
    await loadBroadcasts();
    setSendingBroadcast(false);
    triggerSavedFeedback('Broadcast bulletin published to all staff devices!');
  };

  const handleDeleteBroadcast = async (id: string) => {
    await deleteNotification(id);
    await loadBroadcasts();
    triggerSavedFeedback('Bulletin removed.');
  };

  return (
    <AdminShell nav={nav}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">System Preferences & Settings</h1>
          <p className="text-muted text-sm mt-0.5">Manage workplace operations, rules, broadcasts, and security</p>
        </div>
        {savedMessage && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-mono font-bold animate-fade-in flex items-center gap-1.5 shadow-xs">
            <span>✓</span> {savedMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-border p-3 shadow-xs h-fit">
          <nav className="space-y-1">
            {sections.map(s => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-display font-bold transition-all flex items-center justify-between ${
                  active === s ? 'bg-navy text-white shadow-xs' : 'text-slate-600 hover:bg-surface'
                }`}
              >
                <span>{s}</span>
                {active === s && <span>›</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Dynamic Section Content */}
        <div className="xl:col-span-3 space-y-4">
          {/* 1. ATTENDANCE RULES */}
          {active === 'Attendance Rules' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-display font-800 text-slate-900">Attendance Policies & Rules</h2>
                  <p className="text-muted text-xs mt-0.5">Configure check-in thresholds and grace periods for staff</p>
                </div>
                <span className="bg-navy-50 text-navy text-[10px] font-display font-bold px-2.5 py-1 rounded-full border border-navy/10">
                  REAL-TIME SYNC
                </span>
              </div>

              <div className="space-y-5 pt-2">
                <div>
                  <label className="block text-xs font-display font-700 text-slate-700 mb-1.5 uppercase tracking-wide">
                    Official Work Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                  <p className="text-muted text-xs mt-1.5">Check-ins before or at this time are marked "Present".</p>
                </div>

                <div>
                  <label className="block text-xs font-display font-700 text-slate-700 mb-1.5 uppercase tracking-wide">
                    Grace Period Allowance (Minutes)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={grace}
                      onChange={e => setGrace(Number(e.target.value))}
                      className="w-56 accent-navy"
                    />
                    <div className="w-20 px-3 py-2 rounded-xl border border-border bg-surface text-center text-sm font-mono text-navy font-700">
                      {grace} min
                    </div>
                  </div>
                  <p className="text-muted text-xs mt-1.5">
                    Staff checking in within <strong>{grace} minutes</strong> of start time will be counted on time.
                  </p>
                </div>

                {/* Rule Visual Calculation */}
                <div className="bg-navy-50 border border-navy/10 rounded-2xl p-4">
                  <div className="text-xs font-display font-bold text-navy mb-3">Enforcement Calculation Matrix</div>
                  <div className="space-y-2">
                    {[
                      { label: 'Work start schedule', val: startTime },
                      { label: 'Grace window', val: `+${grace} minutes` },
                      { label: 'Arrival marked LATE after', val: `${startTime.split(':')[0]}:${String(Number(startTime.split(':')[1]) + grace).padStart(2, '0')} AM` },
                      { label: 'End-of-day check-out allowed', val: allowCheckout ? 'Enabled' : 'Disabled' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-xs py-1 border-b border-navy/5 last:border-0">
                        <span className="text-navy/70 font-display font-semibold">{r.label}</span>
                        <span className="text-navy font-mono font-bold">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <div className="text-sm font-display font-bold text-slate-800">Allow Check-Out Recording</div>
                    <div className="text-muted text-xs mt-0.5">Staff can log their daily departure on their dashboard</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowCheckout(!allowCheckout)}
                    className={`w-12 h-6 rounded-full transition-all relative ${allowCheckout ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${allowCheckout ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Attendance Rules'}
                </button>
              </div>
            </div>
          )}

          {/* 2. WORK HOURS */}
          {active === 'Work Hours' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <h2 className="text-base font-display font-800 text-slate-900 mb-1">Standard Operating Hours</h2>
              <p className="text-muted text-xs mb-5">Define regular shift boundaries, meal periods, and weekend policies.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Daily Shift Start</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Daily Shift End</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Lunch & Recess Break</label>
                    <input
                      type="time"
                      value={breakTime}
                      onChange={e => setBreakTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                    <p className="text-muted text-[11px] mt-1">Standard 60-minute recess window</p>
                  </div>
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Working Days</label>
                    <div className="flex items-center gap-1.5 pt-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                        <span key={d} className="px-2.5 py-1 rounded-lg bg-navy text-white text-[10px] font-display font-bold">{d}</span>
                      ))}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold ${weekendWork ? 'bg-navy text-white' : 'bg-slate-100 text-slate-400'}`}>Sat</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <div className="text-sm font-display font-bold text-slate-800">Saturday Work Authorization</div>
                    <div className="text-muted text-xs mt-0.5">Enable staff to verify attendance during weekend shifts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekendWork(!weekendWork)}
                    className={`w-12 h-6 rounded-full transition-all relative ${weekendWork ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${weekendWork ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Work Hours'}
                </button>
              </div>
            </div>
          )}

          {/* 3. NOTIFICATIONS & BULLETINS */}
          {active === 'Notifications & Bulletins' && (
            <div className="space-y-5">
              {/* Broadcast Publisher */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-display font-800 text-slate-900">Broadcast Bulletins to Staff</h2>
                    <p className="text-muted text-xs mt-0.5">Announcements appear on all employee mobile apps in real-time</p>
                  </div>
                  <span className="bg-navy text-white text-[10px] font-display font-bold px-2.5 py-1 rounded-full">
                    LIVE BROADCAST
                  </span>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Bulletin Category</label>
                    <div className="flex gap-2">
                      {(['info', 'warning', 'success'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewType(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold capitalize transition-all border ${
                            newType === t
                              ? t === 'warning' ? 'bg-amber-100 border-amber-300 text-amber-800' : t === 'success' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-navy-50 border-navy/30 text-navy'
                              : 'bg-surface border-border text-slate-600'
                          }`}
                        >
                          {t === 'info' ? 'ℹ General Info' : t === 'warning' ? '⚠ Urgent Notice' : '✓ Success/Praise'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Headline / Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. All-Hands Briefing Scheduled for 10:00 AM"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Announcement Body</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter the official details to communicate to all personnel..."
                      value={newBody}
                      onChange={e => setNewBody(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="px-6 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                  >
                    {sendingBroadcast ? 'Broadcasting...' : 'Publish Announcement Now'}
                  </button>
                </form>
              </div>

              {/* Active Broadcasts History */}
              <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
                <h3 className="text-sm font-display font-bold text-slate-800 mb-1">Active Organization Bulletins</h3>
                <p className="text-muted text-xs mb-4">Currently published notices</p>

                {broadcasts.length === 0 ? (
                  <div className="p-8 text-center text-muted font-display font-500 text-xs bg-surface rounded-xl border border-dashed border-border">
                    No active broadcast bulletins. Use the form above to announce updates to staff.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {broadcasts.map(b => (
                      <div key={b.id} className="p-4 rounded-xl border border-slate-100 bg-surface flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-md uppercase ${
                              b.type === 'warning' ? 'bg-amber-100 text-amber-800' : b.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-50 text-navy'
                            }`}>
                              {b.type}
                            </span>
                            <span className="text-[10px] font-mono text-muted">{b.time}</span>
                          </div>
                          <h4 className="text-xs font-display font-bold text-slate-800">{b.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{b.body}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(b.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Bulletin"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. ORGANIZATION SETTINGS */}
          {active === 'Organization Settings' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <h2 className="text-base font-display font-800 text-slate-900 mb-1">Organization Profile & Contact</h2>
              <p className="text-muted text-xs mb-5">Institutional credentials shown on employee badges and attendance logs</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Agency Code / ID Prefix</label>
                    <input
                      type="text"
                      value={orgCode}
                      onChange={e => setOrgCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Support Email</label>
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={e => setOrgEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Official Helpline Phone</label>
                    <input
                      type="text"
                      value={orgPhone}
                      onChange={e => setOrgPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Headquarters Address</label>
                  <input
                    type="text"
                    value={orgAddress}
                    onChange={e => setOrgAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Regional Timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
                  >
                    <option value="Africa/Accra (GMT+0)">Africa/Accra (GMT+0 - Ghana Standard)</option>
                    <option value="UTC (GMT+0)">UTC Universal Standard</option>
                    <option value="Africa/Lagos (GMT+1)">Africa/Lagos (West Africa Time GMT+1)</option>
                    <option value="Europe/London (GMT+0/+1)">Europe/London</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Organization Profile'}
                </button>
              </div>
            </div>
          )}

          {/* 5. SECURITY & COMPLIANCE */}
          {active === 'Security & Compliance' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <h2 className="text-base font-display font-800 text-slate-900 mb-1">Security & Geofence Integrity</h2>
              <p className="text-muted text-xs mb-5">Prevent proxy attendance, GPS spoofing, and unauthorized access</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">GPS Anti-Spoofing & Mock Location Shield</div>
                    <div className="text-muted text-[11px] mt-0.5">Detects and blocks simulated or mocked GPS provider signals on Android/iOS</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAntiSpoofing(!antiSpoofing)}
                    className={`w-12 h-6 rounded-full transition-all relative ${antiSpoofing ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${antiSpoofing ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-surface">
                  <div>
                    <div className="text-xs font-display font-bold text-slate-800">Hardware Device Binding</div>
                    <div className="text-muted text-[11px] mt-0.5">Enforces single-device check-in per Staff ID to eliminate proxy logins</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceLock(!deviceLock)}
                    className={`w-12 h-6 rounded-full transition-all relative ${deviceLock ? 'bg-navy' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${deviceLock ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-display font-bold text-slate-800">Administrator Inactivity Timeout</div>
                      <div className="text-muted text-[11px]">Auto-logout idle dashboard sessions</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-navy">{sessionTimeout} minutes</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={180}
                    step={15}
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(Number(e.target.value))}
                    className="w-full accent-navy"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-muted mt-1">
                    <span>15 min</span><span>180 min</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl font-display font-bold text-sm bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Update Security Policies'}
                </button>
              </div>
            </div>
          )}

          {/* 6. USER ROLES */}
          {active === 'User Roles' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <h2 className="text-base font-display font-800 text-slate-900 mb-1">Role Hierarchy & Access Controls</h2>
              <p className="text-muted text-xs mb-5">Current permission matrix assigned across the platform</p>
              
              <div className="space-y-3">
                {[
                  { 
                    role: 'Super Administrator', 
                    desc: 'Complete control over geofence settings, payroll export, employee records, and system broadcasts.',
                    perms: ['Manage Geofences', 'Override Attendance Status', 'Export CSV Reports', 'Broadcast Notices', 'Add/Delete Staff', 'Configure Rules'], 
                    color: 'bg-navy text-white' 
                  },
                  { 
                    role: 'HR & Personnel Officer', 
                    desc: 'Daily attendance tracking, staff profile maintenance, and punctuality audit reporting.',
                    perms: ['View All Staff', 'Review Attendance Records', 'Download Daily Logs', 'Send Direct Employee Alerts'], 
                    color: 'bg-purple-100 text-purple-800' 
                  },
                  { 
                    role: 'Department Supervisor', 
                    desc: 'Oversees staff in their specific engineering, operations, or administrative unit.',
                    perms: ['View Unit Staff', 'Real-time On-site Check-in Verification'], 
                    color: 'bg-amber-100 text-amber-800' 
                  },
                  { 
                    role: 'Employee / Field Officer', 
                    desc: 'Individual mobile dashboard access to record verified GPS check-in/out and review personal log history.',
                    perms: ['GPS Verification Check-in', 'End-of-day Check-out', 'View Own Attendance History', 'Receive System Bulletins', 'Upload Profile Photo'], 
                    color: 'bg-slate-100 text-slate-700' 
                  },
                ].map(r => (
                  <div key={r.role} className="border border-slate-100 rounded-xl p-4 hover:bg-surface transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-display font-bold px-3 py-1 rounded-full ${r.color}`}>{r.role}</span>
                    </div>
                    <p className="text-slate-600 text-xs mb-3 font-display">{r.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.perms.map(p => (
                        <span key={p} className="text-[10px] font-mono text-slate-600 bg-white border border-border px-2 py-0.5 rounded-md shadow-2xs">
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. ACCOUNT SETTINGS */}
          {active === 'Account Settings' && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
              <h2 className="text-base font-display font-800 text-slate-900 mb-1">Admin Account Profile</h2>
              <p className="text-muted text-xs mb-5">Administrator credentials for the MetroAttend management portal</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Admin Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-display font-700 text-slate-600 mb-1.5 uppercase">Admin Email</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h3 className="text-xs font-display font-bold text-slate-800 uppercase mb-3">Change Administrator Password</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-display font-600 text-slate-500 mb-1">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={oldPass}
                        onChange={e => setOldPass(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-display font-600 text-slate-500 mb-1">New Password</label>
                      <input
                        type="password"
                        placeholder="New secure password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm"
                      />
                    </div>
                  </div>
                  {passSuccess && (
                    <div className="text-xs text-emerald-700 font-mono mt-2">✓ Password updated successfully.</div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (newPass.length > 5) {
                        setPassSuccess(true);
                        setOldPass('');
                        setNewPass('');
                        setTimeout(() => setPassSuccess(false), 3000);
                      }
                    }}
                    className="mt-3 px-4 py-2 bg-surface border border-navy/20 text-navy rounded-xl text-xs font-display font-bold hover:bg-navy-50 transition-colors"
                  >
                    Update Password
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="mt-4 px-6 py-3 rounded-xl font-display font-bold text-sm bg-navy text-white hover:bg-navy-dark transition-all disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Account Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
