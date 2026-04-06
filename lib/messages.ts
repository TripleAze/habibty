import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { Message, MessageStatus } from '@/types';

const MESSAGES_COLLECTION = 'messages';

export async function getCurrentUserPartnerId(): Promise<string | null> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId) return null;

  try {
    const userSnap = await getDoc(doc(db, 'users', currentUserId));
    if (userSnap.exists()) {
      return userSnap.data().partnerId || null;
    }
  } catch (error) {
    console.error('Error fetching partner ID:', error);
  }
  return null;
}

export async function getPartnerInfo(partnerId: string) {
  try {
    const userSnap = await getDoc(doc(db, 'users', partnerId));
    if (userSnap.exists()) {
      return userSnap.data();
    }
  } catch (error) {
    console.error('Error fetching partner info:', error);
  }
  return null;
}

// In-memory storage for development (fallback)
let localMessages: Message[] = getMockMessages();

export async function getMessages(): Promise<Message[]> {
  if (!isFirebaseConfigured) {
    console.log('Using local mock data');
    return localMessages;
  }

  try {
    const currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) {
      return [];
    }

    // Get messages sent to the current user (they are the receiver)
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('toUid', '==', currentUserId),
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
  message: Omit<Message, 'id' | 'createdAt'> & { toUid?: string }
): Promise<Message> {
  const currentUserId = auth?.currentUser?.uid;

  const newMessage: Message = {
    id: Math.random().toString(36).substr(2, 9),
    ...message,
    fromUid: message.fromUid || currentUserId,
    toUid: message.toUid || currentUserId,
    createdAt: Date.now(),
  };

  if (!isFirebaseConfigured) {
    console.log('Adding to local storage');
    localMessages = [newMessage, ...localMessages];
    return newMessage;
  }

  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      fromUid: newMessage.fromUid,
      toUid: newMessage.toUid,
      ...message,
      createdAt: Date.now(),
    });
    return {
      ...newMessage,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error adding message:', error);
    localMessages = [newMessage, ...localMessages];
    return newMessage;
  }
}

export async function updateMessageStatus(
  messageId: string,
  status: MessageStatus
): Promise<void> {
  // Update local state first
  localMessages = localMessages.map((msg) =>
    msg.id === messageId ? { ...msg, status } : msg
  );

  if (!isFirebaseConfigured) {
    return;
  }

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
      .filter(
        (msg) => {
          const scheduledTime = msg.scheduledFor ? new Date(msg.scheduledFor).getTime() : 0;
          return msg.status === 'locked' &&
                 msg.deliveryType === 'scheduled' &&
                 msg.scheduledFor &&
                 scheduledTime <= now;
        }
      )
      .map((msg) => updateMessageStatus(msg.id, 'available'));

    await Promise.all(updates);
  } catch (error) {
    console.error('Error unlocking messages:', error);
  }
}

// Mock data for development
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
    {
      id: '4',
      title: "Open when you're proud of yourself",
      content:
        "Look at you. Seriously. Do you ever stop and realize how incredibly far you've come? I've watched you grow and fight for things and show up even when you didn't feel like it. That matters. You matter. I'm so proud of you — always.",
      type: 'text',
      status: 'available',
      deliveryType: 'immediate',
      createdAt: now - 259200000,
      emoji: '🌟',
      isDelivered: true,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '5',
      title: "Open when you can't sleep",
      content: 'A soothing message for sleepless nights...',
      type: 'voice',
      status: 'locked',
      deliveryType: 'scheduled',
      scheduledFor: now + 604800000, // 1 week from now
      createdAt: now - 432000000,
      emoji: '🔒',
      isDelivered: false,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '6',
      title: 'Our 6 month anniversary',
      content: 'Happy anniversary my love!',
      type: 'text',
      status: 'locked',
      deliveryType: 'scheduled',
      scheduledFor: now + 1209600000, // 2 weeks from now
      createdAt: now - 604800000,
      emoji: '🔒',
      isDelivered: false,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '7',
      title: 'Open when you need a hug',
      content: 'Sending you the biggest virtual hug...',
      type: 'text',
      status: 'locked',
      deliveryType: 'scheduled',
      createdAt: now - 345600000,
      emoji: '🔒',
      isDelivered: false,
      senderId: 'mock',
      receiverId: 'mock',
    },
    {
      id: '8',
      title: 'Read this when you doubt yourself',
      content: 'You are capable of amazing things...',
      type: 'text',
      status: 'locked',
      deliveryType: 'scheduled',
      createdAt: now - 518400000,
      emoji: '🔒',
      isDelivered: false,
      senderId: 'mock',
      receiverId: 'mock',
    },
  ];
}
