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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back
        </Link>
        <p className="home-label">Memories & Magic</p>
        <h1 className="home-title" style={{ fontSize: '28px' }}>
          Your <em>journey</em> <span>✨</span>
        </h1>
      </div>

      <div className="timeline-section">
        {loading ? (
          <ListSkeleton count={4} variant="list" />
        ) : messages.length > 0 ? (
          <div className="space-y-8 relative">
            {/* Main Timeline Line */}
            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#E8A0A0]/40 via-[#C9B8D8]/40 to-transparent rounded-full" />

            {messages.map((message, index) => (
              <div key={message.id} className="relative pl-12 animation-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Timeline Point */}
                <div 
                  className={`absolute left-4 top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-transform duration-300 hover:scale-150 ${
                    message.status === 'opened' ? 'bg-[#E8A0A0]' : 
                    message.status === 'available' ? 'bg-[#C9B8D8]' : 'bg-gray-200'
                  }`}
                />

                <div className="timeline-card">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-serif text-xl text-[#3D2B3D] leading-tight flex items-center gap-2">
                      {message.title} {message.emoji}
                    </h3>
                    <span className={`timeline-badge ${getBadgeClass(message.status)}`}>
                      {getBadgeLabel(message.status, message.deliveryType)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-lg">
                      {message.type === 'text' ? '📝' : message.type === 'voice' ? '🎙️' : '🎬'}
                    </div>
                    <p className="font-medium tracking-wide uppercase opacity-80">{formatMeta(message)}</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="h-1 flex-1 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          message.status === 'opened' ? 'w-full bg-[#E8A0A0]' : 
                          message.status === 'available' ? 'w-2/3 bg-[#C9B8D8]' : 'w-1/3 bg-gray-200'
                        }`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state py-20 bg-white/40 rounded-[40px] border border-white/60 backdrop-blur-sm">
            <div className="w-20 h-20 bg-[#E8A0A0]/10 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto animate-bounce-slow">
              📭
            </div>
            <p className="empty-state-text text-[#3D2B3D] font-serif text-xl mb-2">No letters in the wind...</p>
            <p className="text-sm text-[#7A5C7A]/60 max-w-[200px] mx-auto mb-8">Send your first message to start your romantic history</p>
            <Link href="/create" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#E8A0A0] to-[#C9B8D8] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">
              Write a Message
            </Link>
          </div>
        )}
      </div>

      <BottomNav activeTab="scheduled" />
    </div>
  );
}
