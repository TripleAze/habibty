'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setPresence } from '@/lib/presence';

export default function AppLifecycle() {
  useEffect(() => {
    if (!auth) return;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Mark user as online when they log in or the app loads
        setPresence('online');

        // Set to offline on page unload
        const handleUnload = () => {
          // Note: navigation.sendBeacon or firestore.onDisconnect would be better
          // but for simple Firestore-only presence, we set it when we can.
          setPresence('offline');
        };

        window.addEventListener('beforeunload', handleUnload);
        
        // Visibility heartbeat
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            setPresence('online');
          } else {
            setPresence('offline');
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
          window.removeEventListener('beforeunload', handleUnload);
          document.removeEventListener('visibilitychange', handleVisibility);
        };
      }
    });

    return () => unsubAuth();
  }, []);

  return null; // This component handles side effects only
}
