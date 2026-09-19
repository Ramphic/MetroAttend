import React from 'react';
import { NavProps } from '../types';
import BottomNav from './BottomNav';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

interface Props {
  children: React.ReactNode;
  nav: NavProps;
  showBottomNav?: boolean;
  currentTab?: 'home' | 'attendance' | 'profile' | 'notifications';
  statusBarDark?: boolean;
  headerBg?: string;
}

export default function MobileShell({ children, nav, showBottomNav = true, currentTab = 'home' }: Props) {
  const { isAdmin, profile, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    nav.setCheckInStatus('not-checked-in');
    nav.navigate('landing');
  };

  const displayName = profile?.name || user?.displayName || 'Staff Member';
  const avatarText = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Universal Responsive Header */}
      <header className="bg-navy text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Org Name */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => nav.navigate('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0">
                <Logo size={32} />
              </div>
              <div>
                <div className="text-white text-base font-display font-800 leading-tight flex items-center gap-2">
                  MetroAttend
                  <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-white/50 text-[10px] font-mono leading-none">MetroWorks Infrastructure</div>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button 
              onClick={() => nav.navigate('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-700 transition-all ${
                currentTab === 'home' 
                  ? 'bg-white/20 text-white shadow-xs' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => nav.navigate('attendance-history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-700 transition-all ${
                currentTab === 'attendance' 
                  ? 'bg-white/20 text-white shadow-xs' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Attendance Logs
            </button>
            <button 
              onClick={() => nav.navigate('emp-profile')}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-700 transition-all ${
                currentTab === 'profile' 
                  ? 'bg-white/20 text-white shadow-xs' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Profile
            </button>
            <button 
              onClick={() => nav.navigate('notifications')}
              className={`px-3.5 py-2 rounded-xl text-xs font-display font-700 transition-all ${
                currentTab === 'notifications' 
                  ? 'bg-white/20 text-white shadow-xs' 
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Alerts
            </button>
          </nav>

          {/* User actions / Admin shortcut */}
          <div className="flex items-center gap-3">
            {/* Admin Console shortcut - only rendered if authorized */}
            {isAdmin && (
              <button
                onClick={() => nav.navigate('admin-dashboard')}
                className="text-xs bg-white/15 text-white hover:bg-white/25 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all font-display font-bold flex items-center gap-1.5 border border-white/20 shadow-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Admin Console</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* User identity & sign out */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              {profile?.photoURL || user?.photoURL ? (
                <img 
                  src={profile?.photoURL || user?.photoURL || ''} 
                  alt={displayName} 
                  className="w-8 h-8 rounded-full border border-white/30 object-cover" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-display font-bold">
                  {avatarText}
                </div>
              )}
              <span className="hidden lg:inline text-xs font-display font-semibold text-white/90 max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Body Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-5 pb-24 md:pb-10">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-border overflow-hidden">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Phone viewports only) */}
      {showBottomNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-lg">
          <BottomNav nav={nav} currentTab={currentTab} />
        </div>
      )}
    </div>
  );
}
