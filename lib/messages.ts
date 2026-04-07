import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Message, MessageStatus } from '@/types';

const MESSAGES_COLLECTION = 'messages';

// In-memory fallback for when Firebase isn't configured
let localMessages: Message[] = getMockMessages();

export async function getMessages(): Promise<Message[]> {
  if (!isFirebaseConfigured) {
    console.log('Using local mock data');
    return localMessages;
  }

  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return localMessages;
  }
}

export async function addMessage(
  message: Omit<Message, 'id' | 'createdAt'>,
  senderId: string,
  receiverId: string
): Promise<Message> {
  const newMessage: Message = {
    id: Math.random().toString(36).substr(2, 9),
    ...message,
    senderId,
    receiverId,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured) {
    console.log('Adding to local storage (Firebase not configured)');
    localMessages = [newMessage, ...localMessages];
    return newMessage;
  }

  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      ...message,
      senderId,
      receiverId,
      createdAt: Date.now(),
    });
    return { ...newMessage, id: docRef.id };
  } catch (error) {
    console.error('Error adding message to Firestore:', error);
    // Fallback to local so UI doesn't break
    localMessages = [newMessage, ...localMessages];
    return newMessage;
  }
}

export async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<void> {
  localMessages = localMessages.map((msg) =>
    msg.id === messageId ? { ...msg, status } : msg
  );

  if (!isFirebaseConfigured) return;

  try {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

export async function unlockDueMessages(): Promise<void> {
  try {
    const messages = await getMessages();
    const now = Date.now();

    const updates = messages
      .filter((msg) => {
        const scheduledTime = msg.scheduledFor
          ? new Date(msg.scheduledFor).getTime()
          : 0;
        return (
          msg.status === 'locked' &&
          msg.deliveryType === 'scheduled' &&
          msg.scheduledFor &&
          scheduledTime <= now
        );
      })
      .map((msg) => updateMessageStatus(msg.id, 'available'));

    await Promise.all(updates);
  } catch (error) {
    console.error('Error unlocking messages:', error);
  }
}

// Mock data — only used when Firebase is not configured
function getMockMessages(): Message[] {
  const now = Date.now();
  return [
    {
      id: '1',
      title: 'Open when you feel sad',
      content:
        "Hey you. I know today feels heavy, and that's okay. You don't have to be okay all the time. But I want you to know — you're not alone, not even a little bit. I'm thinking of you right now, and I love every version of you, especially the ones that need a quiet moment. You're going to be alright, I promise.",
      type: 'text',
      status: 'available',
      deliveryType: 'immediate',
      createdAt: now - 86400000,
      emoji: '🌧️',
      isDelivered: true,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '2',
      title: 'I miss you so much',
      content:
        "If you're reading this, you're probably thinking of me. Good. I'm thinking of you too — always. The distance is just distance. My heart is wherever you are.",
      type: 'text',
      status: 'available',
      deliveryType: 'immediate',
      createdAt: now - 172800000,
      emoji: '🌙',
      isDelivered: true,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '3',
      title: 'Good morning, love',
      content: '',
      type: 'voice',
      status: 'available',
      deliveryType: 'immediate',
      createdAt: now - 3600000,
      emoji: '☀️',
      meta: 'Voice note · 0:32',
      isDelivered: true,
      senderId: 'mock',
      receiverId: 'mock',
    },
  ];
}