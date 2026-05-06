'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import MediaPlayer from '@/components/MediaPlayer';
import { addMessage } from '@/lib/messages';
import { MessageType, DeliveryType, UnlockConditionType, Message } from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { MediaSkeleton } from '@/components/skeleton';
import { useHeader } from '@/lib/HeaderContext';
import NotificationBell from '@/components/NotificationBell';

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
  const [isSurprise, setIsSurprise] = useState(false);
  const [unlockType, setUnlockType] = useState<UnlockConditionType>('manual');
  const [unlockLocation, setUnlockLocation] = useState<Message['unlockLocation']>(undefined);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);

      showToast(`${file.name} selected! ✨`);
      if (!title.trim()) {
        setTitle(`A ${type} message`);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

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

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3) return;
    setIsSearchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setLocationResults(data.slice(0, 5));
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

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
      if (type !== 'text' && !selectedFile) {
        showToast(`Please select a ${type} file 💕`);
        return;
      }
      if (!partnerId) {
        showToast('You need to pair with your partner first 💛');
        router.push('/pair');
        return;
      }

      setSending(true);

      try {
        let mediaUrl = '';
        if (selectedFile) {
          showToast(`Uploading ${type}... 📤`);
          const cloudinaryRes = await uploadToCloudinary(
            selectedFile, 
            type === 'voice' ? 'audio' : 'video',
            (p) => setUploadProgress(p.percentage)
          );
          mediaUrl = cloudinaryRes.secureUrl;
        }

        const scheduledFor =
          deliveryType === 'scheduled' && deliveryDate
            ? new Date(deliveryDate).toISOString()
            : null;

        const finalUnlockType = deliveryType === 'scheduled' ? 'time' : unlockType;

        const emoji =
          type === 'text' ? '✍️' : type === 'voice' ? '🎙️' : '🎬';

        await addMessage(
          {
            title: title.trim(),
            content: content.trim(),
            type,
            status: (deliveryType === 'immediate' && unlockType === 'manual') ? 'available' : 'locked',
            deliveryType,
            scheduledFor,
            unlockType: finalUnlockType,
            unlockLocation,
            emoji,
            mediaUrl,
            isDelivered: deliveryType === 'immediate',
            senderName,
            senderId: currentUserId,
            receiverId: partnerId,
            moods: selectedMoods,
            isSurprise,
            meta:
              type === 'voice'
                ? 'Voice note · 0:32'
                : type === 'video'
                ? 'Video message · 0:15'
                : undefined,
          },
          currentUserId,
          partnerId
        );

        // Notify partner
        const { sendNotification } = await import('@/lib/notifications');
        const { addMoment } = await import('@/lib/moments');

        await sendNotification(partnerId, {
          type: 'new_message',
          fromUid: currentUserId,
          fromName: senderName,
          refId: 'new', // or the new doc id
          meta: title.substring(0, 30),
        });

        await addMoment(partnerId, {
          type: 'message_sent',
          title: 'Sent a new letter',
          description: `"${title}" is waiting to be read.`,
          emoji: '💌',
        });
        
        showToast('Message sent 💌');
        setTimeout(() => router.push('/inbox'), 1000);
      } catch (error) {
        console.error('handleSubmit error:', error);
        showToast('Something went wrong 😢');
      } finally {
        setSending(false);
      }
    },
    [title, content, type, deliveryType, deliveryDate, selectedMoods, currentUserId, partnerId, router, showToast, selectedFile]
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

        {type !== 'text' && (
          <div className="form-group">
            <label className="form-label">Attach {type}</label>
            <div 
              className="media-upload-box"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={type === 'voice' ? 'audio/*' : 'video/*'}
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="file-info">
                  <span className="file-icon">{type === 'voice' ? '🎵' : '🎬'}</span>
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-change">Tap to change</span>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">➕</span>
                  <span>Tap to upload {type}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {mediaPreview && (
          <div className="form-group">
            <label className="form-label">Review your {type}</label>
            <MediaPlayer src={mediaPreview} type={type === 'voice' ? 'audio' : 'video'} />
            
            {sending && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress-container">
                <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                <span className="upload-progress-text">Uploading... {uploadProgress}%</span>
              </div>
            )}
          </div>
        )}

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
          <label className="form-label">Delivery & Unlock</label>
          <div className="flex gap-2 mb-3">
            <button 
              type="button"
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${unlockType === 'manual' ? 'bg-[#E8A0A0] text-white shadow-md' : 'bg-white/40 text-gray-500 border border-gray-100'}`}
              onClick={() => { setUnlockType('manual'); setDeliveryType('immediate'); }}
            >
              Anytime
            </button>
            <button 
              type="button"
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${deliveryType === 'scheduled' ? 'bg-[#E8A0A0] text-white shadow-md' : 'bg-white/40 text-gray-500 border border-gray-100'}`}
              onClick={() => { setDeliveryType('scheduled'); setUnlockType('time'); }}
            >
              📅 Date
            </button>
            <button 
              type="button"
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${unlockType === 'event' ? 'bg-[#E8A0A0] text-white shadow-md' : 'bg-white/40 text-gray-500 border border-gray-100'}`}
              onClick={() => { setUnlockType('event'); setDeliveryType('immediate'); }}
            >
              📍 Location
            </button>
          </div>

          {deliveryType === 'scheduled' && (
            <input
              type="datetime-local"
              className="form-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}

          {unlockType === 'event' && (
            <div className="animate-slide-down">
              <div 
                className="p-4 bg-white/60 border border-[#E8A0A0]/20 rounded-2xl flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#7A5C7A]">Unlock where?</span>
                  {unlockLocation ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">✓ Location Set</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">No area selected</span>
                  )}
                </div>
                
                <button 
                  type="button"
                  className="w-full py-3 bg-white border border-[#E8A0A0]/30 rounded-xl text-xs font-bold text-[#E8A0A0] hover:bg-[#E8A0A0]/10 transition-colors flex items-center justify-center gap-2"
                  onClick={() => {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      setUnlockLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        radius: 500, // 500m radius
                        name: 'Your current location'
                      });
                      showToast('Location captured! 📍');
                    }, () => showToast('Failed to get location 😢'));
                  }}
                >
                  📍 Use my current location
                </button>

                <div className="relative mt-2">
                  <input
                    type="text"
                    className="w-full p-3 bg-white/40 border border-gray-100 rounded-xl text-xs outline-none focus:border-[#E8A0A0]/40 transition-colors"
                    placeholder="Or search for a sentimental spot..."
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      searchLocation(e.target.value);
                    }}
                  />
                  {isSearchingLocation && (
                    <div className="absolute right-3 top-3">
                      <div className="w-4 h-4 border-2 border-[#E8A0A0]/40 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {locationResults.length > 0 && locationSearch && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border border-[#E8A0A0]/20 rounded-2xl shadow-[0_20px_50px_rgba(232,160,160,0.2)] z-[100] overflow-hidden animate-slide-up max-h-[280px] overflow-y-auto">
                      {locationResults.map((res: any, idx: number) => (
                        <div 
                          key={res.place_id}
                          className={`p-4 hover:bg-[#E8A0A0]/8 cursor-pointer transition-all active:bg-[#E8A0A0]/15 ${idx !== locationResults.length - 1 ? 'border-b border-gray-100/50' : ''}`}
                          onClick={() => {
                            setUnlockLocation({
                              lat: parseFloat(res.lat),
                              lng: parseFloat(res.lon),
                              radius: 500,
                              name: res.display_name.split(',')[0]
                            });
                            setLocationSearch('');
                            setLocationResults([]);
                            showToast(`${res.display_name.split(',')[0]} set! 📍`);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg mt-0.5">📍</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-[#3D2B3D] truncate">{res.display_name.split(',')[0]}</p>
                              <p className="text-[10px] text-[#7A5C7A]/70 truncate mt-0.5">{res.display_name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <p className="text-[10px] text-gray-400 italic text-center">Your partner must be within 500m of this spot to open the letter.</p>
              </div>
            </div>
          )}
        </div>

        <div className="form-group mb-6">
          <label className="form-label">Special options</label>
          <div 
            className={`type-option ${isSurprise ? 'selected' : ''}`}
            onClick={() => setIsSurprise(!isSurprise)}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: isSurprise ? 'rgba(232,160,160,0.1)' : 'rgba(255,255,255,0.4)', border: isSurprise ? '1px solid rgba(232,160,160,0.4)' : '1px solid rgba(232,160,160,0.15)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '20px' }}>🎁</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#3D2B3D' }}>Surprise Mode</p>
              <p style={{ margin: 0, fontSize: '11px', color: '#7A5C7A', opacity: 0.7 }}>Keep it a mystery until they click</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-all duration-300 relative ${isSurprise ? 'bg-[#E8A0A0]' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isSurprise ? 'translate-x-5' : ''}`} />
            </div>
          </div>
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

    </div>
  );
}