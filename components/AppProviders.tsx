'use client';

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { PresenceProvider } from '@/lib/PresenceContext';
import { NotificationProvider } from '@/lib/NotificationContext';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | undefined>();
  const [partnerId, setPartnerId] = useState<string | undefined>();

  useEffect(() => {
    if (!auth) return;
    
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch user doc to get partnerId
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setPartnerId(userDoc.data().partnerId);
          }
        } catch (err) {
          console.error("Error fetching partnerId:", err);
        }
      } else {
        setUserId(undefined);
        setPartnerId(undefined);
      }
    });

    return () => unsub();
  }, []);

  return (
    <PresenceProvider partnerId={partnerId}>
      <NotificationProvider userId={userId}>
        {children}
      </NotificationProvider>
    </PresenceProvider>
  );
}
