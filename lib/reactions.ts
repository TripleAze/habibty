import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Reaction } from '@/types';

const REACTIONS_COLLECTION = 'reactions';

// Available reaction emojis
export const REACTION_EMOJIS = ['❤️', '😂', '😭', '🔥'];

/**
 * Add or update a reaction to a message
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    const userSnap = await getDoc(doc(db, 'users', currentUserId));
    const userData = userSnap.data();
    const userName = userData?.displayName || '';
    const userPhoto = userData?.photoURL || '';

    const reaction: Reaction = {
      userId: currentUserId,
      userName,
      userPhoto,
      emoji,
      createdAt: Date.now(),
    };

    await setDoc(
      doc(db, 'messages', messageId, REACTIONS_COLLECTION, currentUserId),
      reaction
    );

    // Notify the other person
    const msgSnap = await getDoc(doc(db, 'messages', messageId));
    if (msgSnap.exists()) {
      const msgData = msgSnap.data();
      const targetUid = msgData.senderId === currentUserId ? msgData.receiverId : msgData.senderId;
      const { sendNotification } = await import('./notifications');
      const { addMoment } = await import('./moments');

      await sendNotification(targetUid, {
        type: 'reaction',
        fromUid: currentUserId,
        fromName: userName,
        refId: messageId,
        meta: emoji,
      });

      await addMoment(targetUid, {
        type: 'reaction_added',
        title: `Reacted with ${emoji}`,
        description: `${userName} left a reaction on your letter.`,
        emoji: emoji,
        metadata: { messageId }
      });
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(messageId: string): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    await deleteDoc(
      doc(db, 'messages', messageId, REACTIONS_COLLECTION, currentUserId)
    );
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

/**
 * Subscribe to reactions for a message in real-time
 */
export function subscribeToReactions(
  messageId: string,
  callback: (reactions: Reaction[]) => void
): () => void {
  const q = query(
    collection(db, 'messages', messageId, REACTIONS_COLLECTION),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const reactions: Reaction[] = [];
    snapshot.docs.forEach((doc) => {
      reactions.push({ id: doc.id, ...doc.data() } as unknown as Reaction);
    });
    callback(reactions);
  });
}

/**
 * Get current user's reaction for a message
 */
export function getUserReaction(
  reactions: Reaction[],
  userId: string
): Reaction | undefined {
  return reactions.find((r) => r.userId === userId);
}

/**
 * Count reactions by emoji
 */
export function countReactionsByEmoji(
  reactions: Reaction[],
  emoji: string
): number {
  return reactions.filter((r) => r.emoji === emoji).length;
}
