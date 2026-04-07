'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
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

  // Partner info
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(null);

  // Tick every minute so locked messages auto-unlock
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auth check + fetch partner info
  useEffect(() => {
    if (!auth) { setChecking(false); router.replace('/auth'); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      setCurrentUserId(user.uid);

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const { partnerId } = userSnap.data();
          if (partnerId) {
            const partnerSnap = await getDoc(doc(db, 'users', partnerId));
            if (partnerSnap.exists()) {
              const p = partnerSnap.data();
              setPartnerName(p.displayName || 'your love');
              setPartnerPhoto(p.photoURL || null);
            }
          } else {
            // Not paired yet — redirect to pair page
            router.replace('/pair');
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching partner:', err);
      }

      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  // Real-time messages listener scoped to current user as receiver
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
      setLoading(false);
    }, (error) => {
      console.error('Snapshot failed:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId]);

  const handleOpenMessage = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedMessage(null), 300);
  }, []);

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
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header with partner avatar */}
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Your inbox</p>
          <h1 className="home-title">
            From <em>{partnerName || 'your love'}</em>
          </h1>
        </div>

        <div className="partner-avatar-wrap">
          {partnerPhoto ? (
            <img
              src={partnerPhoto}
              alt={partnerName}
              className="partner-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="partner-avatar-fallback">
              {partnerName ? partnerName[0].toUpperCase() : '♡'}
            </div>
          )}
          <div className="partner-avatar-ring" />
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Available
        </button>
        <button
          className={`tab ${activeTab === 'locked' ? 'active' : ''}`}
          onClick={() => setActiveTab('locked')}
        >
          Locked
        </button>
      </div>

      {/* Messages */}
      <div className="messages-section">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
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
                    now={now}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">💌</span>
                <p className="empty-state-text">No messages yet… check back soon</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="section-label">Coming soon</div>
            {lockedMessages.length > 0 ? (
              <div className="cards-grid">
                {lockedMessages.map((message) => (
                  <MessageCard key={message.id} message={message} now={now} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🔓</span>
                <p className="empty-state-text">Nothing locked — everything is ready</p>
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