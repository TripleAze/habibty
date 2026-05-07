'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToNotifications, AppNotification } from '@/lib/notifications';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0
});

export function NotificationProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToNotifications(userId, (fetched: any[]) => {
      setNotifications(fetched);
      setUnreadCount(fetched.filter(n => !n.read).length);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
