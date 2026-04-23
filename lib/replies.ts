import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Reply } from '@/types';

const REPLIES_COLLECTION = 'replies';

/**
 * Add a reply to a message
 */
export async function addReply(
  messageId: string,
  text: string,
  type: 'text' | 'voice' = 'text',
  mediaUrl?: string
): Promise<string> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    const userSnap = await getDoc(doc(db, 'users', currentUserId));
    const userData = userSnap.data();
    const userName = userData?.displayName || '';
    const userPhoto = userData?.photoURL || '';

    const reply: any = {
      userId: currentUserId,
      userName,
      userPhoto,
      text,
      type,
      createdAt: Date.now(),
    };

    if (mediaUrl) reply.mediaUrl = mediaUrl;

    const docRef = await addDoc(
      collection(db, 'messages', messageId, REPLIES_COLLECTION),
      reply
    );

    // Notify the other person
    const msgSnap = await getDoc(doc(db, 'messages', messageId));
    if (msgSnap.exists()) {
      const msgData = msgSnap.data();
      const targetUid = msgData.senderId === currentUserId ? msgData.receiverId : msgData.senderId;
      const { sendNotification } = await import('./notifications');
      const { addMoment } = await import('./moments');

      await sendNotification(targetUid, {
        type: 'reply',
        fromUid: currentUserId,
        fromName: userName,
        refId: messageId,
        meta: text.substring(0, 30),
      });

      await addMoment(targetUid, {
        type: 'reply_added',
        title: 'Replied to a letter',
        description: userName + ': ' + (text.length > 30 ? text.substring(0, 30) + '...' : text),
        emoji: '💬',
        metadata: { messageId }
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error adding reply:', error);
    throw error;
  }
}

/**
 * Update a reply
 */
export async function updateReply(
  messageId: string,
  replyId: string,
  data: Partial<Reply>
): Promise<void> {
  try {
    await updateDoc(
      doc(db, 'messages', messageId, REPLIES_COLLECTION, replyId),
      data
    );
  } catch (error) {
    console.error('Error updating reply:', error);
    throw error;
  }
}

/**
 * Delete a reply
 */
export async function deleteReply(
  messageId: string,
  replyId: string
): Promise<void> {
  try {
    await deleteDoc(
      doc(db, 'messages', messageId, REPLIES_COLLECTION, replyId)
    );
  } catch (error) {
    console.error('Error deleting reply:', error);
    throw error;
  }
}

/**
 * Subscribe to replies for a message in real-time
 */
export function subscribeToReplies(
  messageId: string,
  callback: (replies: Reply[]) => void
): () => void {
  const q = query(
    collection(db, 'messages', messageId, REPLIES_COLLECTION),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const replies: Reply[] = [];
    snapshot.docs.forEach((doc) => {
      replies.push({ id: doc.id, ...doc.data() } as unknown as Reply);
    });
    callback(replies);
  });
}
