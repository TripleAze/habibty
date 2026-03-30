import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💌 For You',
  description: 'A romantic message app for someone special',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
