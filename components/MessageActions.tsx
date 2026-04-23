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
  const [showReplyInput, setShowReplyInput] = useState(false);

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
        setShowReplyInput(false);
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
    <div className="message-actions-panel">
      <style>{`
        .message-actions-panel {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(232, 160, 160, 0.2);
        }

        .actions-section {
          margin-bottom: 20px;
        }

        .actions-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #C9B8D8;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .reaction-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .reaction-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid rgba(232, 160, 160, 0.3);
          background: white;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reaction-btn:hover {
          transform: scale(1.1);
          border-color: #E8A0A0;
        }

        .reaction-btn.selected {
          background: linear-gradient(135deg, #E8A0A0, #F2C4CE);
          border-color: #E8A0A0;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(232, 160, 160, 0.4);
        }

        .reply-section {
          margin-top: 20px;
        }

        .reply-input-wrapper {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .reply-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 20px;
          border: 1px solid rgba(232, 160, 160, 0.3);
          background: rgba(247, 232, 238, 0.5);
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #3D2B3D;
          outline: none;
          transition: all 0.2s;
        }

        .reply-input:focus {
          border-color: #E8A0A0;
          background: rgba(247, 232, 238, 0.8);
        }

        .reply-send-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reply-send-btn:hover {
          transform: scale(1.08);
        }

        .reply-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .show-reply-btn {
          width: 100%;
          padding: 12px;
          border-radius: 16px;
          border: 1px dashed rgba(232, 160, 160, 0.5);
          background: transparent;
          color: #7A5C7A;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .show-reply-btn:hover {
          background: rgba(232, 160, 160, 0.1);
          border-color: #E8A0A0;
        }

        .play-together-btn {
          width: 100%;
          padding: 14px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(135deg, #C9B8D8, #E8A0A0);
          color: white;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }

        .play-together-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(201, 184, 216, 0.4);
        }
      `}</style>

      {/* Reactions Section */}
      <div className="actions-section">
        <p className="actions-label">React</p>
        <div className="reaction-bar">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`reaction-btn ${
                userReaction?.emoji === emoji ? 'selected' : ''
              }`}
              onClick={() => handleReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Reply Section */}
      <div className="reply-section">
        <p className="actions-label">Reply</p>
        {showReplyInput ? (
          <form className="reply-input-wrapper" onSubmit={handleSendReply}>
            <input
              type="text"
              className="reply-input"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="reply-send-btn"
              disabled={sendingReply || !replyText.trim()}
            >
              {sendingReply ? '...' : '➤'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="show-reply-btn"
            onClick={() => setShowReplyInput(true)}
          >
            💬 Write a reply
          </button>
        )}
      </div>

      {/* Play Together Button */}
      <button
        type="button"
        className="play-together-btn"
        onClick={onPlayTogether}
      >
        🎮 Play Together
      </button>
    </div>
  );
}
