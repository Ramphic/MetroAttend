import React, { useState, useEffect } from 'react';
import { NavProps, SystemNotification } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  formatNotificationTime
} from '../lib/firebase';

type FilterTab = 'all' | 'unread' | 'announcements' | 'attendance';

const iconMap: Record<string, React.ReactNode> = {
  success: (
    <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center flex-shrink-0 text-success shadow-xs">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  ),
  warning: (
    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-700 shadow-xs border border-amber-200">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
  ),
  info: (
    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0 text-navy shadow-xs border border-navy/10">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
  ),
};

export default function Notifications({ nav }: { nav: NavProps }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currentUid = user?.uid || profile?.id || profile?.uid || 'emp_1';

  useEffect(() => {
    const unsubscribe = subscribeNotifications(currentUid, (list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, [currentUid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const unreadCount = notifications.filter(n => n.unread).length;
  const announcementCount = notifications.filter(n => n.broadcast).length;
  const attendanceCount = notifications.filter(n => !n.broadcast).length;

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'unread') return n.unread;
    if (filterTab === 'announcements') return Boolean(n.broadcast);
    if (filterTab === 'attendance') return !n.broadcast;
    return true;
  });

  const handleNotificationClick = async (notif: SystemNotification) => {
    if (notif.unread) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, unread: false } : n));
      await markNotificationAsRead(notif.id, currentUid);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    await markAllNotificationsAsRead(currentUid);
    showToast('✓ All notifications marked as read.');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id, currentUid);
    showToast('Notification dismissed.');
  };

  const getCategoryBadge = (n: SystemNotification) => {
    if (n.broadcast) {
      return (
        <span className="bg-navy/10 text-navy text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-bold tracking-wide">
          Official Bulletin
        </span>
      );
    }
    if (n.title.toLowerCase().includes('check-in') || n.title.toLowerCase().includes('attendance')) {
      return (
        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-display uppercase px-2 py-0.5 rounded-md font-bold tracking-wide border border-emerald-200">
          Check-In Log
        </span>
      );
    }
    if (n.title.toLowerCase().includes('check-out') || n.title.toLowerCase().includes('departure')) {
      return (
        <span className="bg-blue-50 text-blue-800 text-[10px] font-display uppercase px-2 py-0.5 rounded-md font-bold tracking-wide border border-blue-200">
          Departure Log
        </span>
      );
    }
    if (n.title.toLowerCase().includes('absence')) {
      return (
        <span className="bg-amber-50 text-amber-900 text-[10px] font-display uppercase px-2 py-0.5 rounded-md font-bold tracking-wide border border-amber-300">
          Absence Report
        </span>
      );
    }
    return (
      <span className="bg-slate-100 text-slate-700 text-[10px] font-display uppercase px-2 py-0.5 rounded-md font-bold tracking-wide">
        System Notice
      </span>
    );
  };

  return (
    <MobileShell nav={nav} currentTab="notifications">
      {/* Header Banner */}
      <div className="bg-navy px-6 py-7 sm:px-8 text-white shadow-sm">
        <button 
          onClick={() => nav.navigate('dashboard')} 
          className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2.5 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-800 tracking-tight">Notifications & Bulletins</h1>
            <p className="text-white/60 text-xs sm:text-sm mt-0.5">Real-time attendance logs, official bulletins, and supervisor updates</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-display font-bold px-3.5 py-2 rounded-xl border border-white/20 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                ✓ Mark all as read
              </button>
            )}
            <span className="bg-white/20 text-white text-xs font-display font-bold px-3 py-1.5 rounded-xl whitespace-nowrap border border-white/10">
              {unreadCount} Unread
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-8 bg-slate-50/50 space-y-4 max-w-4xl mx-auto w-full">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-display font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* Filter Pills Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-600 border border-border hover:bg-slate-100'
            }`}
          >
            All Notices ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('unread')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'unread'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-600 border border-border hover:bg-slate-100'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterTab === 'unread' ? 'bg-white text-navy font-bold' : 'bg-red-500 text-white'}`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('announcements')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'announcements'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-600 border border-border hover:bg-slate-100'
            }`}
          >
            <span>📢 Bulletins</span>
            {announcementCount > 0 && (
              <span className="text-[10px] opacity-75 font-mono">({announcementCount})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('attendance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterTab === 'attendance'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-600 border border-border hover:bg-slate-100'
            }`}
          >
            <span>⏱️ Attendance Logs</span>
            {attendanceCount > 0 && (
              <span className="text-[10px] opacity-75 font-mono">({attendanceCount})</span>
            )}
          </button>
        </div>

        {/* Notifications Stream */}
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-2xl text-slate-400">
              🔔
            </div>
            <div className="text-slate-800 font-display font-bold text-sm">
              {filterTab === 'unread' ? 'You are all caught up!' : 'No notifications in this category'}
            </div>
            <p className="text-slate-400 text-xs font-mono mt-1 max-w-sm mx-auto">
              {filterTab === 'unread' 
                ? 'There are no pending unread notifications. Check back for company bulletins or attendance updates.'
                : 'Check-in alerts, departure confirmations, and admin announcements will appear here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const formattedTime = formatNotificationTime(n.timestamp, n.time);
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs cursor-pointer hover:shadow-sm ${
                  n.unread ? 'border-navy/40 bg-blue-50/20 ring-1 ring-navy/10' : 'border-border'
                }`}
              >
                <div className="flex gap-3.5 sm:gap-4 items-start">
                  {iconMap[n.type] || iconMap.info}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-display font-bold ${n.unread ? 'text-slate-900 font-800' : 'text-slate-800'}`}>
                          {n.title}
                        </span>
                        {getCategoryBadge(n)}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {n.unread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 animate-pulse" title="Unread" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, n.id)}
                          className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Dismiss notification"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed mt-1.5 whitespace-pre-line">{n.body}</p>
                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span>🕒</span>
                        <span>{formattedTime}</span>
                      </div>
                      {n.unread && (
                        <span className="text-[10px] font-display font-bold text-navy hover:underline">
                          Tap to mark as read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </MobileShell>
  );
}
