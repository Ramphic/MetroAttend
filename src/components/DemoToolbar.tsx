import React, { useState, useEffect } from 'react';
import { NavProps } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  resetTodayAttendance, 
  resetAllTodayAttendance, 
  simulateSharedDeviceCheckIn,
  getEmployeeAttendance 
} from '../lib/firebase';

interface Props {
  nav: NavProps;
  currentScreen?: string;
  onRefresh?: () => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function DemoToolbar({ nav, currentScreen, onRefresh, isOpen: controlledOpen, setIsOpen: setControlledOpen }: Props) {
  const { user, profile, isAdmin } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const [isResetting, setIsResetting] = useState(false);
  const [isSimulatingProxy, setIsSimulatingProxy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Time simulation state
  const [timeMode, setTimeMode] = useState<'real' | 'ontime' | 'late'>(() => {
    return (localStorage.getItem('metroattend_demo_timemode') as any) || 'real';
  });

  // GPS simulation state
  const [forceGps, setForceGps] = useState<boolean>(() => {
    return localStorage.getItem('metroattend_demo_force_gps') === 'true';
  });

  const uid = user?.uid || profile?.id || profile?.uid || 'emp_1';
  const name = profile?.name || user?.displayName || 'Staff Member';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTimeModeChange = (mode: 'real' | 'ontime' | 'late') => {
    setTimeMode(mode);
    localStorage.setItem('metroattend_demo_timemode', mode);
    if (mode === 'ontime') {
      showToast('Shift time set to 8:02 AM (On-Time Present)');
    } else if (mode === 'late') {
      showToast('Shift time set to 8:42 AM (Late Arrival)');
    } else {
      showToast('Shift time using actual clock');
    }
  };

  const handleToggleGps = () => {
    const next = !forceGps;
    setForceGps(next);
    localStorage.setItem('metroattend_demo_force_gps', next ? 'true' : 'false');
    showToast(next ? 'GPS Override: Force verified at HQ' : 'GPS Override: Using real device GPS');
  };

  const handleResetUserToday = async () => {
    setIsResetting(true);
    try {
      await resetTodayAttendance(uid);
      nav.setCheckInStatus('not-checked-in');
      nav.setCheckInTime('');
      nav.setCheckOutTime('');
      if (onRefresh) onRefresh();
      showToast('✓ Today\'s attendance reset! Ready for check-in demo.');
    } catch (e) {
      console.error(e);
      showToast('Failed to reset attendance.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetAllToday = async () => {
    if (!window.confirm('Reset all organization attendance records for today? This creates a completely fresh roster for the demo.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetAllTodayAttendance();
      nav.setCheckInStatus('not-checked-in');
      nav.setCheckInTime('');
      nav.setCheckOutTime('');
      if (onRefresh) onRefresh();
      showToast('✓ All attendance records for today cleared!');
    } catch (e) {
      console.error(e);
      showToast('Failed to clear records.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSimulateProxy = async () => {
    setIsSimulatingProxy(true);
    try {
      await simulateSharedDeviceCheckIn(uid, name);
      if (onRefresh) onRefresh();
      showToast('🚨 Proxy detected! Shared phone alert active.');
    } catch (e) {
      console.error(e);
      showToast('Simulation failed.');
    } finally {
      setIsSimulatingProxy(false);
    }
  };

  const isAdminScreen = currentScreen?.startsWith('admin');

  return (
    <>
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-display font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <span>⚡</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Demo Launcher Pill (when collapsed and uncontrolled) */}
      {!isOpen && controlledOpen === undefined && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-40">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-2 rounded-full shadow-lg hover:shadow-xl font-display font-bold text-xs transition-all active:scale-95 border border-amber-300/40 cursor-pointer"
            title="Open Demo Controls for Presentation"
          >
            <span className="animate-pulse">⚡</span>
            <span>Demo Controls</span>
          </button>
        </div>
      )}

      {/* Expanded Demo Control Center Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border p-6 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-display font-800 text-slate-900">Demo Presentation Toolkit</h3>
                  <p className="text-[11px] text-muted">Test flows on demand during your demo</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Minimize toolbar"
              >
                ✕
              </button>
            </div>

            {/* Body actions */}
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Quick Reset Tools */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="text-xs font-display font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Attendance Reset (Test Repeatedly)</span>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">Ready</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Reset attendance so you can clock in, mark absent, or clock out again without waiting for tomorrow.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleResetUserToday}
                    disabled={isResetting}
                    className="py-2.5 px-3 bg-white hover:bg-navy hover:text-white border border-slate-200 hover:border-navy text-slate-700 font-display font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                    </svg>
                    <span>Reset My Status</span>
                  </button>

                  <button
                    onClick={handleResetAllToday}
                    disabled={isResetting}
                    className="py-2.5 px-3 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 text-red-700 font-display font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🗑️</span>
                    <span>Wipe All Today</span>
                  </button>
                </div>
              </div>

              {/* Time Simulator (On-time vs Late) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="text-xs font-display font-bold text-slate-800 flex items-center justify-between">
                  <span>2. Shift Timing Simulator</span>
                  <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                    {timeMode === 'ontime' ? 'On-Time Mode' : timeMode === 'late' ? 'Late Mode' : 'Real Clock'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Choose the simulated check-in time so you can demonstrate on-time ("Present") or late arrivals regardless of current hour.
                </p>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => handleTimeModeChange('ontime')}
                    className={`py-2 px-2 text-center rounded-xl font-display font-bold text-xs border transition-all cursor-pointer ${
                      timeMode === 'ontime' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    🟢 8:02 AM<br/><span className="text-[10px] opacity-80 font-normal">Present</span>
                  </button>

                  <button
                    onClick={() => handleTimeModeChange('late')}
                    className={`py-2 px-2 text-center rounded-xl font-display font-bold text-xs border transition-all cursor-pointer ${
                      timeMode === 'late' 
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    🟡 8:42 AM<br/><span className="text-[10px] opacity-80 font-normal">Late</span>
                  </button>

                  <button
                    onClick={() => handleTimeModeChange('real')}
                    className={`py-2 px-2 text-center rounded-xl font-display font-bold text-xs border transition-all cursor-pointer ${
                      timeMode === 'real' 
                        ? 'bg-navy text-white border-navy shadow-sm' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-navy/30'
                    }`}
                  >
                    ⏰ Real Clock<br/><span className="text-[10px] opacity-80 font-normal">Device</span>
                  </button>
                </div>
              </div>

              {/* GPS Geofence Override */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-display font-bold text-slate-800">
                    <span>3. GPS Geofence Auto-Verify</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGps}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      forceGps ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        forceGps ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {forceGps 
                    ? '🟢 Active: GPS will instantly authenticate inside HQ perimeter (~25m) wherever you are presenting from.'
                    : '⚪ Inactive: Verification will measure true device GPS coordinates.'}
                </p>
              </div>

              {/* Buddy Punching / Security Simulation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-display font-bold text-slate-800 flex items-center justify-between">
                  <span>4. Anti-Proxy / Shared Phone Alert</span>
                  <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Security</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Demonstrate the hardware fingerprinting security by simulating a second employee using this same phone today.
                </p>
                <button
                  onClick={handleSimulateProxy}
                  disabled={isSimulatingProxy}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>🚨</span>
                  <span>{isSimulatingProxy ? 'Simulating…' : 'Trigger Buddy-Punching Alert'}</span>
                </button>
              </div>

              {/* Portal Switcher */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-display font-bold text-slate-800">
                  <span>5. Quick Portal Navigation</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      nav.navigate('dashboard');
                      setIsOpen(false);
                    }}
                    className="py-2 px-3 bg-white border border-slate-200 hover:border-navy text-slate-700 font-display font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>👤</span> Staff Dashboard
                  </button>
                  <button
                    onClick={() => {
                      if (nav.onAdminBypass) nav.onAdminBypass();
                      nav.navigate('admin-dashboard');
                      setIsOpen(false);
                    }}
                    className="py-2 px-3 bg-navy text-white hover:bg-navy-dark font-display font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>👁</span> Admin Portal
                  </button>
                </div>
              </div>

              {/* Temporary Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-navy/80 leading-relaxed">
                💡 <strong>Note for demo:</strong> These controls are added for your presentation tomorrow so you can effortlessly showcase all features. We will remove this demo bar once testing is completed.
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 mt-2 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white font-display font-bold text-xs rounded-xl hover:bg-black transition-colors cursor-pointer shadow-xs"
              >
                Close & Return to App
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
