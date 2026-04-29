'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { subscribeToPresence, Presence, getPresenceStatusText } from '@/lib/presence';
import { BottomNavProps } from '@/types';

export default function BottomNav({ activeTab }: BottomNavProps) {
  const stroke = (tab: string) => activeTab === tab ? '#E8A0A0' : '#C0A0B0';
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; photo: string | null } | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<Presence | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const { partnerId: pid } = userSnap.data();
          if (pid) {
            const pSnap = await getDoc(doc(db, 'users', pid));
            if (pSnap.exists()) {
              const pData = pSnap.data();
              setPartnerInfo({
                name: pData.displayName || 'Partner',
                photo: pData.photoURL || null
              });
            }
            subscribeToPresence(pid, (pres) => setPartnerPresence(pres));
          }
        }
      } catch (err) {
        console.error('Error fetching partner for nav:', err);
      }
    });
    return () => unsub();
  }, []);

  return (
    <nav className="bottom-nav">
      {/* Logo Section - shown on desktop only via CSS */}
      <div className="desktop-sidebar-logo">
        <Link href="/inbox" className="desktop-logo-link">
          <span className="desktop-logo-heart">🤍</span>
          <span className="desktop-logo-text">Habibty</span>
        </Link>
      </div>

      <div className="desktop-sidebar-divider" />

      <div className="nav-items-container font-sans">
        <Link href="/inbox" className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke('inbox')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1z"/><path d="M3 7l9 6 9-6"/>
          </svg>
          <span className="nav-label">Inbox</span>
        </Link>

        <Link href="/scheduled" className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke('sent')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
          <span className="nav-label">Sent Letters</span>
        </Link>

        <Link href="/games" className={`nav-item ${activeTab === 'games' ? 'active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke('games')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/><circle cx="9" cy="14" r="1.5"/><path d="M13 14h4M13 17h4"/>
          </svg>
          <span className="nav-label">Games Room</span>
        </Link>

        {/* Primary Action - styled differently per breakpoint via CSS */}
        <Link href="/create" className="nav-fab nav-item">
          <div className="nav-fab-inner">
            <span className="text-white text-base">✦</span>
            <span className="nav-fab-label">Write a letter</span>
          </div>
        </Link>

        <Link href="/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke('profile')} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span className="nav-label">My Profile</span>
        </Link>
      </div>

      {/* Presence Indicator - shown on desktop only via CSS */}
      {partnerInfo && (
        <div className="desktop-sidebar-presence">
          <div className="presence-avatar">
            {partnerInfo.photo ? (
              <Image
                src={partnerInfo.photo}
                alt={partnerInfo.name}
                fill
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#E8A0A0]/20 flex items-center justify-center text-[10px] text-[#E8A0A0] font-bold">
                {partnerInfo.name[0]}
              </div>
            )}
            {partnerPresence?.status === 'online' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            )}
          </div>
          <div className="presence-info overflow-hidden">
            <span className="presence-name truncate">{partnerInfo.name}</span>
            <span className="presence-status truncate">
              {partnerPresence ? getPresenceStatusText(partnerPresence) : 'Offline'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
