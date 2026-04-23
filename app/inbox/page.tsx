'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { unlockDueMessages, updateMessageStatus } from '@/lib/messages';
import MessageCard from '@/components/MessageCard';
import RevealModal from '@/components/RevealModal';
import BottomNav from '@/components/BottomNav';
import { Message } from '@/types';
import { MessageCardSkeleton, ListSkeleton } from '@/components/skeleton';
import { subscribeToPresence, Presence, getPresenceStatusText } from '@/lib/presence';
import NotificationBell from '@/components/NotificationBell';
import { Suspense } from 'react';

function InboxInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');
  const [activeTab, setActiveTab] = useState<'available' | 'locked'>('available');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<Presence | null>(null);

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
          const { partnerId: pid } = userSnap.data();
          if (pid) {
            setPartnerId(pid);
            const partnerSnap = await getDoc(doc(db, 'users', pid));
            if (partnerSnap.exists()) {
              const p = partnerSnap.data();
              setPartnerName(p.displayName || 'your love');
              setPartnerPhoto(p.photoURL || null);
            }
            // Trigger auto-unlock for messages receiver is waiting for
            unlockDueMessages();
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
    if (!currentUserId || !partnerId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

      // Filter to only show messages from the active partner
      const filtered = data.filter(m => m.senderId === partnerId);
      
      filtered.sort((a, b) => {
        const t1 = (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : (a.createdAt as number);
        const t2 = (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : (b.createdAt as number);
        return t2 - t1;
      });
      setMessages(filtered);
      setLoading(false);

      // Auto-open message if 'open' param is present
      if (openId && !selectedMessage) {
        const msg = filtered.find(m => m.id === openId);
        if (msg) {
          setSelectedMessage(msg);
          setIsModalOpen(true);
          // Clear query param to avoid re-opening
          const newPath = window.location.pathname;
          window.history.replaceState({}, '', newPath);
        }
      }
    }, (error) => {
      console.error('Snapshot failed:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, partnerId, openId, selectedMessage]);

  // Subscribe to partner presence
  useEffect(() => {
    if (!partnerId) return;
    return subscribeToPresence(partnerId, (p) => setPartnerPresence(p));
  }, [partnerId]);

  const handleOpenMessage = useCallback((message: Message) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
    
    // Mark as opened in Firestore if it's currently just 'available'
    if (message.status === 'available') {
      updateMessageStatus(message.id, 'opened');
    }
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

        <div className="flex items-center gap-3">
          <NotificationBell />
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
            {partnerPresence && (
              <div className={`status-dot ${partnerPresence.status === 'online' ? 'online' : ''}`} title={getPresenceStatusText(partnerPresence)}>
                {partnerPresence.status === 'online' && <div className="status-dot-inner" />}
              </div>
            )}
          </div>
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
          <ListSkeleton count={4} variant="grid" />
        ) : (
          <div className="transition-opacity duration-300 opacity-100">
            {activeTab === 'available' ? (
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

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
        </div>
      </div>
    }>
      <InboxInternal />
    </Suspense>
  );
}