import { doc, getDoc, writeBatch, deleteField, onSnapshot, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import { useState, useEffect } from 'react';

/**
 * Atomically unpairs two users by clearing the partnerId field on both documents.
 * This is a "soft break" - shared messages and games are not deleted, only hidden.
 */
export interface Partner {
  uid: string;
  name: string;
  photoURL?: string;
  email?: string;
  accentColor?: string;
  relationshipNickname?: string;
}

/**
 * Hook to get partner information
 */
export function usePair() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [daysTogether, setDaysTogether] = useState<number>(0);
  const [inviteCode, setInviteCode] = useState<string>('');

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
        setInviteCode('');
        return;
      }

      // Subscribe to user document changes
      unsubscribeDoc = onSnapshot(doc(db, 'users', user.uid), (userSnap) => {
        if (!userSnap.exists()) return;
        
        const userData = userSnap.data();
        const partnerId = userData?.partnerId;
        const pairedAt = userData?.pairedAt;
        setInviteCode(userData?.inviteCode || '');

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
          const diffMs = Date.now() - pairedAt;
          setDaysTogether(Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))));
        }

        // Fetch partner data
        getDoc(doc(db, 'users', partnerId)).then((partnerSnap) => {
          if (partnerSnap.exists()) {
            const data = partnerSnap.data();
            setPartner({
              uid: partnerSnap.id,
              name: data.relationshipNickname || data.displayName || 'Partner',
              photoURL: data.photoURL,
              email: data.email,
              accentColor: data.accentColor,
              relationshipNickname: data.relationshipNickname,
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

  return { partner, unpair, daysTogether, inviteCode };
}

export async function pairWithCode(uid: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!uid || !code) return { ok: false, error: 'Code required' };
  
  try {
    const cleanCode = code.trim().toUpperCase();
    const q = query(collection(db, 'users'), where('inviteCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) return { ok: false, error: 'Code not found' };
    
    const partnerDoc = snap.docs[0];
    const partnerId = partnerDoc.id;
    const partnerData = partnerDoc.data();

    if (partnerId === uid) return { ok: false, error: "That's your own code!" };
    if (partnerData.partnerId) return { ok: false, error: 'This person is already paired.' };

    const batch = writeBatch(db);
    const pairedAt = Date.now();
    
    batch.update(doc(db, 'users', uid), { partnerId, pairedAt });
    batch.update(doc(db, 'users', partnerId), { partnerId: uid, pairedAt });

    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    console.error('Pair error:', err);
    return { ok: false, error: 'Failed to pair. Please try again.' };
  }
}

export async function unpairPartner(uid: string, partnerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!uid || !partnerId) return { ok: false, error: 'IDs required' };

  try {
    const [userSnap, partnerSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', partnerId))
    ]);

    const batch = writeBatch(db);
    let hasWork = false;

    if (userSnap.exists() && userSnap.data().partnerId === partnerId) {
      batch.update(doc(db, 'users', uid), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    if (partnerSnap.exists() && partnerSnap.data().partnerId === uid) {
      batch.update(doc(db, 'users', partnerId), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    if (hasWork) await batch.commit();
    return { ok: true };
  } catch (err: any) {
    console.error('Unpair error:', err);
    return { ok: false, error: 'Failed to unpair.' };
  }
}
