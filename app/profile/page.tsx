"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Mail, Calendar, Gamepad2, ChevronRight, User, Bell, 
  LogOut, Unlink, Heart, Smartphone, Trophy 
} from "lucide-react";
import { onSnapshot, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePair } from "@/lib/pair";
import { useHeader } from "@/lib/HeaderContext";
import PWASettingsModal from "@/components/PWASettingsModal";
import ConfirmModal from "@/components/ConfirmModal";
import { pairWithCode } from "@/lib/pair";
import { Share, Copy } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function ProfilePage() {
  useHeader({ hide: true });
  const { user, signOut } = useAuth();
  const { partner, unpair, daysTogether, inviteCode } = usePair();
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showPWASettings, setShowPWASettings] = useState(false);
  const [letterCount, setLetterCount] = useState<number>(0);
  const [gameCount, setGameCount] = useState<number>(0);
  const [scoreboard, setScoreboard] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });
    return () => unsub();
  }, [user]);

  const getAccentColor = (color: string) => {
    switch (color) {
      case 'rose': return 'rose-400';
      case 'lavender': return 'lavender-400';
      case 'blue': return 'sky-400';
      case 'gold': return 'amber-400';
      default: return 'rose-400';
    }
  };

  const myAccent = userData?.accentColor || 'rose';
  const partnerAccent = partner?.accentColor || 'rose';
  const [copied, setCopied] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState("");

  useEffect(() => {
    if (!user || !partner) return;

    const pairId = [user.uid, partner.uid].sort().join('_');
    const unsubScore = onSnapshot(doc(db, 'scoreboards', pairId), (snap) => {
      if (snap.exists()) setScoreboard(snap.data());
    });

    // Count letters (messages)
    const qMessages = query(
      collection(db, "messages"),
      where("receiverId", "==", user.uid)
    );
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      // Filter by partnerId in JS to avoid complex index requirements
      const count = snap.docs.filter(d => d.data().senderId === partner.uid).length;
      
      // Also fetch sent messages
      const qSent = query(collection(db, "messages"), where("senderId", "==", user.uid));
      getDocs(qSent).then(sentSnap => {
        const sentCount = sentSnap.docs.filter(d => d.data().receiverId === partner.uid).length;
        setLetterCount(count + sentCount);
      });
    });

    // Count games
    const qGames = query(
      collection(db, "games"),
      where("players", "array-contains", user.uid)
    );
    const unsubGames = onSnapshot(qGames, (snap) => {
      setGameCount(snap.size);
    });

    return () => {
      unsubMessages();
      unsubGames();
      unsubScore();
    };
  }, [user, partner]);

  const stats = [
    { label: "Letters", value: letterCount.toString(), icon: Mail, color: "text-rose-400" },
    { label: "Games", value: gameCount.toString(), icon: Gamepad2, color: "text-lavender-300" },
    { label: "Days", value: daysTogether?.toString() || "0", icon: Calendar, color: "text-green-400" },
  ];

  return (
    <div className="profile-section app-container px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-gray-800">Our Space</h1>
        <NotificationBell />
      </div>

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
                  className={`w-20 h-20 rounded-2xl object-cover ring-4 ring-${getAccentColor(myAccent)} mx-auto mb-2`}
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 to-lavender-100 flex items-center justify-center text-2xl ring-4 ring-${getAccentColor(myAccent)} mx-auto mb-2`}>
                  {user?.displayName?.[0] || "Y"}
                </div>
              )}
              <p className={`text-sm font-medium text-${getAccentColor(myAccent)}`}>{user?.displayName || "You"}</p>
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
                  className={`w-20 h-20 rounded-2xl object-cover ring-4 ring-${getAccentColor(partnerAccent)} mx-auto mb-2`}
                />
              ) : (
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-lavender-100 to-sky-100 flex items-center justify-center text-2xl ring-4 ring-${getAccentColor(partnerAccent)} mx-auto mb-2`}>
                  {partner?.name?.[0] || "P"}
                </div>
              )}
              <p className={`text-sm font-medium text-${getAccentColor(partnerAccent)}`}>{partner?.name || "Partner"}</p>
            </div>
          </div>

          {/* Stats & Scoreboard */}
          <div className="flex flex-col gap-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="text-center p-3 rounded-2xl bg-white/30">
                <Mail className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{letterCount}</p>
                <p className="text-xs text-gray-500">Letters</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-white/30">
                <Calendar className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{daysTogether || 0}</p>
                <p className="text-xs text-gray-500">Days</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-white/30">
                <Gamepad2 className="w-5 h-5 text-lavender-300 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-800">{gameCount}</p>
                <p className="text-xs text-gray-500">Games</p>
              </div>
            </div>

            {/* Detailed Game Stats */}
            {scoreboard && Object.keys(scoreboard).length > 0 && (
              <div className="p-4 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-gray-700">Recent Scores</p>
                </div>
                <div className="space-y-2">
                  {Object.entries(scoreboard).map(([key, data]: [string, any]) => {
                    const [pA, pB] = [user?.uid, partner?.uid].sort();
                    const isMeA = user?.uid === pA;
                    const myScore = isMeA ? data.winsA : data.winsB;
                    const oppScore = isMeA ? data.winsB : data.winsA;
                    
                    return (
                      <div key={key} className="flex items-center justify-between text-xs bg-white/20 p-2 rounded-xl">
                        <span className="capitalize text-gray-600 font-medium">{key.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">You</span>
                            <span className="font-bold text-gray-800">{myScore}</span>
                          </div>
                          <span className="text-gray-300">—</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-800">{oppScore}</span>
                            <span className="text-gray-500">{partner?.name?.split(' ')[0] || 'Partner'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partnership Card */}
      <p className="pf-section-label">Partnership</p>
      <div className="profile-card mb-6 p-5">
        {/* Row 1: Partner */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">
              {partner ? "Paired With" : "Status"}
            </p>
            <p className="text-lg font-medium text-gray-800">
              {partner ? partner.name : "Not Paired"}
            </p>
          </div>
          {partner && (
            <button 
              onClick={() => setShowUnpairConfirm(true)}
              className="px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-semibold"
            >
              Unpair
            </button>
          )}
        </div>

        {/* Row 2: Your invite code */}
        <div className="pt-5 border-t border-gray-100 mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Your Invite Code
          </p>
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xl font-bold tracking-[0.2em] text-[#3D2B3D]">
              {inviteCode}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-400 text-xs font-medium flex items-center gap-1.5"
              >
                {copied ? "Copied ✓" : <><Copy size={12} /> Copy</>}
              </button>
              <button 
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({ text: `Join my space on Habibty! Code: ${inviteCode}` });
                    } catch (e) {}
                  } else {
                    navigator.clipboard.writeText(inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-400 text-xs font-medium flex items-center gap-1.5"
              >
                <Share size={12} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Join with code (unpaired only) */}
        {!partner && (
          <div className="pt-5 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Join with Code
            </p>
            <div className="flex items-center gap-2">
              <input 
                type="text"
                placeholder="Partner's Code"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-200"
                maxLength={6}
              />
              <button 
                onClick={async () => {
                  if (!user || pairingLoading || !partnerCode) return;
                  setPairingLoading(true);
                  setPairingError("");
                  const res = await pairWithCode(user.uid, partnerCode);
                  if (!res.ok) setPairingError(res.error || "Failed");
                  setPairingLoading(false);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-rose-400 to-rose-300 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50"
                disabled={pairingLoading || !partnerCode}
              >
                {pairingLoading ? "..." : "Pair"}
              </button>
            </div>
            {pairingError && <p className="text-[10px] text-red-400 mt-2 ml-1">{pairingError}</p>}
          </div>
        )}
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

        <button 
          onClick={() => setShowPWASettings(true)}
          className="profile-row w-full text-left"
        >
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
        <button
          onClick={() => setShowSignOutConfirm(true)}
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

      <PWASettingsModal 
        isOpen={showPWASettings} 
        onClose={() => setShowPWASettings(false)} 
      />

      <ConfirmModal
        isOpen={showUnpairConfirm}
        onClose={() => setShowUnpairConfirm(false)}
        onConfirm={unpair}
        title="Unpair Partner?"
        message="Are you sure? You will lose access to all shared letters, games, and memories in this space."
        confirmText="Yes, Unpair"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={signOut}
        title="Sign Out?"
        message="You will need to sign back in to access your love letters."
        confirmText="Sign Out"
        isDanger={true}
      />
    </div>
  );
}
