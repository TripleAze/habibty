import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type NotificationType = 'message_opened' | 'reaction' | 'reply' | 'new_message' | 'game_turn' | 'pairing_success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromUid: string;
  fromName: string;
  fromPhoto?: string;
  refId: string; // messageId, gameId, etc.
  meta?: string; // emoji, short text snippet, etc.
  read: boolean;
  createdAt: number;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Send a notification to a specific user
 */
export async function sendNotification(
  toUid: string,
  notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>
): Promise<void> {
  try {
    const notifsRef = collection(db, NOTIFICATIONS_COLLECTION, toUid, 'items');
    const data: any = {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    };

    // Remove any undefined fields
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    await addDoc(notifsRef, data);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Subscribe to current user's notifications
 */
export function subscribeToNotifications(
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!auth) {
    callback([]);
    return () => {};
  }
  let unsubSnapshot: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, (user) => {
    // Clean up previous listener if any
    if (unsubSnapshot) {
      unsubSnapshot();
      unsubSnapshot = null;
    }

    if (!user) {
      callback([]);
      return;
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION, user.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    unsubSnapshot = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.().getTime() || Date.now(),
      })) as AppNotification[];
      callback(items);
    });
  });

  return () => {
    unsubAuth();
    if (unsubSnapshot) unsubSnapshot();
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    const notifRef = doc(db, NOTIFICATIONS_COLLECTION, currentUserId, 'items', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION, currentUserId, 'items'),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    const updates = snap.docs.map(d => updateDoc(d.ref, { read: true }));
    await Promise.all(updates);
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearNotifications(): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    const q = query(collection(db, NOTIFICATIONS_COLLECTION, currentUserId, 'items'));
    const snap = await getDocs(q);
    const deletions = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletions);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}
