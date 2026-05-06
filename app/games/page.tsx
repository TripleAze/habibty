"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gamepad2, ArrowRight, Sparkles } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useHeader } from "@/lib/HeaderContext";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const GAMES = [
  {
    id: "whot",
    name: "Naija Whot",
    desc: "Classic African card game with special effects",
    icon: "/whot-icon.png",
    color: "from-rose-100 to-rose-200",
    new: false,
  },
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    desc: "Classic strategy game with rematch",
    icon: "/images/games/tictactoe.png",
    color: "from-lavender-100 to-lavender-200",
    new: false,
  },
  {
    id: "wordle",
    name: "Partner Wordle",
    desc: "Couples edition word puzzle",
    icon: "/images/games/wordle.png",
    color: "from-sky-100 to-sky-200",
    new: true,
  },
  {
    id: "truth-or-dare",
    name: "Truth or Dare",
    desc: "Intimate questions for two",
    icon: "/images/games/truth-or-dare.png",
    color: "from-rose-50 to-lavender-100",
    new: false,
  },
  {
    id: "would-you-rather",
    name: "Would You Rather",
    desc: "Find out where you both stand",
    icon: "/images/games/would-you-rather.png",
    color: "from-lavender-50 to-sky-100",
    new: false,
  },
  {
    id: "rapid-fire",
    name: "Rapid Fire",
    desc: "Quick answers, no thinking!",
    icon: "/images/games/rapid-fire.png",
    color: "from-rose-100 to-lavender-100",
    new: true,
  },
];

export default function GamesPage() {
  useHeader({ hide: true });
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const snap = await getDoc(doc(db, "games", code));
      if (snap.exists()) {
        const data = snap.data();
        router.push(`/games/${data.type}?id=${code}`);
      } else {
        setJoinError("Game not found. Check the code.");
      }
    } catch (err) {
      setJoinError("Error joining game.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Play Together</p>
          <h1 className="home-title">
            Love <em>Games</em>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-300 to-lavender-200 flex items-center justify-center text-white shadow-lg">
            <Gamepad2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      <p className="px-6 text-sm text-gray-500 mb-6">
        Play together, stay together. Choose a game to start.
      </p>

      {/* Join with Code */}
      <div className="px-6 mb-8">
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            className="w-full py-4 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-sm flex items-center justify-center gap-3 text-gray-700 font-medium hover:bg-white/50 transition-all shadow-sm"
          >
            <Sparkles className="w-5 h-5 text-rose-400" />
            <span>Join with Game Code</span>
          </button>
        ) : (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Enter Code</h3>
              <button onClick={() => setShowJoinInput(false)} className="text-gray-400 text-xs">Cancel</button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD"
                className="flex-1 bg-white/80 border border-rose-100 rounded-xl px-4 py-3 text-lg font-bold tracking-[0.2em] uppercase focus:outline-none focus:ring-2 focus:ring-rose-200"
                maxLength={6}
              />
              <button
                onClick={handleJoin}
                disabled={joining || !joinCode}
                className="bg-gradient-to-r from-rose-400 to-rose-300 text-white px-6 py-3 rounded-xl font-bold shadow-md disabled:opacity-50"
              >
                {joining ? "..." : "GO"}
              </button>
            </div>
            {joinError && <p className="text-rose-500 text-xs mt-2 ml-1">{joinError}</p>}
          </div>
        )}
      </div>

      {/* Games Grid */}
      <div className="games-grid">
        {GAMES.map((game, index) => (
          <Link
            key={game.id}
            href={`/games/${game.id}`}
            className="game-card"
            onMouseEnter={() => setHoveredGame(game.id)}
            onMouseLeave={() => setHoveredGame(null)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="game-card-header">
              <div className={`game-icon-wrap bg-gradient-to-br ${game.color}`}>
                {game.icon ? (
                  <Image
                    src={game.icon}
                    alt={game.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <Gamepad2 className="w-6 h-6 text-rose-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="game-name">{game.name}</h3>
                  {game.new && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-200 to-amber-300 text-amber-700 text-[10px] font-bold rounded-full">
                      NEW
                    </span>
                  )}
                </div>
                <p className="game-desc">{game.desc}</p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Sparkles className="w-3 h-3" />
                <span>2 players</span>
              </div>
              <div
                className={`w-8 h-8 rounded-full bg-white/60 flex items-center justify-center transition-all ${
                  hoveredGame === game.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                }`}
              >
                <ArrowRight className="w-4 h-4 text-gray-700" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
