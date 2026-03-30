'use client';

import { MessageCardProps } from '@/types';

export default function MessageCard({
  title,
  emoji,
  status,
  deliveryTime,
  meta,
  onClick,
}: MessageCardProps) {
  const isLocked = status === 'locked';

  const getStatusLabel = () => {
    if (isLocked) {
      if (deliveryTime) {
        const date = new Date(deliveryTime);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = date.getDate();
        return `🔒 ${month} ${day}`;
      }
      return '🔒 Anytime';
    }
    return '✦ Open now';
  };

  return (
    <div
      className={`msg-card ${isLocked ? 'locked' : 'card-available'}`}
      onClick={isLocked ? undefined : onClick}
      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
    >
      <span className="card-icon">{emoji}</span>
      <p className="card-title">{title}</p>
      <span
        className={`card-status ${isLocked ? 'status-locked' : 'status-available'}`}
      >
        {getStatusLabel()}
      </span>
      {meta && <p className="card-meta">{meta}</p>}
    </div>
  );
}
