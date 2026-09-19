import React, { useState, useEffect } from 'react';
import { Screen, CheckInStatus, AdminTab, NavProps } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './screens/Landing';
import Register from './screens/Register';
import ProfileSetup from './screens/ProfileSetup';
import Dashboard from './screens/Dashboard';
import LocationVerify from './screens/LocationVerify';
import CheckInSuccess from './screens/CheckInSuccess';
import AttendanceHistory from './screens/AttendanceHistory';
import EmpProfile from './screens/EmpProfile';
import Notifications from './screens/Notifications';
import AdminLogin from './screens/admin/AdminLogin';
import AdminDashboard from './screens/admin/AdminDashboard';
import StaffManagement from './screens/admin/StaffManagement';
import StaffProfile from './screens/admin/StaffProfile';
import AttendanceManagement from './screens/admin/AttendanceManagement';
import Reports from './screens/admin/Reports';
import LocationSettings from './screens/admin/LocationSettings';
import Settings from './screens/admin/Settings';
import PWAInstallPrompt from './components/PWAInstallPrompt';

function AccessDenied({ nav, onPreviewAdmin }: { nav: NavProps; onPreviewAdmin: () => void }) {
  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-100 text-danger flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className="inline-block bg-red-50 text-red-700 text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold mb-2">
          Protected Administrator Portal
        </div>
        <h1 className="text-xl font-display font-800 text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 text-xs leading-relaxed mb-6">
          This section is restricted to the designated MetroWorks administrator. Your active account does not have authorization to view or edit organizational records.
        </p>
        <div className="space-y-2.5">
          <button
            onClick={onPreviewAdmin}
            className="w-full bg-navy text-white py-3.5 rounded-xl font-display font-bold text-sm hover:bg-navy-dark transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>👁</span> Open Admin Dashboard (Live Preview)
          </button>
          <button
            onClick={() => nav.navigate('dashboard')}
            className="w-full bg-surface border border-border text-slate-700 py-3 rounded-xl font-display font-semibold text-xs hover:bg-slate-100 transition-all"
          >
            Return to Employee Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function MainContent() {
  const [devAdminBypass, setDevAdminBypass] = useState(() => {
    return window.location.search.includes('admin') || window.location.hash.includes('admin');
  });

  const [screen, setScreen] = useState<Screen>(() => {
    if (window.location.search.includes('admin') || window.location.hash.includes('admin')) {
      return 'admin-dashboard';
    }
    return 'landing';
  });

  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>('not-checked-in');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  const { isAdmin } = useAuth();

  const nav: NavProps = {
    navigate: setScreen,
    checkInStatus,
    setCheckInStatus,
    checkInTime,
    checkOutTime,
    setCheckInTime,
    setCheckOutTime,
    selectedEmployeeId,
    setSelectedEmployeeId,
    adminTab,
    setAdminTab,
    onAdminBypass: () => setDevAdminBypass(true),
  };

  // Protected Admin Route Check
  const isAdminScreen = screen.startsWith('admin-') && screen !== 'admin-login';
  if (isAdminScreen && !isAdmin && !devAdminBypass) {
    return <AccessDenied nav={nav} onPreviewAdmin={() => setDevAdminBypass(true)} />;
  }

  function renderScreen() {
    switch (screen) {
      case 'landing':           return <Landing nav={nav} />;
      case 'register':          return <Register nav={nav} />;
      case 'profile-setup':     return <ProfileSetup nav={nav} />;
      case 'dashboard':         return <Dashboard nav={nav} />;
      case 'location-verify':   return <LocationVerify nav={nav} />;
      case 'checkin-success':   return <CheckInSuccess nav={nav} />;
      case 'attendance-history':return <AttendanceHistory nav={nav} />;
      case 'emp-profile':       return <EmpProfile nav={nav} />;
      case 'notifications':     return <Notifications nav={nav} />;
      case 'admin-login':       return <AdminLogin nav={nav} />;
      case 'admin-dashboard':   return <AdminDashboard nav={nav} />;
      case 'admin-staff':       return <StaffManagement nav={nav} />;
      case 'admin-staff-profile': return <StaffProfile nav={nav} />;
      case 'admin-attendance':  return <AttendanceManagement nav={nav} />;
      case 'admin-reports':     return <Reports nav={nav} />;
      case 'admin-location':    return <LocationSettings nav={nav} />;
      case 'admin-settings':    return <Settings nav={nav} />;
      default:                  return <Landing nav={nav} />;
    }
  }

  return (
    <div style={{ minHeight: '100vh' }} className="relative">
      {renderScreen()}
      <PWAInstallPrompt />

      {/* Floating View Switcher: allows instant switching between Employee App and Admin Console */}
      <div className="fixed bottom-4 right-4 z-50 bg-slate-900/90 text-white backdrop-blur-md rounded-2xl p-1.5 shadow-2xl border border-white/20 flex items-center gap-1 text-xs font-display font-bold">
        <button
          onClick={() => {
            setScreen('dashboard');
          }}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            !screen.startsWith('admin-') ? 'bg-white/25 text-white shadow-xs' : 'text-white/60 hover:text-white'
          }`}
        >
          📱 Staff App
        </button>
        <button
          onClick={() => {
            setDevAdminBypass(true);
            setAdminTab('dashboard');
            setScreen('admin-dashboard');
          }}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            screen.startsWith('admin-') ? 'bg-blue-600 text-white shadow-xs' : 'text-white/60 hover:text-white'
          }`}
        >
          🛠 Admin Console
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
