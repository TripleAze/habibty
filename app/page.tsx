'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Splash from '@/components/Splash';
import MessageCard from '@/components/MessageCard';
import RevealModal from '@/components/RevealModal';
import BottomNav from '@/components/BottomNav';
import { Message } from '@/types';

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'locked'>('available');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now()); // State to trigger re-renders for scheduled items

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowSplash(false);
    }
  }, []);

  // Update "now" periodically so locked messages naturally unlock without refresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load messages from Firestore via listener
  useEffect(() => {
    const q = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(data);
      if (loading) setLoading(false);
    });

    return () => unsubscribe();
  }, [loading]);

  const handleEnter = useCallback(() => {
    localStorage.setItem('hasVisited', 'true');
    setShowSplash(false);
  }, []);

  const handleOpenMessage = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300);
  }, []);

  const currentUserId = auth?.currentUser?.uid || 'anonymous';

  // Filter messages based on auth and time
  const myMessages = messages.filter(
    (m) => m.receiverId === currentUserId || m.receiverId === 'anonymous'
  );

  const availableMessages = myMessages.filter((m) => {
    // If no scheduled time or time passed, it's available
    return !m.scheduledFor || m.scheduledFor <= now;
  });

  const lockedMessages = myMessages.filter((m) => {
    return m.scheduledFor && m.scheduledFor > now;
  });

  if (showSplash) {
    return <Splash onEnter={handleEnter} />;
  }

  return (
    <div className="app-container">
      <div className="home-header">
        <p className="home-label">Your inbox</p>
        <h1 className="home-title">
          For you <span>❤️</span>
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
                    id={message.id}
                    title={message.title}
                    emoji={message.emoji || '💌'}
                    status="available"
                    scheduledFor={message.scheduledFor}
                    meta={message.meta}
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
                    id={message.id}
                    title={message.title}
                    emoji={message.emoji || '🔒'}
                    status="locked"
                    scheduledFor={message.scheduledFor}
                    meta={message.meta}
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
