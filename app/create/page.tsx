'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';
import { addMessage } from '@/lib/messages';
import { MessageType, DeliveryType } from '@/types';

const MOOD_CHIPS = [
  'Sad',
  'Lonely',
  "Can't sleep",
  'Proud',
  'Anxious',
  'Missing me',
  'Just because',
];

export default function CreatePage() {
  const router = useRouter();

  // Auth + pairing state
  const [currentUserId, setCurrentUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [checking, setChecking] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MessageType>('text');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('immediate');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  // Load current user and their partner
  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }
      setCurrentUserId(user.uid);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setPartnerId(data.partnerId || '');
          setSenderName(data.displayName || user.displayName || 'Unknown');
        } else {
          setSenderName(user.displayName || 'Unknown');
        }
      } catch (err) {
        console.error('Error fetching user doc:', err);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim()) {
        showToast('Please add a title 💕');
        return;
      }
      if (type === 'text' && !content.trim()) {
        showToast('Please write a message 💕');
        return;
      }
      if (!partnerId) {
        showToast('You need to pair with your partner first 💛');
        router.push('/pair');
        return;
      }

      setSending(true);

      const scheduledFor =
        deliveryType === 'scheduled' && deliveryDate
          ? new Date(deliveryDate).toISOString()
          : null;

      const emoji =
        type === 'text' ? '✍️' : type === 'voice' ? '🎙️' : '🎬';

      try {
        console.log('handleSubmit: Calling addMessage...');
        await addMessage(
          {
            title: title.trim(),
            content: content.trim(),
            type,
            status: deliveryType === 'immediate' ? 'available' : 'locked',
            deliveryType,
            scheduledFor,
            emoji,
            isDelivered: deliveryType === 'immediate',
            senderName,
            senderId: currentUserId,   // will be overwritten by addMessage param anyway
            receiverId: partnerId,     // will be overwritten by addMessage param anyway
            moods: selectedMoods,
            meta:
              type === 'voice'
                ? 'Voice note · 0:00'
                : type === 'video'
                ? 'Video message · 0:00'
                : undefined,
          },
          currentUserId,  // ← senderId
          partnerId       // ← receiverId (your partner sees this in their inbox)
        );

        console.log('handleSubmit: addMessage finished successfully');
        showToast('Message sent 💌');
        setTimeout(() => router.push('/inbox'), 1000);
      } catch (error) {
        console.error('handleSubmit: Error detected in addMessage:', error);
        showToast(`Error: ${error instanceof Error ? error.message : 'Unknown failure'}`);
      } finally {
        setSending(false);
      }
    },
    [title, content, type, deliveryType, deliveryDate, selectedMoods, currentUserId, partnerId, router, showToast]
  );

  if (checking) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading... 💌</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="create-header">
        <Link href="/inbox" className="back-btn">
          ← Back
        </Link>
        <h1 className="create-title">
          Create a
          <br />
          <em>message</em>
        </h1>
      </div>

      {!partnerId && (
        <div style={{
          margin: '0 20px 16px',
          padding: '12px 16px',
          background: 'rgba(232,160,160,0.15)',
          border: '1px solid rgba(232,160,160,0.3)',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#7A5C7A',
          textAlign: 'center',
        }}>
          ⚠️ You haven't paired with your partner yet.{' '}
          <Link href="/pair" style={{ color: '#E8A0A0', textDecoration: 'underline' }}>
            Pair now
          </Link>
        </div>
      )}

      <form className="form-body" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Open when…</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. you feel sad, it's our anniversary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Message type</label>
          <div className="type-selector">
            {(['text', 'voice', 'video'] as MessageType[]).map((t) => (
              <div
                key={t}
                className={`type-option ${type === t ? 'selected' : ''}`}
                onClick={() => setType(t)}
              >
                <span className="type-option-icon">
                  {t === 'text' && '✍️'}
                  {t === 'voice' && '🎙️'}
                  {t === 'video' && '🎬'}
                </span>
                <span className="type-option-label">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {type === 'text' && (
          <div className="form-group">
            <label className="form-label">Your message</label>
            <textarea
              className="form-textarea"
              placeholder="Write something beautiful…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Delivery</label>
          <select
            className="form-select"
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
          >
            <option value="immediate">Immediately available</option>
            <option value="scheduled">Schedule a date</option>
          </select>

          {deliveryType === 'scheduled' && (
            <input
              type="datetime-local"
              className="form-input"
              style={{ marginTop: '12px' }}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Mood tags</label>
          <div className="open-when-chips">
            {MOOD_CHIPS.map((mood) => (
              <button
                key={mood}
                type="button"
                className={`chip ${selectedMoods.includes(mood) ? 'selected' : ''}`}
                onClick={() => toggleMood(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn-send"
          disabled={sending || !partnerId}
          style={{ marginTop: '16px' }}
        >
          {sending ? 'Sending...' : 'Send 💌'}
        </button>
      </form>

      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      <BottomNav activeTab="create" />
    </div>
  );
}