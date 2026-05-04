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

const NAV_ITEMS = [
  { href: "/inbox", icon: Mail, label: "Letters" },
  { href: "/games", icon: Gamepad2, label: "Play" },
  { href: "/create", icon: Plus, label: "Write", fab: true },
  { href: "/scheduled", icon: Clock, label: "Queue" },
  { href: "/profile", icon: User, label: "Us" },
];

export default function EnhancedBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.fab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="nav-fab"
            >
              <div className="nav-fab-inner">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <div className="nav-icon">
              <Icon
                className={`w-5 h-5 ${isActive ? "text-rose-400" : "text-gray-400"}`}
              />
            </div>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
