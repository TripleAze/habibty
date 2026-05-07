'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToPresence } from '@/lib/presence';

interface Presence {
  status: 'online' | 'offline' | 'away';
  lastSeen?: any;
}

const PresenceContext = createContext<Presence | null>(null);

export function PresenceProvider({ children, partnerId }: { children: React.ReactNode; partnerId?: string }) {
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    if (!partnerId) {
      setPresence(null);
      return;
    }
    
    // One listener for the whole app
    const unsub = subscribeToPresence(partnerId, (p: any) => {
      setPresence(p);
    });
    
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [partnerId]);

  return (
    <PresenceContext.Provider value={presence}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
