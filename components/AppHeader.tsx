'use client';

import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';

export default function AppHeader() {
  return (
    <header className="app-header">
      <Link href="/inbox" className="app-logo">
        <span className="text-lg">🤍</span>
        <span className="app-title">Habibty</span>
      </Link>
      <div className="app-header-actions">
        <NotificationBell />
      </div>
    </header>
  );
}
