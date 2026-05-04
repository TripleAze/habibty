'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { subscribeToPresence, Presence, getPresenceStatusText } from '@/lib/presence';
import { BottomNavProps } from '@/types';
import { Mail, Gamepad2, Plus, Clock, User } from 'lucide-react';

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
          <Mail size={20} stroke={stroke('inbox')} strokeWidth={1.8} />
          <span className="nav-label">Letters</span>
        </Link>

        <Link href="/games" className={`nav-item ${activeTab === 'games' ? 'active' : ''}`}>
          <Gamepad2 size={20} stroke={stroke('games')} strokeWidth={1.8} />
          <span className="nav-label">Play</span>
        </Link>

        <Link href="/create" className="nav-fab-wrapper">
          <div className="nav-fab">
            <div className="nav-fab-inner">
              <Plus size={24} color="white" strokeWidth={2.5} />
            </div>
            <span className="nav-label fab-label">Write</span>
          </div>
        </Link>

        <Link href="/scheduled" className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}>
          <Clock size={20} stroke={stroke('sent')} strokeWidth={1.8} />
          <span className="nav-label">Queue</span>
        </Link>

        <Link href="/profile" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
          <User size={20} stroke={stroke('profile')} strokeWidth={1.8} />
          <span className="nav-label">Us</span>
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
