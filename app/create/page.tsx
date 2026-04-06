'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import BottomNav from '@/components/BottomNav';
import { db, auth } from '@/lib/firebase';
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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MessageType>('text');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('immediate');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (!data.partnerId) {
          router.replace('/pair');
          return;
        }
        setPartnerId(data.partnerId);
      }
      setLoading(false);
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

      if (!partnerId) {
        showToast('You need to pair with someone first 💕');
        router.push('/pair');
        return;
      }

      if (!title.trim()) {
        showToast('Please add a title 💕');
        return;
      }

      if (type === 'text' && !content.trim()) {
        showToast('Please write a message 💕');
        return;
      }

      setSending(true);

      const scheduledFor =
        deliveryType === 'scheduled' && deliveryDate
          ? new Date(deliveryDate).getTime()
          : null;

      const emoji =
        type === 'text'
          ? '✍️'
          : type === 'voice'
          ? '🎙️'
          : '🎬';

      try {
        await addMessage({
          title: title.trim(),
          content: content.trim(),
          type,
          status: deliveryType === 'immediate' ? 'available' : 'locked',
          deliveryType,
          scheduledFor,
          isDelivered: deliveryType === 'immediate',
          toUid: partnerId,
          emoji,
          meta:
            type === 'voice'
              ? 'Voice note · 0:00'
              : type === 'video'
              ? 'Video message · 0:00'
              : undefined,
        });

        showToast('Message sent 💌');
        setTimeout(() => router.push('/inbox'), 1000);
      } catch (err: any) {
        console.error('FULL ERROR:', err);
        alert(err.message);
      } finally {
        setSending(false);
      }
    },
    [title, content, type, deliveryType, deliveryDate, partnerId, router, showToast]
  );

  return (
    <div className="app-container">
      <div className="create-header">
        <Link href="/" className="back-btn">
          ← Back
        </Link>
        <h1 className="create-title">
          Create a
          <br />
          <em>message</em>
        </h1>
      </div>

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
          disabled={sending}
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


