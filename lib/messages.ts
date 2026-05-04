import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Message, MessageStatus } from '@/types';
import { useState, useEffect } from 'react';

const MESSAGES_COLLECTION = 'messages';

// In-memory fallback for when Firebase isn't configured
let localMessages: Message[] = getMockMessages();

/**
 * Hook to subscribe to messages in real-time
 */
export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setMessages(localMessages);
      setLoading(false);
      return;
    }

    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }

      if (!user) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Get partnerId first
      getDoc(doc(db, 'users', user.uid)).then((userSnap) => {
        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }
        
        const partnerId = userSnap.data()?.partnerId;
        if (!partnerId) {
          setMessages([]);
          setLoading(false);
          return;
        }

        // Subscribe to messages where I am receiver OR sender (to count them all)
        // Note: For the inbox, we usually only show received messages.
        // But for the stats, we need both.
        const q = query(
          collection(db, MESSAGES_COLLECTION),
          where('receiverId', '==', user.uid)
        );

        unsubscribeMessages = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Message[];

          // Filter by partnerId in JS
          const filtered = data.filter(m => m.senderId === partnerId);
          setMessages(filtered.sort((a, b) => b.createdAt - a.createdAt));
          setLoading(false);
        }, (error) => {
          console.error('Error fetching messages:', error);
          setMessages(localMessages);
          setLoading(false);
        });
      }).catch((error) => {
        console.error('Error getting partner:', error);
        setMessages(localMessages);
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, []);

  return { messages, loading };
}

export async function getMessages(): Promise<Message[]> {
  if (!isFirebaseConfigured) {
    console.log('Using local mock data');
    return localMessages;
  }

  try {
    const currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) return [];

    // Get current partnerId
    const userSnap = await getDoc(doc(db, 'users', currentUserId));
    const partnerId = userSnap.data()?.partnerId;
    if (!partnerId) return [];

    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('receiverId', '==', currentUserId)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
    
    // Filter by partnerId in JS for reliability/no-index needed
    const filtered = data.filter(m => m.senderId === partnerId);
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return localMessages;
  }
}

export async function getSentMessages(): Promise<Message[]> {
  if (!isFirebaseConfigured) {
    console.log('Using local mock data');
    return localMessages;
  }

  try {
    const currentUserId = auth?.currentUser?.uid;
    if (!currentUserId) return [];

    // Get current partnerId
    const userSnap = await getDoc(doc(db, 'users', currentUserId));
    const partnerId = userSnap.data()?.partnerId;
    if (!partnerId) return [];

    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('senderId', '==', currentUserId)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
    
    // Filter by partnerId in JS for reliability/no-index needed
    const filtered = data.filter(m => m.receiverId === partnerId);
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching sent messages:', error);
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
    localMessages = [newMessage, ...localMessages];
    return newMessage;
  }


  try {
    // Firestore does not allow 'undefined' values. Strip them out.
    const dataToSave = JSON.parse(JSON.stringify({
      ...message,
      senderId,
      receiverId,
      createdAt: Date.now(),
    }));

    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), dataToSave);
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

    // Trigger notification if it's the first time being opened
    if (status === 'opened') {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const { sendNotification } = await import('./notifications');
        const userSnap = await getDoc(doc(db, 'users', data.receiverId));
        const receiverName = userSnap.data()?.displayName || 'Someone';

        await sendNotification(data.senderId, {
          type: 'message_opened',
          fromUid: data.receiverId,
          fromName: receiverName,
          refId: messageId,
        });
      }
    }
  } catch (error) {
    console.error('Error updating message status:', error);
  }
}

export async function unlockDueMessages(): Promise<void> {
  const currentUserId = auth?.currentUser?.uid;
  if (!currentUserId || !isFirebaseConfigured) return;

  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'locked')
    );
    
    const snapshot = await getDocs(q);
    const now = Date.now();

    const updates = snapshot.docs
      .filter((doc) => {
        const data = doc.data();
        const scheduledTime = data.scheduledFor ? new Date(data.scheduledFor).getTime() : 0;
        return data.deliveryType === 'scheduled' && data.scheduledFor && scheduledTime <= now;
      })
      .map((doc) => updateDoc(doc.ref, { status: 'available' }));

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