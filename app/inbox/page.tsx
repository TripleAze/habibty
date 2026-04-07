'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import MessageCard from '@/components/MessageCard';
import RevealModal from '@/components/RevealModal';
import BottomNav from '@/components/BottomNav';
import { Message } from '@/types';

export default function InboxPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'available' | 'locked'>('available');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');

  // Update "now" periodically so locked messages naturally unlock without refresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Check auth and get current user
  useEffect(() => {
    if (!auth) { setChecking(false); router.replace('/auth'); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
      } else {
        setCurrentUserId(user.uid);
        // Fetch partner info
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const partnerId = userSnap.data().partnerId;
          if (partnerId) {
            const partnerSnap = await getDoc(doc(db, 'users', partnerId));
            if (partnerSnap.exists()) {
              setPartnerName(partnerSnap.data().displayName || 'your love');
            }
          } else {
            // No partner - redirect to pairing page
            router.replace('/pair');
            return;
          }
        } else {
          // User doc doesn't exist - redirect to pair to create it
          router.replace('/pair');
          return;
        }
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  // Load messages from Firestore via listener - scoped to current user
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      data.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(data);
      if (loading) setLoading(false);
    }, (error) => {
      console.error('Snapshot failed:', error);
      if (loading) setLoading(false);
    });

    return () => unsubscribe();
  }, [loading, currentUserId]);

  const handleOpenMessage = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300);
  }, []);

  // Filter messages based on time
  const availableMessages = messages.filter((m) => {
    const scheduledTime = m.scheduledFor ? new Date(m.scheduledFor).getTime() : 0;
    return !m.scheduledFor || scheduledTime <= now;
  });

  const lockedMessages = messages.filter((m) => {
    const scheduledTime = m.scheduledFor ? new Date(m.scheduledFor).getTime() : 0;
    return m.scheduledFor && scheduledTime > now;
  });

  if (checking) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading your inbox... 💌</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="home-header">
        <p className="home-label">Your inbox</p>
        <h1 className="home-title">
          From {partnerName || 'your love'} <span>❤️</span>
        </h1>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          💌 Available
        </button>
        <button
          className={`tab ${activeTab === 'locked' ? 'active' : ''}`}
          onClick={() => setActiveTab('locked')}
        >
          🔒 Locked
        </button>
      </div>

      <div className="messages-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading messages... 💌</p>
          </div>
        ) : activeTab === 'available' ? (
          <>
            <div className="section-label">Ready to open</div>
            {availableMessages.length > 0 ? (
              <div className="cards-grid">
                {availableMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onClick={() => handleOpenMessage(message)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">💌</span>
                <p className="empty-state-text">No messages yet... check back soon! 🌸</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="section-label">Coming soon</div>
            {lockedMessages.length > 0 ? (
              <div className="cards-grid">
                {lockedMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🔓</span>
                <p className="empty-state-text">No locked messages. Everything is ready! ✨</p>
              </div>
            )}
          </>
        )}
      </div>

      <RevealModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        message={selectedMessage}
      />

      <BottomNav activeTab="inbox" />
    </div>
  );
}
