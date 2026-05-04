"use client";

import { useEffect, useState } from "react";
import { Heart, Mail, Gamepad2, MapPin, Trophy } from "lucide-react";
import { useMoments } from "@/lib/moments";

const EMOJI_MAP: Record<string, string> = {
  message_opened: "💌",
  reaction: "❤️",
  game: "🎮",
  message_sent: "📍",
  milestone: "🏆",
};

const ICON_MAP: Record<string, React.ElementType> = {
  message_opened: Mail,
  reaction: Heart,
  game: Gamepad2,
  message_sent: MapPin,
  milestone: Trophy,
};

export default function MomentsPage() {
  const { moments, loading } = useMoments();
  const [animatedItems, setAnimatedItems] = useState<number[]>([]);

  useEffect(() => {
    moments.forEach((__, i) => {
      setTimeout(() => {
        setAnimatedItems((prev) => [...prev, i]);
      }, i * 150);
    });
  }, [moments]);

  return (
    <div className="timeline-section">
      <div className="home-header mb-4">
        <div className="home-header-left">
          <p className="home-label">Our Journey</p>
          <h1 className="home-title">
            Our <em>Story</em>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading memories...</p>
        </div>
      ) : moments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📖</span>
          <p className="empty-state-text">Your story is just beginning...</p>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Timeline Line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 via-lavender-200 to-sky-200 rounded-full" />

          {moments.map((moment, index) => {
            const Icon = ICON_MAP[moment.type] || Heart;
            const isAnimated = animatedItems.includes(index);

            return (
              <div
                key={moment.id}
                className={`relative mb-6 transition-all duration-500 ${
                  isAnimated ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                }`}
              >
                {/* Dot */}
                <div className="absolute -left-8 top-0 w-8 h-8 rounded-full glass flex items-center justify-center text-lg shadow-md z-10">
                  {EMOJI_MAP[moment.type] || "✨"}
                </div>

                {/* Card */}
                <div className="timeline-card ml-4 hover:bg-white/80 transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Icon className="w-4 h-4 text-rose-300" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base text-gray-800 mb-1">
                        {moment.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">{moment.description}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {moment.createdAt?.toDate?.()?.toLocaleDateString() || ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-2 glass-strong px-6 py-3 rounded-full">
          <Trophy className="w-5 h-5 text-rose-400" />
          <span className="text-sm font-medium text-gray-700">
            {moments.length} moments together
          </span>
        </div>
      </div>
    </div>
  );
}
