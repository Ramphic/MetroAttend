import React, { useState, useEffect } from 'react';
import { NavProps, SystemNotification } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../lib/firebase';

const iconMap: Record<string, React.ReactNode> = {
  success: (
    <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center flex-shrink-0 text-success shadow-xs">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  ),
  warning: (
    <div className="w-10 h-10 rounded-xl bg-late-bg flex items-center justify-center flex-shrink-0 text-late shadow-xs">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    </div>
  ),
  info: (
    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0 text-navy shadow-xs">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
  ),
};

export default function Notifications({ nav }: { nav: NavProps }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const currentUid = user?.uid || profile?.id || 'emp_1';

  useEffect(() => {
    const unsubscribe = subscribeNotifications(currentUid, (list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, [currentUid]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleNotificationClick = async (notif: SystemNotification) => {
    if (notif.unread) {
      await markNotificationAsRead(notif.id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(currentUid);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <MobileShell nav={nav} currentTab="notifications">
      {/* Header Banner */}
      <div className="bg-navy px-6 py-6 sm:px-8 text-white">
        <button 
          onClick={() => nav.navigate('dashboard')} 
          className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-800">Notifications & Alerts</h1>
            <p className="text-white/60 text-xs mt-0.5">Stay updated with workplace attendance logs and company bulletins</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-display font-semibold px-3 py-1.5 rounded-xl border border-white/20 transition-all"
              >
                Mark all as read
              </button>
            )}
            <span className="bg-white/20 text-white text-xs font-display font-bold px-3 py-1 rounded-full whitespace-nowrap">
              {unreadCount} Unread
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-slate-50/50 space-y-3">
        {notifications.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-border">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div className="text-slate-700 font-display font-bold text-sm">No notifications right now</div>
            <div className="text-slate-400 text-xs font-mono mt-1">Check-in alerts and announcements will appear here</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs cursor-pointer hover:shadow-sm ${
                n.unread ? 'border-navy/40 bg-blue-50/30' : 'border-border'
              }`}
            >
              <div className="flex gap-4 items-start">
                {iconMap[n.type] || iconMap.info}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-display font-bold ${n.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </span>
                      {n.broadcast && (
                        <span className="bg-navy/10 text-navy text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold">
                          Announcement
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {n.unread && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 animate-pulse" />}
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed mt-1">{n.body}</p>
                  <div className="text-[10px] font-mono text-slate-400 mt-2">{n.time}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileShell>
  );
}
