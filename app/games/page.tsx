"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gamepad2, ArrowRight, Sparkles } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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
    id: "rapid-fire",
    name: "Rapid Fire",
    desc: "60-second quick questions",
    icon: "/images/games/rapid-fire.png",
    color: "from-sky-50 to-rose-100",
    new: false,
  },
  {
    id: "would-you-rather",
    name: "Would You Rather",
    desc: "Shared decision scenarios",
    icon: "/images/games/would-you-rather.png",
    color: "from-lavender-50 to-sky-100",
    new: false,
  },
];

export default function GamesPage() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  return (
    <div className="app-container">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Play Together</p>
          <h1 className="home-title">
            Love <em>Games</em>
          </h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-300 to-lavender-200 flex items-center justify-center text-white shadow-lg">
          <Gamepad2 className="w-6 h-6" />
        </div>
      </div>

      <p className="px-6 text-sm text-gray-500 mb-6">
        Play together, stay together. Choose a game to start.
      </p>

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
      <BottomNav activeTab="games" />
    </div>
  );
}
