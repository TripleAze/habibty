'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import { useHeader } from '@/lib/HeaderContext';

export default function AppHeader() {
  const { isHidden } = useHeader();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isHidden) return null;

  return (
    <>
      <style>{`
        .app-header-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: calc(56px + env(safe-area-inset-top, 0px));
          padding-top: env(safe-area-inset-top, 0px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-left: 20px;
          padding-right: 20px;
          z-index: 1000;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0);
          backdrop-filter: blur(0);
          -webkit-backdrop-filter: blur(0);
          border-bottom: none;
        }
        
        .app-header-root.scrolled {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 0.5px solid rgba(232, 160, 160, 0.2);
        }

        .header-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
        }

        .header-heart {
          font-size: 18px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-title {
          font-family: var(--font-cormorant), serif;
          font-style: italic;
          font-size: 20px;
          font-weight: 400;
          color: #3D2B3D;
          letter-spacing: -0.01em;
        }

        .header-actions {
          display: flex;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .app-header-root {
            display: none;
          }
        }
      `}</style>

      <header className={`app-header-root ${isScrolled ? 'scrolled' : ''}`}>
        <Link href="/inbox" className="header-logo">
          <span className="header-heart">🤍</span>
          <span className="header-title">Habibty</span>
        </Link>
        <div className="header-actions">
          <NotificationBell />
        </div>
      </header>
    </>
  );
}
