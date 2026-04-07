'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { RevealModalProps } from '@/types';
import MediaPlayer from './MediaPlayer';

export default function RevealModal({ isOpen, onClose, message }: RevealModalProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  const stopWave = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const typeText = useCallback(
    (text: string) => {
      stopTyping();
      setDisplayedText('');
      setShowCursor(true);

      let i = 0;
      const tick = () => {
        if (i <= text.length) {
          setDisplayedText(text.substring(0, i));
          i++;
          typingTimeoutRef.current = setTimeout(tick, 28);
        } else {
          setShowCursor(false);
        }
      };
      tick();
    },
    [stopTyping]
  );

  useEffect(() => {
    if (isOpen && message) {
      if (message.content && message.type === 'text') {
        typeText(message.content);
      }
    }

    return () => {
      stopTyping();
      stopWave();
    };
  }, [isOpen, message, typeText, stopTyping, stopWave]);

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e && e.target !== e.currentTarget) return;
      stopTyping();
      stopWave();
      onClose();
    },
    [onClose, stopTyping, stopWave]
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `Sent with love · ${month} ${year}`;
  };

  if (!message) return null;

  const isVoice = message.type === 'voice';

  // Waveform bar heights for voice messages
  const waveHeights = [6, 10, 18, 28, 22, 14, 30, 20, 12, 26, 16, 8, 24, 18, 10];

  return (
    <div
      className={`reveal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleClose}
    >
      <div className="reveal-card" onClick={(e) => e.stopPropagation()}>
        <button className="reveal-close" onClick={() => handleClose()}>
          ✕
        </button>
        <span className="reveal-envelope">{message.emoji || '💌'}</span>
        <p className="reveal-from">A message for you</p>
        <h2 className="reveal-title">{message.title}</h2>
        <div className="reveal-divider" />

        {message.type === 'text' ? (
          <p className="reveal-text">
            {displayedText}
            {showCursor && displayedText.length < message.content.length && (
              <span className="typing-cursor" />
            )}
          </p>
        ) : message.mediaUrl ? (
          <MediaPlayer
            src={message.mediaUrl}
            type={message.type === 'voice' ? 'audio' : 'video'}
          />
        ) : (
          <div className="reveal-voice" style={{ display: 'block' }}>
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="waveform">
              {waveHeights.map((height, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    height: `${height}px`,
                    animationDelay: `${i * 0.08}s`,
                    animationPlayState: isPlaying ? 'running' : 'paused',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <p className="reveal-date">
          {isVoice
            ? message.meta || `Voice note · ${formatDate(message.createdAt)}`
            : formatDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
