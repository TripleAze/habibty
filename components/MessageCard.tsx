'use client';

import { useEffect, useState } from 'react';
import { MessageCardProps } from '@/types';

export default function MessageCard({
  message,
  onClick,
  now,
}: MessageCardProps) {
  const currentTime = now || Date.now();
  
  // Calculate locked state dynamically
  const isDelayedLocked = 
    message.status === 'locked' && 
    message.deliveryType === 'scheduled' && 
    message.scheduledFor 
      ? new Date(message.scheduledFor).getTime() > currentTime
      : message.status === 'locked';

  const getStatusLabel = () => {
    if (message.deliveryType === 'scheduled' && message.scheduledFor) {
      if (isDelayedLocked) {
        const date = new Date(message.scheduledFor);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = date.getDate();
        return `🔒 ${month} ${day}`;
      }
      return '✦ Available now';
    }
    return isDelayedLocked ? '🔒 Anytime' : '✦ Open now';
  };

  return (
    <div
      className={`msg-card ${isDelayedLocked ? 'locked' : 'card-available'}`}
      onClick={isDelayedLocked ? undefined : onClick}
      style={{ cursor: isDelayedLocked ? 'not-allowed' : 'pointer' }}
    >
      <span className="card-icon">{message.emoji || '💌'}</span>
      <p className="card-title">{message.title}</p>
      <span
        className={`card-status ${isDelayedLocked ? 'status-locked' : 'status-available'}`}
      >
        {getStatusLabel()}
      </span>
      {message.meta && <p className="card-meta">{message.meta}</p>}
    </div>
  );
}
