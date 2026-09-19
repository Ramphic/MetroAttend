import React from 'react';
import { NavProps, Screen } from '../types';

interface Props {
  nav: NavProps;
  currentTab: 'home' | 'attendance' | 'profile' | 'notifications';
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#1B3A6B' : 'none'} stroke={active ? '#1B3A6B' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1B3A6B' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const BellIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1B3A6B' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const UserIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1B3A6B' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function BottomNav({ nav, currentTab }: Props) {
  const items: { key: typeof currentTab; label: string; screen: Screen; icon: (active: boolean) => React.ReactNode }[] = [
    { key: 'home', label: 'Home', screen: 'dashboard', icon: (a) => <HomeIcon active={a} /> },
    { key: 'attendance', label: 'Attendance', screen: 'attendance-history', icon: (a) => <CalendarIcon active={a} /> },
    { key: 'notifications', label: 'Alerts', screen: 'notifications', icon: (a) => <BellIcon active={a} /> },
    { key: 'profile', label: 'Profile', screen: 'emp-profile', icon: (a) => <UserIcon active={a} /> },
  ];

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex items-center" style={{ height: 68 }}>
      {items.map(item => {
        const active = currentTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => nav.navigate(item.screen)}
            className="flex-1 flex flex-col items-center gap-1 py-2 transition-opacity"
          >
            {item.icon(active)}
            <span className={`text-[10px] font-display font-600 ${active ? 'text-navy' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {active && <span className="w-1 h-1 rounded-full bg-navy absolute bottom-2" />}
          </button>
        );
      })}
    </div>
  );
}
