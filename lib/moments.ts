import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  or,
  and
} from 'firebase/firestore';
import { db, auth } from './firebase';

export type MomentType = 
  | 'message_sent' 
  | 'message_opened' 
  | 'reaction_added' 
  | 'reply_added' 
  | 'game_started' 
  | 'game_finished' 
  | 'pairing_anniversary';

export interface Moment {
  id: string;
  type: MomentType;
  userId: string;
  partnerId: string;
  title: string;
  description?: string;
  emoji?: string;
  metadata?: any;
  createdAt: any;
}

const MOMENTS_COLLECTION = 'moments';

/**
 * Add a new moment to the shared timeline
 */
export async function addMoment(
  partnerId: string,
  moment: Omit<Moment, 'id' | 'partnerId' | 'userId' | 'createdAt'>
): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    await addDoc(collection(db, MOMENTS_COLLECTION), {
      ...moment,
      userId: currentUserId,
      partnerId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding moment:', error);
  }
}

/**
 * Subscribe to the shared moments timeline
 */
export function subscribeToMoments(
  partnerId: string,
  callback: (moments: Moment[]) => void
): () => void {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return () => {};

  const q = query(
    collection(db, MOMENTS_COLLECTION),
    or(
      and(where('userId', '==', currentUserId), where('partnerId', '==', partnerId)),
      and(where('userId', '==', partnerId), where('partnerId', '==', currentUserId))
    ),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const moments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moment));
    callback(moments);
  });
}
