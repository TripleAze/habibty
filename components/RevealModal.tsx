'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RevealModalProps, Reaction, Reply } from '@/types';
import { getDistance } from '@/lib/location';
import { REACTION_EMOJIS, addReaction, removeReaction } from '@/lib/reactions';
import { addReply } from '@/lib/replies';
import MediaPlayer from './MediaPlayer'; // Still used for audio

type ModalPhase = 'content' | 'actions';

export default function RevealModal({ isOpen, onClose, message }: RevealModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<ModalPhase>('content');
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isFinishingTyping, setIsFinishingTyping] = useState(false);
  
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [distanceToUnlock, setDistanceToUnlock] = useState<number | null>(null);
  const [userReaction, setUserReaction] = useState<Reaction | undefined>();
  
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Video states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef<number>(0);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const typeText = useCallback((text: string) => {
    stopTyping();
    setDisplayedText('');
    setShowCursor(true);
    setIsFinishingTyping(false);
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
        const char = text[i - 1];
        const delay = ['.', '?', '!', '。', '！', '？'].includes(char) ? 180 : 35;
        typingTimeoutRef.current = setTimeout(tick, delay);
      } else {
        setShowCursor(false);
        setIsFinishingTyping(true);
        // Automatic phase transition after delay
        setTimeout(() => setPhase('actions'), 800);
      }
    };
    tick();
  }, [stopTyping]);

  useEffect(() => {
    if (isOpen && message) {
      setPhase('content');
      setReactions([]);
      setReplies([]);
      setUserReaction(undefined);
      setDisplayedText('');
      setShowReplyInput(false);
      setReplyText('');
      setShowAllReplies(false);

      if (message.type === 'text' && message.content) {
        typeText(message.content);
      } else {
        // For media, show hint immediately and transition after slight delay
        setIsFinishingTyping(true);
        setTimeout(() => setPhase('actions'), 1500);
      }
    }
    return () => stopTyping();
  }, [isOpen, message, typeText, stopTyping]);

  // Subscriptions logic
  useEffect(() => {
    if (!message || !isOpen) return;

    let unsubReactions: (() => void) | null = null;
    let unsubReplies: (() => void) | null = null;

    const setupSubscriptions = async () => {
      const { auth } = await import('@/lib/firebase');
      currentUserId.current = auth?.currentUser?.uid || null;

      const { subscribeToReactions } = await import('@/lib/reactions');
      const { subscribeToReplies } = await import('@/lib/replies');

      unsubReactions = subscribeToReactions(message.id, (fetched) => {
        setReactions(fetched);
        if (currentUserId.current) {
          setUserReaction(fetched.find(r => r.userId === currentUserId.current));
        }
      });

      unsubReplies = subscribeToReplies(message.id, (fetched) => {
        setReplies(fetched);
      });

      // Mark as opened
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

  // Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;

    if (phase === 'actions' && deltaY > 60) {
      setPhase('content');
    } else if (phase === 'content' && deltaY < -60) {
      setPhase('actions');
    }
  };

  // Video Controls Logic
  const handleVideoTap = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
    setShowVideoControls(true);
    resetControlsTimeout();
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isVideoPlaying) setShowVideoControls(false);
    }, 2500);
  };

  // Actions
  const handleReactionToggle = async (emoji: string) => {
    if (!message) return;
    try {
      if (userReaction?.emoji === emoji) {
        await removeReaction(message.id);
      } else {
        await addReaction(message.id, emoji);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await addReply(message.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    } catch (err) {
      console.error('Reply error:', err);
    } finally {
      setSendingReply(false);
    }
  };

  if (!message) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `Sent with love · ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
  };

  return (
    <>
      <style>{`
        .rev-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(41, 28, 41, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .rev-backdrop.open {
          opacity: 1;
          pointer-events: all;
        }

        /* Layer 1: Content Screen */
        .rev-content-screen {
          position: fixed;
          inset: 0;
          background: #ffffff;
          z-index: 201;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
          pointer-events: none;
        }
        .rev-backdrop.open .rev-content-screen {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }

        /* Header Pill */
        .rev-pill {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 0.5px solid rgba(232, 160, 160, 0.2);
          border-radius: 100px;
          padding: 6px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
          max-width: 70vw;
        }
        .rev-pill-emoji { font-size: 18px; }
        .rev-pill-divider { width: 1px; height: 12px; background: rgba(232, 160, 160, 0.3); }
        .rev-pill-title {
          font-family: var(--font-cormorant), serif;
          font-style: italic;
          font-size: 14px;
          color: #7A5C7A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Large Close Button */
        .rev-close {
          position: absolute;
          top: 14px;
          right: 16px;
          z-index: 10;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.07);
          border: none;
          color: rgba(61, 43, 61, 0.5);
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rev-close:hover { background: rgba(0, 0, 0, 0.12); }

        /* Scrollable Body */
        .rev-scroll-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 80px 28px 48px;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
        }
        .rev-scroll-body::-webkit-scrollbar { display: none; }
        
        .rev-scroll-inner {
          margin: auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-height: min-content;
        }

        .rev-text-wrap { max-width: 600px; width: 100%; text-align: center; }
        .rev-text {
          font-family: var(--font-cormorant), serif;
          font-size: 22px;
          font-weight: 300;
          line-height: 2.0;
          color: #4A3550;
          letter-spacing: 0.01em;
          white-space: pre-wrap;
        }
        .rev-cursor {
          display: inline-block;
          width: 3px;
          height: 22px;
          background: #E8A0A0;
          margin-left: 2px;
          vertical-align: middle;
          animation: rev-blink 0.8s step-end infinite;
        }
        @keyframes rev-blink { 50% { opacity: 0; } }

        /* Video Styles */
        .rev-video-wrap { position: relative; width: 100%; margin-bottom: 24px; }
        .rev-video {
          width: 100%;
          height: auto;
          max-height: 58vh;
          object-fit: contain;
          background: #000;
          border-radius: 14px;
          display: block;
        }
        .rev-video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .rev-video-overlay.visible { opacity: 1; }
        .rev-play-icon {
          width: 64px;
          height: 64px;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(8px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        }

        /* Swipe Hint */
        .rev-swipe-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 100;
        }
        .rev-swipe-hint.hide { opacity: 0; }
        .rev-hint-arrow { color: #E8A0A0; opacity: 0.6; font-size: 16px; display: block; animation: rev-bounce 1.8s ease-in-out infinite; }
        .rev-hint-text { font-family: var(--font-dm-sans), sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(122, 92, 122, 0.5); }
        @keyframes rev-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

        .rev-date-stamp { font-family: var(--font-cormorant), serif; font-style: italic; font-size: 12px; color: #C0A0A0; text-align: center; margin-top: 32px; width: 100%; }

        /* Layer 2: Actions Sheet */
        .rev-actions-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          z-index: 202;
          max-width: 520px;
          margin: 0 auto;
          border-radius: 22px 22px 0 0;
          box-shadow: 0 -12px 48px rgba(61, 43, 61, 0.14);
          padding: 0 20px 32px;
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.44s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
        }
        .rev-backdrop.open.phase-actions .rev-actions-sheet {
          transform: translateY(0);
          opacity: 1;
        }

        .rev-drag-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(201, 184, 216, 0.45); margin: 12px auto 16px; cursor: ns-resize; }

        .rev-reactions-thread { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; }
        .rev-reaction-chip { padding: 3px 9px; border-radius: 100px; background: rgba(247, 232, 238, 0.7); font-size: 15px; }

        .rev-replies-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #C9B8D8; margin-bottom: 8px; font-weight: 700; }
        .rev-reply-item { padding: 8px 12px; border-radius: 12px; background: rgba(247, 232, 238, 0.45); margin-bottom: 6px; display: flex; gap: 10px; align-items: flex-start; }
        .rev-reply-avatar { position: relative; width: 20px; height: 20px; border-radius: 50%; background: #E8A0A0; flex-shrink: 0; font-size: 9px; font-weight: bold; color: white; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .rev-reply-body { flex: 1; }
        .rev-reply-name { font-size: 11px; font-weight: 600; color: #3D2B3D; display: block; margin-bottom: 1px; }
        .rev-reply-text { font-size: 13px; color: #7A5C7A; line-height: 1.4; }
        .rev-more-replies { font-size: 11px; color: #E8A0A0; font-weight: 600; margin-bottom: 8px; cursor: pointer; }

        .rev-action-row { display: flex; align-items: center; gap: 8px; }
        .rev-emoji-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1.5px solid rgba(232, 160, 160, 0.25);
          background: rgba(247, 232, 238, 0.5);
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rev-emoji-btn.active { background: linear-gradient(135deg, #E8A0A0, #F2C4CE); border-color: #E8A0A0; color: white; }
        
        .rev-reply-toggle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(201, 184, 216, 0.12);
          border: 1.5px solid rgba(201, 184, 216, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rev-reply-toggle.active { background: #C9B8D8; }

        .rev-input-row { display: flex; gap: 8px; margin-top: 12px; animation: rev-slide-up-fade 0.22s ease-out; }
        @keyframes rev-slide-up-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        
        .rev-input { flex: 1; padding: 10px 16px; border-radius: 100px; border: 1px solid rgba(232, 160, 160, 0.3); background: rgba(247, 232, 238, 0.5); font-size: 14px; outline: none; transition: border-color 0.2s; }
        .rev-input:focus { border-color: #E8A0A0; }
        .rev-send { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #E8A0A0, #C9B8D8); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .rev-play-together {
          width: 100%;
          padding: 13px;
          border-radius: 100px;
          background: linear-gradient(135deg, #C9B8D8 0%, #E8A0A0 100%);
          color: white;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.02em;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(201, 184, 216, 0.35);
        }

        /* Desktop Behavior */
        @media (min-width: 768px) {
          .rev-content-screen {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.95);
            width: 480px;
            height: 80vh;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
          }
          .rev-backdrop.open .rev-content-screen {
            transform: translate(-50%, -50%) scale(1);
          }
          .rev-actions-sheet {
            bottom: 0;
            width: 480px;
          }
        }
      `}</style>

      <div 
        className={`rev-backdrop ${isOpen ? 'open' : ''} phase-${phase}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Layer 1: Content Screen */}
        <div className="rev-content-screen">
          <div className="rev-pill">
            <span className="rev-pill-emoji">{message.emoji || '💌'}</span>
            <div className="rev-pill-divider" />
            <span className="rev-pill-title">{message.title}</span>
          </div>

          <button className="rev-close" onClick={onClose}>✕</button>

          <div 
            className="rev-scroll-body"
            onClick={() => setPhase('actions')}
          >
            <div className="rev-scroll-inner">
              {message.type === 'text' ? (
                <div className="rev-text-wrap">
                  <p className="rev-text">
                    {displayedText}
                    {showCursor && <span className="rev-cursor" />}
                  </p>
                </div>
              ) : message.type === 'video' ? (
                <div className="rev-video-wrap">
                  <video 
                    ref={videoRef}
                    src={(message as any).mediaUrl} 
                    className="rev-video" 
                    onClick={(e) => { e.stopPropagation(); handleVideoTap(); }}
                    playsInline
                    autoPlay
                  />
                  <div className={`rev-video-overlay ${showVideoControls ? 'visible' : ''}`}>
                    <div className="rev-play-icon">
                      {isVideoPlaying ? '⏸' : '▶'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 20, width: '100%' }}>
                  <MediaPlayer src={(message as any).mediaUrl} type="audio" />
                </div>
              )}

              <div className="rev-date-stamp">
                {formatDate(message.createdAt)}
              </div>
            </div>
          </div>

          <div 
            className={`rev-swipe-hint ${isFinishingTyping && phase === 'content' ? '' : 'hide'}`}
            onClick={(e) => { e.stopPropagation(); setPhase('actions'); }}
          >
            <span className="rev-hint-arrow">↑</span>
            <span className="rev-hint-text">REACT & REPLY</span>
          </div>

          {/* Location Lock Screen */}
          {isLocationLocked && (
            <div 
              style={{
                position: 'absolute', inset: 0, background: '#ffffff', zIndex: 300,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 40, textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 20 }}>📍</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontSize: 24, marginBottom: 12 }}>A secret location awaits...</h2>
              <p style={{ color: '#7A5C7A', marginBottom: 24, fontSize: 14 }}>Locked until you are near <strong>{message.unlockLocation?.name || 'the secret spot'}</strong>.</p>
              <div style={{ background: '#FAD0DC', padding: '8px 16px', borderRadius: 100, fontSize: 13, color: '#E8A0A0', fontWeight: 'bold' }}>
                {distanceToUnlock}m away
              </div>
            </div>
          )}
        </div>

        {/* Layer 2: Actions Sheet */}
        <div className="rev-actions-sheet">
          <div className="rev-drag-handle" />

          {/* Reactions Thread */}
          {reactions.length > 0 && (
            <div className="rev-reactions-thread">
              {reactions.map((r, i) => (
                <span key={i} className="rev-reaction-chip">{r.emoji}</span>
              ))}
            </div>
          )}

          {/* Replies Thread */}
          {replies.length > 0 && (
            <div>
              <p className="rev-replies-label">Conversation</p>
              {(showAllReplies ? replies : replies.slice(-2)).map((reply) => (
                <div key={reply.id} className="rev-reply-item">
                  <div className="rev-reply-avatar">
                    {reply.userPhoto ? (
                      <Image src={reply.userPhoto} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      reply.userName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="rev-reply-body">
                    <span className="rev-reply-name">{reply.userName}</span>
                    {reply.type === 'voice' && reply.mediaUrl ? (
                      <MediaPlayer src={reply.mediaUrl} type="audio" />
                    ) : (
                      <p className="rev-reply-text">{reply.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {replies.length > 2 && !showAllReplies && (
                <p className="rev-more-replies" onClick={() => setShowAllReplies(true)}>
                  + {replies.length - 2} more replies
                </p>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="rev-action-row">
            {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
              <button
                key={emoji}
                className={`rev-emoji-btn ${userReaction?.emoji === emoji ? 'active' : ''}`}
                onClick={() => handleReactionToggle(emoji)}
              >
                {emoji}
              </button>
            ))}
            <button 
              className={`rev-reply-toggle ${showReplyInput ? 'active' : ''}`}
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showReplyInput ? '#fff' : '#7A5C7A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Reply Input Row */}
          {showReplyInput && (
            <form className="rev-input-row" onSubmit={handleSendReply}>
              <input 
                className="rev-input"
                placeholder="Type a response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
              />
              <button className="rev-send" disabled={sendingReply || !replyText.trim()}>
                {sendingReply ? '...' : '➤'}
              </button>
            </form>
          )}

          {/* Play Together */}
          <button className="rev-play-together" onClick={() => {
            onClose();
            setTimeout(() => router.push('/games'), 300);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m7-2h2m-1-1v2"/>
            </svg>
            Play Together
          </button>
        </div>
      </div>
    </>
  );
}