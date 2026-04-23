import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💌 For You',
  description: 'A romantic message app for someone special',
};

import AppLifecycle from '@/components/AppLifecycle';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppLifecycle />
        {children}
      </body>
    </html>
  );
}
