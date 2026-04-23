import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
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
  pairId: string; // Combined sorted IDs to avoid complex indices
  title: string;
  description?: string;
  emoji?: string;
  metadata?: any;
  createdAt: any;
}

const MOMENTS_COLLECTION = 'moments';

/**
 * Generate a deterministic ID for a pair of users
 */
function getPairId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Add a new moment to the shared timeline
 */
export async function addMoment(
  partnerId: string,
  moment: Omit<Moment, 'id' | 'partnerId' | 'userId' | 'createdAt' | 'pairId'>
): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return;

  try {
    await addDoc(collection(db, MOMENTS_COLLECTION), {
      ...moment,
      userId: currentUserId,
      partnerId,
      pairId: getPairId(currentUserId, partnerId),
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

  const pairId = getPairId(currentUserId, partnerId);

  // Simple query on pairId + createdAt
  // This still technically needs a composite index (pairId, createdAt),
  // BUT Firestore automatically suggests/allows this more easily than the OR query.
  // HOWEVER, we can even do it without any index if we just filter locally for a bit 
  // or use the most basic query.
  const q = query(
    collection(db, MOMENTS_COLLECTION),
    where('pairId', '==', pairId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    const moments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moment));
    callback(moments);
  }, (err) => {
    console.error('Moments subscription error:', err);
    // Fallback: query without orderBy and sort locally if index is missing
    const fallbackQ = query(
      collection(db, MOMENTS_COLLECTION),
      where('pairId', '==', pairId),
      limit(50)
    );
    onSnapshot(fallbackQ, (snap) => {
       const moments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Moment));
       moments.sort((a, b) => {
         const t1 = a.createdAt?.toDate?.()?.getTime() || 0;
         const t2 = b.createdAt?.toDate?.()?.getTime() || 0;
         return t2 - t1;
       });
       callback(moments);
    });
  });
}
