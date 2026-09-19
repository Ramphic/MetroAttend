import React from 'react';
import { NavProps, AdminTab } from '../types';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface Props {
  children: React.ReactNode;
  nav: NavProps;
}

const navItems: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <path d="M8 14l2.5 2.5L16 11"/>
      </svg>
    ),
  },
  {
    key: 'staff',
    label: 'Staff',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    key: 'location',
    label: 'Geofence Location',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

const screenMap: Record<AdminTab, import('../types').Screen> = {
  dashboard: 'admin-dashboard',
  attendance: 'admin-attendance',
  staff: 'admin-staff',
  reports: 'admin-reports',
  location: 'admin-location',
  settings: 'admin-settings',
};

export default function AdminShell({ children, nav }: Props) {
  const { user, profile, logout } = useAuth();

  const adminName = profile?.name || user?.displayName || 'System Admin';
  const adminEmail = profile?.email || user?.email || 'admin@metroworks.gov.gh';
  const avatarText = adminName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    nav.navigate('landing');
  };

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="admin-sidebar bg-navy-dark flex flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 pb-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center flex-shrink-0">
            <Logo size={32} />
          </div>
          <div>
            <div className="text-white text-base font-display font-800 leading-tight">MetroAttend</div>
            <div className="text-white/40 text-[10px] font-mono">Protected Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 pt-6 space-y-1">
          {navItems.map(item => {
            const active = nav.adminTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { nav.setAdminTab(item.key); nav.navigate(screenMap[item.key]); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-500 transition-all ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:bg-white/8 hover:text-white/80'
                }`}
              >
                <span className={active ? 'text-white' : 'text-white/40'}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Admin User Info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            {profile?.photoURL || user?.photoURL ? (
              <img 
                src={profile?.photoURL || user?.photoURL || ''} 
                alt="admin" 
                className="w-8 h-8 rounded-full border border-white/20 object-cover" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-display font-700">
                {avatarText}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-white text-xs font-display font-600 truncate">{adminName}</div>
              <div className="text-white/40 text-[10px] truncate">{adminEmail}</div>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <button
              onClick={() => nav.navigate('dashboard')}
              className="w-full text-white/50 text-xs py-1.5 hover:text-white/80 transition-colors font-display text-left px-3 rounded-lg hover:bg-white/5"
            >
              ← Employee View
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-red-300 text-xs py-1.5 hover:text-red-200 transition-colors font-display text-left px-3 rounded-lg hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-border px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            <div className="text-xs text-muted font-mono">MetroWorks Infrastructure Services</div>
            <div className="text-slate-800 font-display font-700 text-sm">Welcome back, {adminName.split(' ')[0]}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted font-mono bg-surface px-3 py-1.5 rounded-lg border border-border">
              {todayStr}
            </div>
            <div className="relative">
              {profile?.photoURL || user?.photoURL ? (
                <img src={profile?.photoURL || user?.photoURL || ''} alt="admin" className="w-8 h-8 rounded-full object-cover border border-navy/20" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-display font-700">
                  {avatarText}
                </div>
              )}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-white" />
            </div>
          </div>
        </div>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
