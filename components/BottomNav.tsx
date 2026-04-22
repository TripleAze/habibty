'use client';

import Link from 'next/link';
import { BottomNavProps } from '@/types';

export default function BottomNav({ activeTab }: BottomNavProps) {
  const stroke = (tab: string) => activeTab === tab ? '#E8A0A0' : '#C0A0B0';
  const fill   = (tab: string) => activeTab === tab ? '#E8A0A0' : '#C0A0B0';

  return (
    <nav className="bottom-nav group">
      {/* Desktop Logo Header */}
      <div className="hidden lg:flex items-center gap-4 px-6 pb-8 pt-4 w-full">
        <div className="nav-icon shrink-0">
          <span className="text-xl">🤍</span>
        </div>
        <span className="font-serif italic text-2xl text-[var(--ink)] opacity-0 lg:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Habibty
        </span>
      </div>

      <Link href="/inbox" className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}>
        <div className="nav-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke('inbox')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1z"/>
            <path d="M3 7l9 6 9-6"/>
          </svg>
        </div>
        <span className="nav-label">Inbox</span>
      </Link>

      <Link href="/create" className={`nav-item ${activeTab === 'create' ? 'active' : ''}`}>
        <div className="nav-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke('create')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <span className="nav-label">Create</span>
      </Link>

      <Link href="/games" className={`nav-item ${activeTab === 'games' ? 'active' : ''}`}>
        <div className="nav-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke('games')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 3l-4 4-4-4"/>
            <circle cx="9" cy="14" r="1.5" fill={fill('games')} stroke="none"/>
            <path d="M13 14h4M13 17h4"/>
          </svg>
        </div>
        <span className="nav-label">Games</span>
      </Link>

      <Link href="/scheduled" className={`nav-item ${activeTab === 'scheduled' ? 'active' : ''}`}>
        <div className="nav-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke('scheduled')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
        </div>
        <span className="nav-label">Sent</span>
      </Link>

      <Link href="/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
        <div className="nav-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke('profile')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </div>
        <span className="nav-label">Profile</span>
      </Link>
    </nav>
  );
}