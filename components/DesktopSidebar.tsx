"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Plus,
  Clock,
  Gamepad2,
  User,
  Heart,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/firebase";

interface DesktopSidebarProps {
  partnerName?: string;
  partnerAvatar?: string;
  partnerOnline?: boolean;
  notificationCount?: number;
}

const NAV_ITEMS = [
  { href: "/inbox", icon: Mail, label: "Love Letters" },
  { href: "/create", icon: Plus, label: "Compose" },
  { href: "/scheduled", icon: Clock, label: "Scheduled" },
  { href: "/games", icon: Gamepad2, label: "Games" },
  { href: "/moments", icon: Heart, label: "Our Story" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function DesktopSidebar({
  partnerName = "Amara",
  partnerAvatar,
  partnerOnline = true,
  notificationCount = 0,
}: DesktopSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div className="px-2 mb-6">
        <h1 className="sidebar-logo">Habibty</h1>
        <p className="sidebar-sub">حبيبتي — For My Love</p>
      </div>

      {/* Partner Card */}
      <div className="sidebar-partner">
        <div className="relative">
          {partnerAvatar ? (
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-10 h-10 rounded-xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-200 to-lavender-200 flex items-center justify-center text-lg">
              💕
            </div>
          )}
          {partnerOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{partnerName}</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Online
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.href === "/inbox" && notificationCount > 0 && (
                <span className="sidebar-badge">{notificationCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto pt-4 border-t border-rose-100/30">
        <button
          onClick={signOut}
          className="sidebar-nav-item text-red-400 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
