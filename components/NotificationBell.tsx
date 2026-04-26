'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
      setTimeout(markAllAsRead, 3000);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    markNotificationAsRead(n.id);
    setIsOpen(false);
    
    if (n.refId) {
      if (n.type === 'new_message') {
        router.push(`/inbox?open=${n.refId}`);
      } else {
        router.push(`/scheduled?open=${n.refId}`);
      }
    } else if (n.type === 'game_turn') {
      router.push('/games');
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
    <div className="notif-bell-wrap" ref={menuRef}>
      <style>{`
        .notif-bell-wrap { position: relative; }
        .notif-btn {
          position: relative;
          padding: 8px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notif-btn:hover { background: rgba(232, 160, 160, 0.1); }
        
        .pulse-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          background: #E8A0A0;
          border-radius: 50%;
          animation: bell-pulse 2s infinite;
          border: 1.5px solid white;
        }
        @keyframes bell-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .notif-dropdown {
          position: fixed;
          top: 64px;
          right: 16px;
          width: 280px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(232, 160, 160, 0.2);
          border-radius: 20px;
          shadow: 0 12px 40px rgba(61, 43, 61, 0.12);
          z-index: 2000;
          overflow: hidden;
          animation: notif-slide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes notif-slide {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notif-header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(232, 160, 160, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .notif-header h3 { font-family: var(--font-cormorant); font-style: italic; font-size: 18px; color: #3D2B3D; margin: 0; }
        .notif-new-tag { font-size: 9px; color: #E8A0A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }

        .notif-list { max-height: 360px; overflow-y: auto; }
        .notif-item {
          padding: 12px 16px;
          border-bottom: 0.5px solid rgba(0,0,0,0.03);
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .notif-item:hover { background: rgba(232, 160, 160, 0.05); }
        .notif-item.unread { background: rgba(232, 160, 160, 0.03); }
        .notif-icon { font-size: 18px; flex-shrink: 0; }
        .notif-text { font-size: 12px; color: #3D2B3D; line-height: 1.4; }
        .notif-time { font-size: 10px; color: #B09090; font-style: italic; margin-top: 4px; }
        .notif-empty { padding: 32px; text-align: center; color: #B09090; font-family: var(--font-cormorant); font-style: italic; }
      `}</style>

      <button onClick={handleOpen} className="notif-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A5C7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && <span className="pulse-dot" />}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Activity</h3>
            {unreadCount > 0 && <span className="notif-new-tag">New</span>}
          </div>
          
          <div className="notif-list">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notif-icon">{getIcon(n.type)}</span>
                  <div>
                    <p className="notif-text">
                      <strong>{n.fromName}</strong>{' '}
                      {n.type === 'message_opened' && 'opened your message'}
                      {n.type === 'reaction' && `reacted with ${n.meta}`}
                      {n.type === 'reply' && 'replied to you'}
                      {n.type === 'new_message' && 'sent you a love letter'}
                      {n.type === 'game_turn' && "it's your turn in the game"}
                    </p>
                    <p className="notif-time">{timeAgo(n.createdAt)} ago</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="notif-empty">
                <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>🕊️</span>
                No recent activity
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
