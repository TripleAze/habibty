"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Bell,
  Smartphone,
  LogOut,
  Heart,
  Mail,
  Gamepad2,
  Calendar,
  ChevronRight,
  Unlink,
} from "lucide-react";
import { useAuth } from "@/lib/firebase";
import { usePair } from "@/lib/pair";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { partner, unpair, daysTogether } = usePair();
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);

  const stats = [
    { label: "Letters", value: "48", icon: Mail, color: "text-rose-400" },
    { label: "Games", value: "23", icon: Gamepad2, color: "text-lavender-300" },
    { label: "Days", value: daysTogether?.toString() || "0", icon: Calendar, color: "text-green-400" },
  ];

  return (
    <div className="profile-section">
      <h1 className="font-serif text-3xl font-bold text-gray-800 mb-6">Our Space</h1>

      {/* Couple Card */}
      <div className="profile-card mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-rose-100/50 to-transparent rounded-bl-full" />

        <div className="p-6 relative z-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* You */}
            <div className="text-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="You"
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/50 mx-auto mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-lavender-100 flex items-center justify-center text-2xl ring-4 ring-white/50 mx-auto mb-2">
                  {user?.displayName?.[0] || "Y"}
                </div>
              )}
              <p className="text-sm font-medium text-gray-700">{user?.displayName || "You"}</p>
            </div>

            {/* Heart */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-200 to-lavender-200 flex items-center justify-center mb-1">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
              </div>
              <span className="text-xs text-gray-400">Since</span>
              <span className="text-xs font-medium text-rose-400">{daysTogether || 0} days</span>
            </div>

            {/* Partner */}
            <div className="text-center">
              {partner?.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/50 mx-auto mb-2"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lavender-100 to-sky-100 flex items-center justify-center text-2xl ring-4 ring-white/50 mx-auto mb-2">
                  {partner?.name?.[0] || "P"}
                </div>
              )}
              <p className="text-sm font-medium text-gray-700">{partner?.name || "Partner"}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-2xl bg-white/30">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings */}
      <p className="pf-section-label">Settings</p>

      <div className="profile-card mb-6">
        <Link href="/profile/edit" className="profile-row">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <User className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Edit Profile</p>
              <p className="text-xs text-gray-500">Name, avatar, preferences</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        <button className="profile-row w-full text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-lavender-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-lavender-300" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Notifications</p>
              <p className="text-xs text-gray-500">Manage alerts and sounds</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button className="profile-row w-full text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <p className="font-medium text-gray-800">PWA Settings</p>
              <p className="text-xs text-gray-500">Install, offline mode</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Danger Zone */}
      <p className="pf-section-label">Danger Zone</p>

      <div className="profile-card">
        {!showUnpairConfirm ? (
          <button
            onClick={() => setShowUnpairConfirm(true)}
            className="profile-row w-full text-left text-red-400 hover:bg-red-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Unlink className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-medium">Unpair Partner</p>
                <p className="text-xs opacity-70">This cannot be undone</p>
              </div>
            </div>
          </button>
        ) : (
          <div className="p-4">
            <p className="text-sm text-red-500 mb-3">
              Are you sure? All messages and memories will be lost.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUnpairConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={unpair}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Yes, Unpair
              </button>
            </div>
          </div>
        )}

        <button
          onClick={signOut}
          className="profile-row w-full text-left text-red-400 hover:bg-red-50"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-medium">Sign Out</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
