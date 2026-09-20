import React, { useState } from 'react';
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
    label: 'Staff Directory',
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
    label: 'Reports & Audit',
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
    label: 'Geofence Boundaries',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'System Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const adminName = profile?.name || user?.displayName || 'System Admin';
  const adminEmail = profile?.email || user?.email || 'admin@metroworks.gov.gh';
  const avatarText = adminName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    nav.navigate('landing');
  };

  const handleNavClick = (tab: AdminTab) => {
    nav.setAdminTab(tab);
    nav.navigate(screenMap[tab]);
    setMobileDrawerOpen(false);
  };

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-navy-dark text-white">
      {/* Logo Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center flex-shrink-0">
            <Logo size={32} />
          </div>
          <div>
            <div className="text-white text-base font-display font-800 leading-tight">MetroAttend</div>
            <div className="text-white/50 text-[10px] font-mono">Protected Admin Console</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = nav.adminTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-display font-bold transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className={active ? 'text-white' : 'text-white/50'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin Profile Footer */}
      <div className="p-4 border-t border-white/10 bg-navy-dark/80">
        <div className="flex items-center gap-3 px-2 py-1.5">
          {profile?.photoURL || user?.photoURL ? (
            <img 
              src={profile?.photoURL || user?.photoURL || ''} 
              alt="admin" 
              className="w-8 h-8 rounded-full border border-white/20 object-cover" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-display font-700 flex-shrink-0">
              {avatarText}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-display font-bold truncate">{adminName}</div>
            <div className="text-white/40 text-[10px] truncate font-mono">{adminEmail}</div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <button
            onClick={() => { setMobileDrawerOpen(false); nav.navigate('dashboard'); }}
            className="w-full text-white/70 text-xs py-2 hover:text-white transition-colors font-display font-semibold text-left px-2.5 rounded-lg hover:bg-white/10 flex items-center gap-2"
          >
            <span>📱</span> Switch to Employee View
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-red-300 text-xs py-2 hover:text-red-200 transition-colors font-display font-semibold text-left px-2.5 rounded-lg hover:bg-red-500/10 flex items-center gap-2"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0 border-r border-navy/20 z-30 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-border px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-border text-slate-700 hover:bg-surface transition-colors"
              aria-label="Open Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <div>
              <div className="text-[10px] text-muted font-mono tracking-wider uppercase hidden sm:block">MetroWorks Infrastructure Services</div>
              <div className="text-slate-900 font-display font-800 text-sm sm:text-base">
                Admin Console · <span className="text-navy capitalize">{nav.adminTab}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-[11px] font-mono text-slate-600 bg-surface px-2.5 py-1 rounded-lg border border-border hidden sm:block">
              {todayStr}
            </div>
            
            <button
              onClick={() => nav.navigate('dashboard')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-navy/20 bg-navy-50 text-navy text-xs font-display font-bold hover:bg-navy-100 transition-colors shadow-2xs"
            >
              <span>📱</span> Staff View
            </button>

            <div className="relative">
              {profile?.photoURL || user?.photoURL ? (
                <img 
                  src={profile?.photoURL || user?.photoURL || ''} 
                  alt="admin" 
                  className="w-8 h-8 rounded-xl object-cover border border-navy/20 shadow-2xs" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center text-xs font-display font-800 shadow-2xs">
                  {avatarText}
                </div>
              )}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </header>

        {/* Child Screen Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
