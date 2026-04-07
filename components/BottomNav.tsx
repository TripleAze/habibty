'use client';

import Link from 'next/link';
import { BottomNavProps } from '@/types';

export default function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <Link
        href="/inbox"
        className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
      >
        <span className="nav-icon">💌</span>
        <span className="nav-label">Inbox</span>
      </Link>
      <Link
        href="/create"
        className={`nav-item ${activeTab === 'create' ? 'active' : ''}`}
      >
        <span className="nav-icon">✍️</span>
        <span className="nav-label">Create</span>
      </Link>
      <Link
        href="/scheduled"
        className={`nav-item ${activeTab === 'scheduled' ? 'active' : ''}`}
      >
        <span className="nav-icon">📬</span>
        <span className="nav-label">Sent</span>
      </Link>
      <Link
        href="/profile"
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Profile</span>
      </Link>
    </nav>
  );
}
