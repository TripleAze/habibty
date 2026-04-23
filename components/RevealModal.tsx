'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RevealModalProps } from '@/types';
import MediaPlayer from './MediaPlayer';
import MessageActions from './MessageActions';

export default function RevealModal({ isOpen, onClose, message }: RevealModalProps) {
  const router = useRouter();
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [reactions, setReactions] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [userReaction, setUserReaction] = useState<any | undefined>();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);
  const currentUserId = useRef<string | null>(null);

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
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setDisplayedText(text.substring(0, i));
        i++;
        typingTimeoutRef.current = setTimeout(tick, 22);
        // Auto-scroll as text types
        if (textScrollRef.current) {
          textScrollRef.current.scrollTop = textScrollRef.current.scrollHeight;
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
        .reveal-card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          width: 100%;
          max-width: 520px;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          transform: translateY(40px);
          transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 -8px 48px rgba(61,43,61,0.18);
          overflow: hidden;
        }
        .reveal-overlay.open .reveal-card {
          transform: translateY(0);
        }
        .reveal-card-header {
          padding: 24px 24px 0;
          text-align: center;
          flex-shrink: 0;
        }
        .reveal-drag-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: rgba(201,184,216,0.4);
          margin: 0 auto 20px;
        }
        .reveal-envelope {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
          animation: openEnvelope 0.7s ease both;
        }
        @keyframes openEnvelope {
          0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(4deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .reveal-from {
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #E8A0A0;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .reveal-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: #3D2B3D;
          margin-bottom: 16px;
          line-height: 1.3;
        }
        .reveal-divider {
          width: 32px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E8A0A0, transparent);
          margin: 0 auto 0;
        }
        .reveal-scroll-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          -webkit-overflow-scrolling: touch;
        }
        .reveal-scroll-body::-webkit-scrollbar { width: 3px; }
        .reveal-scroll-body::-webkit-scrollbar-thumb {
          background: rgba(232,160,160,0.3);
          border-radius: 2px;
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
          flex-shrink: 0;
        }
        .reveal-close:hover { background: #E8A0A0; color: white; }
        .reveal-voice { text-align: center; padding: 8px 0; }
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
        .play-btn:hover { transform: scale(1.08); }
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
        .reactions-preview {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(232, 160, 160, 0.15);
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
          margin-top: 16px;
        }
        .replies-label {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #C9B8D8;
          font-weight: 500;
          margin-bottom: 10px;
        }
        .reply-item {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(247, 232, 238, 0.4);
          margin-bottom: 8px;
        }
        .reply-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .reply-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: white;
          font-weight: 600;
        }
        .reply-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .reply-author {
          font-size: 12px;
          font-weight: 500;
          color: #3D2B3D;
        }
        .reply-text {
          font-size: 13px;
          color: #7A5C7A;
          line-height: 1.5;
        }
        .message-actions-wrapper {
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.4s ease;
          max-height: 0;
          overflow: hidden;
        }
        .message-actions-wrapper.visible {
          opacity: 1;
          transform: translateY(0);
          max-height: 500px;
          overflow: visible;
        }
      `}</style>

      <div className={`reveal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
        <div className="reveal-card" onClick={e => e.stopPropagation()}>

          {/* Header — fixed */}
          <div className="reveal-card-header">
            <div className="reveal-drag-handle" />
            <span className="reveal-envelope">{message.emoji || '💌'}</span>
            <p className="reveal-from">A message for you</p>
            <h2 className="reveal-title">{message.title}</h2>
            <div className="reveal-divider" />
          </div>

          {/* Body — scrollable */}
          <div className="reveal-scroll-body" ref={textScrollRef}>
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

          {/* Footer — fixed */}
          <div className="reveal-card-footer">
            <p className="reveal-date">
              {message.type === 'voice'
                ? message.meta || `Voice · ${formatDate(message.createdAt)}`
                : formatDate(message.createdAt)}
            </p>
            <button className="reveal-close" onClick={() => handleClose()}>✕</button>
          </div>

          {/* Actions Panel — slides up after message is read */}
          <div className={`message-actions-wrapper ${showActions ? 'visible' : ''}`}>
            <div className="reveal-scroll-body" style={{ borderTop: '1px solid rgba(232,160,160,0.1)' }}>
              {/* Reactions Preview */}
              {reactions.length > 0 && (
                <div className="reactions-preview">
                  {reactions.slice(0, 5).map((reaction) => (
                    <span key={reaction.userId} className="reaction-chip">
                      {reaction.emoji}
                    </span>
                  ))}
                  {reactions.length > 5 && (
                    <span className="reaction-chip" style={{ background: 'transparent', padding: '4px 0' }}>
                      +{reactions.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Replies Preview */}
              {replies.length > 0 && (
                <div className="replies-preview">
                  <p className="replies-label">Replies</p>
                  {replies.slice(0, 3).map((reply) => (
                    <div key={reply.id} className="reply-item">
                      <div className="reply-header">
                        {reply.userPhoto ? (
                          <img src={reply.userPhoto} alt="" className="reply-avatar" />
                        ) : (
                          <div className="reply-avatar">
                            {reply.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="reply-author">{reply.userName}</span>
                      </div>
                      <p className="reply-text">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Actions */}
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

        </div>
      </div>
    </>
  );
}