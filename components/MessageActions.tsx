'use client';

import { useState, useCallback } from 'react';
import { REACTION_EMOJIS, addReaction, removeReaction } from '@/lib/reactions';
import { addReply } from '@/lib/replies';

interface MessageActionsProps {
  messageId: string;
  userReaction?: { emoji: string };
  onReactionChange: () => void;
  onReplySent: () => void;
  onPlayTogether: () => void;
}

export default function MessageActions({
  messageId,
  userReaction,
  onReactionChange,
  onReplySent,
  onPlayTogether,
}: MessageActionsProps) {
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const handleReaction = useCallback(
    async (emoji: string) => {
      try {
        if (userReaction?.emoji === emoji) {
          await removeReaction(messageId);
        } else {
          await addReaction(messageId, emoji);
        }
        onReactionChange();
      } catch (error) {
        console.error('Error toggling reaction:', error);
      }
    },
    [messageId, userReaction, onReactionChange]
  );

  const handleSendReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyText.trim()) return;

      setSendingReply(true);
      try {
        await addReply(messageId, replyText.trim());
        setReplyText('');
        onReplySent();
      } catch (error) {
        console.error('Error sending reply:', error);
      } finally {
        setSendingReply(false);
      }
    },
    [messageId, replyText, onReplySent]
  );

  return (
    <div className="msg-actions-root">
      <style>{`
        .msg-actions-root {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .msg-actions-label {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #C9B8D8;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .msg-reaction-list {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .msg-reaction-list::-webkit-scrollbar { display: none; }

        .msg-emoji-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1.5px solid rgba(232, 160, 160, 0.15);
          background: #FFF;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          flex-shrink: 0;
        }
        .msg-emoji-btn:hover {
          transform: scale(1.1);
          border-color: #E8A0A0;
        }
        .msg-emoji-btn.active {
          background: #FAD0DC;
          border-color: #E8A0A0;
          transform: scale(1.1);
        }

        .msg-reply-box {
          display: flex;
          gap: 10px;
          background: #F8F8F8;
          border-radius: 100px;
          padding: 6px;
          padding-left: 16px;
          border: 1px solid rgba(0,0,0,0.03);
        }
        .msg-reply-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 14px;
          color: #3D2B3D;
        }
        .msg-reply-send {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #E8A0A0;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .msg-reply-send:disabled { opacity: 0.5; }
      `}</style>

      <div>
        <p className="msg-actions-label">React</p>
        <div className="msg-reaction-list">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className={`msg-emoji-btn ${userReaction?.emoji === emoji ? 'active' : ''}`}
              onClick={() => handleReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="msg-actions-label">Reply</p>
        <form className="msg-reply-box" onSubmit={handleSendReply}>
          <input
            className="msg-reply-input"
            placeholder="Type a response..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <button className="msg-reply-send" disabled={sendingReply || !replyText.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
