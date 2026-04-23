'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RevealModalProps, Reaction, Reply } from '@/types';
import { getDistance } from '@/lib/location';
import MediaPlayer from './MediaPlayer';
import MessageActions from './MessageActions';

export default function RevealModal({ isOpen, onClose, message }: RevealModalProps) {
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [distanceToUnlock, setDistanceToUnlock] = useState<number | null>(null);
  const [userReaction, setUserReaction] = useState<any | undefined>();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUserId = useRef<string | null>(null);
  const userHasScrolledRef = useRef(false);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const stopWave = useCallback(() => setIsPlaying(false), []);

  const typeText = useCallback((text: string) => {
    stopTyping();
    setDisplayedText('');
    setShowCursor(true);
    userHasScrolledRef.current = false; // Reset scroll tracking
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
        // Variable typing speed: 35ms base, 180ms pause at punctuation
        const char = text[i - 1];
        const delay = ['.', '?', '!', '。', '！', '？'].includes(char) ? 180 : 35;
        typingTimeoutRef.current = setTimeout(tick, delay);
        // Auto-scroll only if user hasn't manually scrolled
        if (scrollRef.current && !userHasScrolledRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else {
        setShowCursor(false);
        // Show actions panel after typing completes
        setTimeout(() => setShowActions(true), 500);
      }
    };
    tick();
  }, [stopTyping]);

  useEffect(() => {
    if (isOpen && message) {
      setShowActions(false);
      setReactions([]);
      setReplies([]);
      setUserReaction(undefined);

      if (message.content && message.type === 'text') {
        typeText(message.content);
      } else {
        // For non-text messages, show actions immediately
        setTimeout(() => setShowActions(true), 500);
      }
    }
    return () => { stopTyping(); stopWave(); };
  }, [isOpen, message, typeText, stopTyping, stopWave]);

  // Check location if locked by event
  useEffect(() => {
    if (!isOpen || !message || message.unlockType !== 'event' || !message.unlockLocation) {
      setIsLocationLocked(false);
      return;
    }

    const checkLocation = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = getDistance(
          pos.coords.latitude, 
          pos.coords.longitude, 
          message.unlockLocation!.lat, 
          message.unlockLocation!.lng
        );
        setDistanceToUnlock(Math.round(dist));
        if (dist > message.unlockLocation!.radius) {
          setIsLocationLocked(true);
        } else {
          setIsLocationLocked(false);
          // Auto-start typing if location just unlocked
          if (isLocationLocked && message.content && message.type === 'text') {
            typeText(message.content);
          }
        }
      }, (err) => {
        console.error('Location error:', err);
        setIsLocationLocked(true); // Fail-safe: stay locked if location denied
      });
    };

    checkLocation();
    const interval = setInterval(checkLocation, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [isOpen, message, isLocationLocked, typeText]);

  // Track user scroll to prevent auto-scroll fighting
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      // User has scrolled up if they're more than 50px from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      userHasScrolledRef.current = !isNearBottom;
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Subscribe to reactions and replies
  useEffect(() => {
    if (!message || !isOpen) return;

    let unsubReactions: (() => void) | null = null;
    let unsubReplies: (() => void) | null = null;

    const setupSubscriptions = async () => {
      // Get current user ID
      const { auth } = await import('@/lib/firebase');
      currentUserId.current = auth?.currentUser?.uid || null;

      const { subscribeToReactions: subReactions } = await import('@/lib/reactions');
      const { subscribeToReplies: subReplies } = await import('@/lib/replies');

      unsubReactions = subReactions(message.id, (fetchedReactions) => {
        setReactions(fetchedReactions);
        if (currentUserId.current) {
          setUserReaction(fetchedReactions.find(r => r.userId === currentUserId.current));
        }
      });

      unsubReplies = subReplies(message.id, (fetchedReplies) => {
        setReplies(fetchedReplies);
      });

      // Mark message as opened moment and update status if it's the first time
      if (message.status !== 'opened') {
        const { updateMessageStatus } = await import('@/lib/messages');
        const { addMoment } = await import('@/lib/moments');
        
        await updateMessageStatus(message.id, 'opened');

        const partnerId = message.senderId === currentUserId.current ? message.receiverId : message.senderId;
        await addMoment(partnerId, {
          type: 'message_opened',
          title: `Opened a letter`,
          description: `"${message.title}" was finally read.`,
          emoji: '📖'
        });
      }
    };

    setupSubscriptions();

    return () => {
      unsubReactions?.();
      unsubReplies?.();
    };
  }, [message?.id, isOpen]);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e && e.target !== e.currentTarget) return;
    stopTyping();
    stopWave();
    setShowActions(false);
    onClose();
  }, [onClose, stopTyping, stopWave]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `Sent with love · ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  if (!message) return null;

  const waveHeights = [6, 10, 18, 28, 22, 14, 30, 20, 12, 26, 16, 8, 24, 18, 10];

  return (
    <>
      <style>{`
        .reveal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(61,43,61,0.55);
          backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.35s ease;
          padding: 0;
        }
        .reveal-overlay.open {
          opacity: 1;
          pointer-events: all;
        }
        @media (min-width: 1024px) {
          .reveal-overlay {
            align-items: center;
            padding: 32px;
          }
          .reveal-card {
            border-radius: 28px;
            max-height: 75vh;
            height: auto;
          }
        }
        .reveal-card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          width: 100%;
          max-width: 520px;
          height: 88vh;
          display: flex;
          flex-direction: column;
          transform: translateY(40px);
          transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 -8px 48px rgba(61,43,61,0.18);
          overflow: hidden;
          position: relative;
        }
        .reveal-overlay.open .reveal-card {
          transform: translateY(0);
        }
        .reveal-card-header {
          padding: 16px 24px 10px;
          text-align: center;
          flex-shrink: 0;
        }
        .reveal-drag-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(201,184,216,0.4);
          margin: 0 auto 12px;
        }
        .reveal-envelope {
          font-size: 32px;
          display: block;
          margin-bottom: 6px;
          animation: openEnvelope 0.7s ease both;
        }
        @keyframes openEnvelope {
          0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(4deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .reveal-from {
          font-size: 8px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #E8A0A0;
          font-weight: 500;
          margin-bottom: 2px;
        }
        .reveal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 300;
          font-style: italic;
          color: #3D2B3D;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .reveal-divider {
          width: 32px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E8A0A0, transparent);
          margin: 0 auto 8px;
        }
        .reveal-scroll-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px 24px 40px;
          -webkit-overflow-scrolling: touch;
        }
        .reveal-scroll-area::-webkit-scrollbar { width: 3px; }
        .reveal-scroll-area::-webkit-scrollbar-thumb {
          background: rgba(232,160,160,0.3);
          border-radius: 2px;
        }
        .reveal-message-body {
          padding-top: 4px;
          margin-bottom: 40px;
        }
        .reveal-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          font-weight: 300;
          line-height: 1.85;
          color: #7A5C7A;
          letter-spacing: 0.01em;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 18px;
          background: #E8A0A0;
          margin-left: 2px;
          vertical-align: middle;
          animation: blink 0.8s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
        
        .reveal-card-footer {
          padding: 12px 24px 32px;
          flex-shrink: 0;
          border-top: 0.5px solid rgba(232,160,160,0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
        }
        .reveal-date {
          font-size: 11px;
          color: #C0A0A0;
          letter-spacing: 0.05em;
          font-style: italic;
          font-family: 'Cormorant Garamond', serif;
        }
        .reveal-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(247,232,238,0.8);
          border: none;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7A5C7A;
          transition: all 0.2s;
        }
        .reveal-close:hover { background: #E8A0A0; color: white; }
        
        .reveal-voice { text-align: center; padding: 20px 0; }
        .play-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 20px;
          color: white;
          transition: transform 0.2s;
          box-shadow: 0 6px 20px rgba(232,160,160,0.35);
        }
        .waveform {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 32px;
        }
        .wave-bar {
          width: 3px;
          background: linear-gradient(to top, #E8A0A0, #C9B8D8);
          border-radius: 2px;
          animation: wave 1.2s ease-in-out infinite;
        }
        @keyframes wave {
          0%,100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1); }
        }

        .actions-visibility-wrapper {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .actions-visibility-wrapper.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .reactions-preview {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(232, 160, 160, 0.08);
        }
        .reaction-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          background: rgba(247, 232, 238, 0.6);
          font-size: 14px;
        }
        .replies-preview {
          margin-top: 24px;
        }
        .replies-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C9B8D8;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .reply-item {
          padding: 12px;
          border-radius: 16px;
          background: rgba(247, 232, 238, 0.4);
          margin-bottom: 10px;
          border: 1px solid rgba(232, 160, 160, 0.05);
        }
        .reply-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .reply-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #E8A0A0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          color: white;
          overflow: hidden;
        }
        .reply-author {
          font-size: 11px;
          font-weight: 600;
          color: #3D2B3D;
          opacity: 0.7;
        }
        .reply-text {
          font-size: 14px;
          color: #7A5C7A;
          line-height: 1.5;
        }

        .location-lock-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }
      `}</style>

      <div className={`reveal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="reveal-card" onClick={e => e.stopPropagation()}>
          
          {/* Location Lock Screen */}
          {isLocationLocked && (
            <div className="location-lock-overlay">
              <div className="location-lock-content">
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
                <h3 className="reveal-title" style={{ fontStyle: 'italic' }}>A secret location awaits...</h3>
                <p style={{ fontSize: '14px', color: '#7A5C7A', marginBottom: '24px' }}>
                  This message is locked until you are near <strong>{message.unlockLocation?.name || 'a specific spot'}</strong>.
                </p>
                <div style={{ padding: '8px 16px', background: '#FAD0DC', borderRadius: '20px', fontSize: '11px', color: '#E8A0A0', fontWeight: 'bold' }}>
                  {distanceToUnlock !== null ? `You are ${distanceToUnlock}m away` : 'Checking distance...'}
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  style={{ marginTop: '24px', background: 'none', border: '1px solid #E8A0A0', color: '#E8A0A0', padding: '10px 20px', borderRadius: '100px', fontSize: '12px' }}
                >
                  Refresh Location
                </button>
              </div>
            </div>
          )}

          {/* Header — fixed */}
          <div className="reveal-card-header">
            <div className="reveal-drag-handle" />
            <span className="reveal-envelope">{message.emoji || '💌'}</span>
            <p className="reveal-from">A message for you</p>
            <h2 className="reveal-title">{message.title}</h2>
            <div className="reveal-divider" />
          </div>

          {/* Single Scrollable Body */}
          <div className="reveal-scroll-area" ref={scrollRef}>
            
            {/* Message Content */}
            <div className="reveal-message-body">
              {message.type === 'text' ? (
                <p className="reveal-text">
                  {displayedText}
                  {showCursor && displayedText.length < (message.content?.length ?? 0) && (
                    <span className="typing-cursor" />
                  )}
                </p>
              ) : (message as any).mediaUrl ? (
                <MediaPlayer
                  src={(message as any).mediaUrl}
                  type={message.type === 'voice' ? 'audio' : 'video'}
                />
              ) : (
                <div className="reveal-voice">
                  <button className="play-btn" onClick={() => setIsPlaying(p => !p)}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <div className="waveform">
                    {waveHeights.map((h, i) => (
                      <div key={i} className="wave-bar" style={{
                        height: h,
                        animationDelay: `${i * 0.08}s`,
                        animationPlayState: isPlaying ? 'running' : 'paused',
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Everything else follows naturally in the scroll */}
            <div className={`actions-visibility-wrapper ${showActions ? 'visible' : ''}`}>
              
              {/* Reactions List */}
              {reactions.length > 0 && (
                <div className="reactions-preview">
                  {reactions.slice(0, 8).map((reaction) => (
                    <span key={reaction.userId} className="reaction-chip">
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Conversation History */}
              {replies.length > 0 && (
                <div className="replies-preview">
                  <p className="replies-label">Conversation</p>
                  {replies.map((reply) => (
                    <div key={reply.id} className="reply-item">
                      <div className="reply-header">
                        <div className="reply-avatar">
                          {reply.userPhoto ? (
                            <img src={reply.userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            reply.userName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="reply-author">{reply.userName}</span>
                      </div>
                      <p className="reply-text">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Interaction Buttons */}
              <MessageActions
                messageId={message.id}
                userReaction={userReaction}
                onReactionChange={() => {}}
                onReplySent={() => {}}
                onPlayTogether={() => {
                  onClose();
                  setTimeout(() => router.push('/games'), 300);
                }}
              />
            </div>
          </div>

          {/* Footer — fixed */}
          <div className="reveal-card-footer">
            <p className="reveal-date">
              {message.type === 'voice'
                ? message.meta || `Voice · ${formatDate(message.createdAt)}`
                : formatDate(message.createdAt)}
            </p>
            <button className="reveal-close" onClick={() => handleClose()}>✕</button>
          </div>

        </div>
      </div>
    </>
  );
}