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
    message.scheduledFor &&
    new Date(message.scheduledFor).getTime() > currentTime;

  // We allow opening the modal for specific lock types (like location or anytime) 
  // so the user can see the unlock requirements or open it immediately.
  const canOpenModal = !isDelayedLocked || message.unlockType === 'event';

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
    if (message.unlockType === 'event') return '📍 Location Lock';
    return isDelayedLocked ? '🔒 Anytime' : '✦ Open now';
  };

  return (
    <div
      className={`msg-card ${isDelayedLocked ? 'locked' : 'card-available'}`}
      onClick={canOpenModal ? onClick : undefined}
      style={{ cursor: canOpenModal ? 'pointer' : 'not-allowed' }}
    >
      <span className="card-icon">
        {message.isSurprise && message.status !== 'opened' ? '🎁' : message.emoji || '💌'}
      </span>
      <p className="card-title">
        {message.isSurprise && message.status !== 'opened' ? 'A surprise for you...' : message.title}
      </p>
      <span
        className={`card-status ${isDelayedLocked ? 'status-locked' : 'status-available'}`}
      >
        {getStatusLabel()}
      </span>
      {(message.meta && (!message.isSurprise || message.status === 'opened')) && (
        <p className="card-meta">{message.meta}</p>
      )}
    </div>
  );
}
