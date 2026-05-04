"use client";

import { useState, useEffect } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  size: number;
  emoji: string;
  duration: number;
}

const EMOJIS = ["❤️", "💖", "💕", "🌸", "✨", "💗", "🌹", "💝"];

export default function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isBursting, setIsBursting] = useState(false);

  useEffect(() => {
    // Check for a burst request in sessionStorage on mount (e.g. after a redirect)
    if (typeof window !== "undefined" && sessionStorage.getItem("trigger_burst")) {
      setIsBursting(true);
      sessionStorage.removeItem("trigger_burst");
      setTimeout(() => setIsBursting(false), 5000);
    }

    // Also listen for a custom event
    const handleTrigger = () => {
      setIsBursting(true);
      setTimeout(() => setIsBursting(false), 5000);
    };

    window.addEventListener("trigger-particles", handleTrigger);

    return () => window.removeEventListener("trigger-particles", handleTrigger);
  }, []);

  useEffect(() => {
    if (!isBursting && particles.length === 0) return;

    // Faster spawning during burst
    const interval = setInterval(() => {
      if (!isBursting) return;

      const newParticle: Particle = {
        id: Date.now() + Math.random(),
        x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
        delay: Math.random() * 0.5,
        size: Math.random() * 20 + 14,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        duration: 3 + Math.random() * 2,
      };
      setParticles((prev) => [...prev.slice(-20), newParticle]);
    }, 400);

    return () => clearInterval(interval);
  }, [isBursting, particles.length]);

  if (!isBursting && particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="heart-particle absolute"
          style={{
            left: p.x,
            bottom: "-50px",
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
