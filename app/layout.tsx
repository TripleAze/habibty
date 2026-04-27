import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💌 For You',
  description: 'A romantic message app for someone special',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habibty',
  },
  themeColor: '#E8A0A0',
};

import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import AppLifecycle from '@/components/AppLifecycle';
import AppHeader from '@/components/AppHeader';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

import { HeaderProvider } from '@/lib/HeaderContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${dmSans.variable}`} suppressHydrationWarning>
        <HeaderProvider>
          <AppLifecycle />
          <AppHeader />
          {children}
        </HeaderProvider>
      </body>
    </html>
  );
}
