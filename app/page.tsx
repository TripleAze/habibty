'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Splash from '@/components/Splash';
import MessageCard from '@/components/MessageCard';
import RevealModal from '@/components/RevealModal';
import BottomNav from '@/components/BottomNav';
import { getMessages, unlockDueMessages } from '@/lib/messages';
import { Message } from '@/types';

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'locked'>('available');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check for first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowSplash(false);
    }
  }, []);

  // Load messages and unlock due ones
  useEffect(() => {
    const loadMessages = async () => {
      await unlockDueMessages();
      const msgs = await getMessages();
      setMessages(msgs);
      setLoading(false);
    };

    loadMessages();

    // Check for unlocks every minute
    const interval = setInterval(loadMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleEnter = useCallback(() => {
    localStorage.setItem('hasVisited', 'true');
    setShowSplash(false);
  }, []);

  const handleOpenMessage = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);

    // Update status to opened if available
    if (message.status === 'available') {
      // In a real app, you'd update the status in Firestore here
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300);
  }, []);

  const availableMessages = messages.filter((m) => m.status !== 'locked');
  const lockedMessages = messages.filter((m) => m.status === 'locked');

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
                    status={message.status}
                    deliveryTime={message.deliveryTime}
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
                    status={message.status}
                    deliveryTime={message.deliveryTime}
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
