'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribeToNotifications, AppNotification, markAllAsRead, markNotificationAsRead } from '@/lib/notifications';
function timeAgo(date: number) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + " years";
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months";
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days";
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours";
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes";
  return Math.floor(seconds) + " seconds";
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeToNotifications(setNotifications);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Small delay before marking as read so we can see the unread state
      setTimeout(markAllAsRead, 3000);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message_opened': return '🔓';
      case 'reaction': return '💖';
      case 'reply': return '💬';
      case 'new_message': return '💌';
      case 'game_turn': return '🎲';
      default: return '✨';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-white/40 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D2B3D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#E8A0A0] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown fixed sm:absolute top-16 sm:top-full left-4 right-4 sm:left-auto sm:right-0 mt-3 w-auto sm:w-72 bg-white/95 backdrop-blur-xl border border-[#E8A0A0]/20 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-slide-up">
          <div className="p-4 border-bottom border-[#E8A0A0]/10 flex justify-between items-center">
            <h3 className="font-serif italic text-lg color-[#3D2B3D]">Activity</h3>
            {unreadCount > 0 && <span className="text-[10px] text-[#E8A0A0] font-medium uppercase tracking-wider">New</span>}
          </div>
          
          <div className="notification-list-container overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-bottom border-[#E8A0A0]/5 flex gap-3 hover:bg-[#FAD0DC]/10 transition-colors cursor-pointer ${!n.read ? 'bg-[#FAD0DC]/5' : ''}`}
                  onClick={() => markNotificationAsRead(n.id)}
                >
                  <span className="text-xl shrink-0">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#3D2B3D] leading-tight">
                      <span className="font-bold">{n.fromName}</span>{' '}
                      {n.type === 'message_opened' && 'opened your message'}
                      {n.type === 'reaction' && `reacted with ${n.meta}`}
                      {n.type === 'reply' && 'replied to you'}
                      {n.type === 'new_message' && 'sent you a love letter'}
                      {n.type === 'game_turn' && "it's your turn in the game"}
                    </p>
                    <p className="text-[10px] text-[#B09090] mt-1 italic">
                      {timeAgo(n.createdAt)} ago
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <span className="block text-2xl mb-2 opacity-30">🕊️</span>
                <p className="text-xs text-[#B09090] font-serif italic">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
