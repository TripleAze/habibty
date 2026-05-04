import { doc, getDoc, writeBatch, deleteField, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { useState, useEffect } from 'react';

/**
 * Atomically unpairs two users by clearing the partnerId field on both documents.
 * This is a "soft break" - shared messages and games are not deleted, only hidden.
 * 
 * @param uid Current user ID
 * @param partnerId Partner's user ID
 */
export interface Partner {
  uid: string;
  name: string;
  photoURL?: string;
  email?: string;
}

/**
 * Hook to get partner information
 */
export function usePair() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [daysTogether, setDaysTogether] = useState<number>(0);

  useEffect(() => {
    if (!auth) return;

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!user) {
        setPartner(null);
        setDaysTogether(0);
        return;
      }

      // Subscribe to user document changes
      unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userSnap) => {
        if (!userSnap.exists()) return;
        
        const userData = userSnap.data();
        const partnerId = userData?.partnerId;
        const pairedAt = userData?.pairedAt;

        if (!partnerId) {
          setPartner(null);
          setDaysTogether(0);
          return;
        }

        // Calculate days together
        if (pairedAt && pairedAt instanceof Timestamp) {
          const now = Timestamp.now();
          const diffMs = now.toMillis() - pairedAt.toMillis();
          setDaysTogether(Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
        } else if (pairedAt && typeof pairedAt === 'number') {
          // Fallback if pairedAt is a numeric timestamp
          const diffMs = Date.now() - pairedAt;
          setDaysTogether(Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
        }

        // Fetch partner data
        getDoc(doc(db, 'users', partnerId)).then((partnerSnap) => {
          if (partnerSnap.exists()) {
            const data = partnerSnap.data();
            setPartner({
              uid: partnerSnap.id,
              name: data.displayName || 'Partner',
              photoURL: data.photoURL,
              email: data.email,
            });
          }
        });
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const unpair = async () => {
    const currentUserId = auth?.currentUser?.uid;
    if (currentUserId && partner) {
      await unpairPartner(currentUserId, partner.uid);
    }
  };

  return { partner, unpair, daysTogether };
}

export async function unpairPartner(uid: string, partnerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!uid || !partnerId) {
    return { ok: false, error: 'User IDs are required for unpairing.' };
  }

  try {
    // 1. Fetch current state to ensure valid permissions
    const [userSnap, partnerSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', partnerId))
    ]);

    const batch = writeBatch(db);
    let hasWork = false;

    // Clear partnerId for current user only if it matches
    if (userSnap.exists() && userSnap.data().partnerId === partnerId) {
      batch.update(doc(db, 'users', uid), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    // Clear partnerId for the partner ONLY if they are still pointing to current user
    // This avoids "insufficient permissions" errors if they've already unpaired us.
    if (partnerSnap.exists() && partnerSnap.data().partnerId === uid) {
      batch.update(doc(db, 'users', partnerId), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    if (hasWork) {
      await batch.commit();
    }
    
    return { ok: true };
  } catch (err: any) {
    console.error('Unpair error:', err);
    return { ok: false, error: err.message || 'Failed to unpair. Please try again.' };
  }
}
