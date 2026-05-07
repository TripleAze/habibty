"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Gamepad2,
  Plus,
  Clock,
  User,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import Image from "next/image";
import { usePresence } from "@/lib/PresenceContext";

const NAV_ITEMS = [
  { href: "/inbox", icon: Mail, label: "Letters" },
  { href: "/games", icon: Gamepad2, label: "Play" },
  { href: "/create", icon: Plus, label: "Write", fab: true },
  { href: "/scheduled", icon: Clock, label: "Queue" },
  { href: "/profile", icon: User, label: "Us" },
];

export default function EnhancedBottomNav() {
  const pathname = usePathname();
  const [partnerInfo, setPartnerInfo] = useState<{ name: string; photo: string | null } | null>(null);
  const partnerPresence = usePresence();
  
  // Hide bottom nav on game sub-pages (but keep it on the main /games list)
  const isGameSubPage = pathname?.startsWith('/games/') && pathname !== '/games';

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setPartnerInfo(null);
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const { partnerId: pid } = userSnap.data();
          if (pid) {
            const pSnap = await getDoc(doc(db, 'users', pid));
            if (pSnap.exists()) {
              const pData = pSnap.data();
              // Optimize avatar URL for small display size
              const photo = pData.photoURL ? `${pData.photoURL}?tr=w-48,h-48,fo-auto,f-webp` : null;
              setPartnerInfo({
                name: pData.displayName || 'Partner',
                photo: photo
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching partner for nav:', err);
      }
    });
    return () => unsub();
  }, []);

  // Early return AFTER all hooks — safe per Rules of Hooks
  if (isGameSubPage) return null;

  return (
    <nav className="bottom-nav">
      <div className="nav-items-container">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-fab-wrapper"
              >
                <div className="nav-fab">
                  <div className="nav-fab-inner">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="nav-label fab-label">{item.label}</span>
                </div>
              </Link>
            );
          }

          // Special case for Profile tab to show partner avatar if available
          const isProfile = item.href === "/profile";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <div className="nav-icon relative">
                {isProfile && partnerInfo?.photo ? (
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-gray-200">
                    <Image 
                      src={partnerInfo.photo} 
                      alt={partnerInfo.name} 
                      width={24} 
                      height={24} 
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-rose-400" : "text-gray-400"}`}
                  />
                )}
                
                {isProfile && partnerPresence?.status === 'online' && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
