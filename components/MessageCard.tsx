'use client';

import { MessageCardProps } from '@/types';

export default function MessageCard({
  message,
  onClick,
}: MessageCardProps) {
  const isLocked = message.status === 'locked';

  const getStatusLabel = () => {
    if (message.deliveryType === 'scheduled' && message.scheduledFor) {
      const date = new Date(message.scheduledFor);
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      return `🔒 ${month} ${day}`;
    }
    return isLocked ? '🔒 Anytime' : '✦ Open now';
  };

  return (
    <div
      className={`msg-card ${isLocked ? 'locked' : 'card-available'}`}
      onClick={isLocked ? undefined : onClick}
      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
    >
      <span className="card-icon">{message.emoji || '💌'}</span>
      <p className="card-title">{message.title}</p>
      <span
        className={`card-status ${isLocked ? 'status-locked' : 'status-available'}`}
      >
        {getStatusLabel()}
      </span>
      {message.meta && <p className="card-meta">{message.meta}</p>}
    </div>
  );
}
