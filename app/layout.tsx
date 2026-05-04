import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FAD0DC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "💌 Habibty — For You",
  description: "A private romantic space for just the two of you",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Habibty",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import AppLifecycle from "@/components/AppLifecycle";
import AppHeader from "@/components/AppHeader";
import FloatingParticles from "@/components/FloatingParticles";
import DesktopSidebar from "@/components/DesktopSidebar";
import EnhancedBottomNav from "@/components/EnhancedBottomNav";
import { HeaderProvider } from "@/lib/HeaderContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${dmSans.variable}`}
        suppressHydrationWarning
      >
        <HeaderProvider>
          <AppLifecycle />
          <FloatingParticles />

          {/* Desktop Sidebar - hidden on mobile */}
          <DesktopSidebar />

          {/* Main Content Area */}
          <div className="app-container">
            <AppHeader />
            <main className="relative z-10">
              {children}
            </main>
          </div>

          {/* Mobile Bottom Nav - hidden on desktop */}
          <EnhancedBottomNav />
        </HeaderProvider>
      </body>
    </html>
  );
}
