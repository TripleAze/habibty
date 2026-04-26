'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { RevealModalProps, Reaction, Reply } from '@/types';
import { getDistance } from '@/lib/location';
import MessageActions from './MessageActions';

type ModalPhase = 'content' | 'actions';

export default function RevealModal({ isOpen, onClose, message }: RevealModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<ModalPhase>('content');
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isFinishingTyping, setIsFinishingTyping] = useState(false);
  
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [distanceToUnlock, setDistanceToUnlock] = useState<number | null>(null);
  const [userReaction, setUserReaction] = useState<any | undefined>();
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserId = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
        // Transition to actions phase after a short delay
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

      if (message.type === 'text' && message.content) {
        typeText(message.content);
      } else {
        // For media, wait 1.5s then show actions
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

  // Location logic
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
          if (isLocationLocked && message.content && message.type === 'text' && !displayedText) {
            typeText(message.content);
          }
        }
      }, () => setIsLocationLocked(true));
    };

    checkLocation();
    const interval = setInterval(checkLocation, 10000);
    return () => clearInterval(interval);
  }, [isOpen, message, isLocationLocked, typeText, displayedText]);

  if (!message) return null;

  return (
    <>
      <style>{`
        .rev-overlay {
          position: fixed;
          inset: 0;
          background: #fff;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .rev-overlay.open {
          opacity: 1;
          pointer-events: all;
        }
        
        /* Phase 1 Immersive Content */
        .rev-content-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rev-overlay.phase-actions .rev-content-wrap {
          transform: translateY(-80px);
        }

        .rev-text-container {
          padding: 0 48px;
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }
        .rev-text {
          font-family: var(--font-cormorant), serif;
          font-size: 22px;
          line-height: 2;
          color: #3D2B3D;
          white-space: pre-wrap;
        }
        .rev-cursor {
          display: inline-block;
          width: 2px;
          height: 20px;
          background: #E8A0A0;
          margin-left: 2px;
          vertical-align: middle;
          animation: rev-blink 0.8s step-end infinite;
        }
        @keyframes rev-blink { 50% { opacity: 0; } }

        .rev-media-container {
          width: 100%;
          background: #fff;
        }
        .rev-video {
          width: 100%;
          height: auto;
          max-height: 55vh;
          object-fit: cover;
          display: block;
        }
        .rev-audio-wrap {
          padding: 40px;
          text-align: center;
        }
        .rev-audio-play {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          color: white;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 10px 25px rgba(232, 160, 160, 0.4);
        }

        /* Floating Header Pill */
        .rev-header-pill {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border-radius: 100px;
          border: 1px solid rgba(232, 160, 160, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 2010;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 13px;
          color: #3D2B3D;
          white-space: nowrap;
        }

        .rev-close-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3D2B3D;
          font-size: 14px;
          z-index: 2010;
          cursor: pointer;
        }

        /* Swipe Hint */
        .rev-swipe-hint {
          position: absolute;
          bottom: 40px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: #C0A0A0;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.5s ease;
        }
        .rev-swipe-hint.show {
          opacity: 1;
          transform: translateY(0);
          animation: rev-nudge 2s ease-in-out infinite;
        }
        @keyframes rev-nudge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* Phase 2 Actions Panel */
        .rev-actions-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: #fff;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.08);
          z-index: 2020;
          transform: translateY(100%);
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          display: flex;
          flex-direction: column;
          padding: 20px 24px 32px;
        }
        .rev-overlay.phase-actions .rev-actions-panel {
          transform: translateY(0);
        }
        
        .rev-actions-handle {
          width: 32px;
          height: 4px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 2px;
          margin: 0 auto 20px;
        }

        .rev-play-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          color: white;
          border: none;
          border-radius: 100px;
          font-weight: 600;
          font-size: 14px;
          margin-top: auto;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(232, 160, 160, 0.3);
        }

        .rev-lock-screen {
          position: fixed;
          inset: 0;
          background: #fff;
          z-index: 3000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }
      `}</style>

      <div className={`rev-overlay ${isOpen ? 'open' : ''} phase-${phase}`}>
        <button className="rev-close-btn" onClick={onClose}>✕</button>
        
        <div className="rev-header-pill">
          <span>{message.emoji || '💌'}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{message.title}</span>
        </div>

        {isLocationLocked && (
          <div className="rev-lock-screen">
            <div style={{ fontSize: 48, marginBottom: 20 }}>📍</div>
            <h2 className="rev-title" style={{ fontSize: 24, marginBottom: 12 }}>A secret location awaits...</h2>
            <p style={{ color: '#7A5C7A', marginBottom: 24 }}>This letter is locked until you are near {message.unlockLocation?.name}</p>
            <div style={{ background: '#FAD0DC', padding: '8px 16px', borderRadius: 100, fontSize: 13, color: '#E8A0A0', fontWeight: 'bold' }}>
              {distanceToUnlock}m away
            </div>
          </div>
        )}

        <div className="rev-content-wrap">
          {message.type === 'text' ? (
            <div className="rev-text-container">
              <p className="rev-text">
                {displayedText}
                {showCursor && <span className="rev-cursor" />}
              </p>
            </div>
          ) : message.type === 'video' ? (
            <div className="rev-media-container">
              <video 
                ref={videoRef}
                src={(message as any).mediaUrl} 
                className="rev-video" 
                controls 
                autoPlay 
                playsInline
                disablePictureInPicture
              />
            </div>
          ) : (
            <div className="rev-audio-wrap">
              <button className="rev-audio-play">▶</button>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#C0A0A0' }}>
                {message.meta || 'Voice Note'}
              </div>
            </div>
          )}

          <div className={`rev-swipe-hint ${isFinishingTyping && phase === 'content' ? 'show' : ''}`}>
            ↑ Swipe up to react
          </div>
        </div>

        <div className="rev-actions-panel">
          <div className="rev-actions-handle" />
          
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
          
          <button className="rev-play-btn" onClick={() => {
            onClose();
            setTimeout(() => router.push('/games'), 300);
          }}>
            Play Together →
          </button>
        </div>
      </div>
    </>
  );
}