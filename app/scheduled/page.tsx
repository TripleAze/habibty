'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import BottomNav from '@/components/BottomNav';
import { getSentMessages } from '@/lib/messages';
import { Message, MessageStatus } from '@/types';
import { auth } from '@/lib/firebase';
import { ListSkeleton } from '@/components/skeleton';

function getTimelineDotClass(status: MessageStatus): string {
  switch (status) {
    case 'opened':
      return 'opened';
    case 'available':
      return 'sent';
    default:
      return '';
  }
}

function getBadgeClass(status: MessageStatus): string {
  switch (status) {
    case 'opened':
      return 'badge-opened';
    case 'available':
      return 'badge-delivered';
    default:
      return 'badge-scheduled';
  }
}

function getBadgeLabel(status: MessageStatus, deliveryType: string): string {
  switch (status) {
    case 'opened':
      return '✓ Opened';
    case 'available':
      return '💌 Delivered';
    default:
      return deliveryType === 'scheduled' ? '⏰ Scheduled' : '⏰ Waiting';
  }
}

function formatMeta(message: Message): string {
  const typeLabel = message.type === 'text' ? 'Text' : message.type === 'voice' ? 'Voice note' : 'Video';

  if (message.status === 'available') {
    return `Delivered today · ${typeLabel}`;
  }

  if (message.status === 'opened') {
    const date = new Date(message.createdAt);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `Delivered ${month} ${day} · ${typeLabel}`;
  }

  if (message.deliveryType === 'scheduled' && message.scheduledFor) {
    const date = new Date(message.scheduledFor);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `Scheduled ${month} ${day} · ${typeLabel}`;
  }

  return `Anytime unlock · ${typeLabel}`;
}

export default function ScheduledPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/auth');
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (checking) return;
    const loadMessages = async () => {
      const msgs = await getSentMessages();
      setMessages(msgs);
      setLoading(false);
    };

    loadMessages();
  }, [checking]);

  if (checking) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading... 📬</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sched-header">
        <Link href="/" className="back-btn">
          ← Back
        </Link>
        <p className="home-label">Admin view</p>
        <h1 className="home-title" style={{ fontSize: '28px' }}>
          Your messages <span>📬</span>
        </h1>
      </div>

      <div className="timeline">
        {loading ? (
          <ListSkeleton count={4} variant="list" />
        ) : messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={message.id} className="timeline-item">
              <div className="timeline-line">
                <div
                  className={`timeline-dot ${getTimelineDotClass(message.status)}`}
                />
                {index < messages.length - 1 && (
                  <div
                    className="timeline-connector"
                    style={{
                      background:
                        index === messages.length - 2
                          ? 'transparent'
                          : undefined,
                    }}
                  />
                )}
              </div>
              <div className="timeline-content">
                <p className="tl-title">
                  {message.title} {message.emoji && message.emoji}
                </p>
                <p className="tl-meta">{formatMeta(message)}</p>
                <span className={`tl-badge ${getBadgeClass(message.status)}`}>
                  {getBadgeLabel(message.status, message.deliveryType)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-text">No messages sent yet... create one! 💕</p>
          </div>
        )}
      </div>

      <BottomNav activeTab="scheduled" />
    </div>
  );
}
