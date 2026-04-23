import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';

const PRESENCE_COLLECTION = 'presence';

export type PresenceStatus = 'online' | 'offline' | 'in_game';

export interface Presence {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
  updatedAt: number;
}

/**
 * Set user's presence status
 */
export async function setPresence(status: PresenceStatus): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    const presenceRef = doc(db, PRESENCE_COLLECTION, currentUserId);
    await setDoc(
      presenceRef,
      {
        userId: currentUserId,
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error setting presence:', error);
  }
}

/**
 * Update presence heartbeat (keeps user marked as online)
 */
export async function updatePresenceHeartbeat(): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    const presenceRef = doc(db, PRESENCE_COLLECTION, currentUserId);
    await updateDoc(presenceRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating presence heartbeat:', error);
  }
}

/**
 * Subscribe to a user's presence in real-time
 */
export function subscribeToPresence(
  userId: string,
  callback: (presence: Presence | null) => void
): () => void {
  const presenceRef = doc(db, PRESENCE_COLLECTION, userId);

  return onSnapshot(
    presenceRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          userId: data.userId,
          status: data.status,
          lastSeen: data.lastSeen?.toDate?.().getTime() || data.lastSeen,
          updatedAt: data.updatedAt?.toDate?.().getTime() || data.updatedAt,
        } as Presence);
      } else {
        callback(null);
      }
    },
    () => {
      callback(null);
    }
  );
}

/**
 * Check if a presence is stale (user disconnected without proper offline status)
 */
export function isPresenceStale(updatedAt: number, thresholdMs: number = 60000): boolean {
  return Date.now() - updatedAt > thresholdMs;
}

/**
 * Get display text for presence status
 */
export function getPresenceStatusText(presence: Presence | null): string {
  if (!presence) return 'Offline';

  if (presence.status === 'in_game') return 'Playing a game';
  if (presence.status === 'online') return 'Online';

  // Check if stale
  if (isPresenceStale(presence.updatedAt)) {
    return 'Offline';
  }

  return 'Offline';
}
