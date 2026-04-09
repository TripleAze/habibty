'use client';

import { useEffect, useState, useCallback } from 'react';

interface SplashProps {
  onEnter: () => void;
}

export default function Splash({ onEnter }: SplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [petals, setPetals] = useState<Array<{
    id: number;
    left: string;
    background: string;
    animationDelay: string;
    animationDuration: string;
    size: string;
  }>>([]);

  useEffect(() => {
    const colors = ['#F2C4CE', '#E8D0F0', '#D0E0F8', '#FFE0EA', '#E0D0FF'];
    const newPetals = [];

    for (let i = 0; i < 18; i++) {
      newPetals.push({
        id: i,
        left: `${Math.random() * 100}%`,
        background: colors[Math.floor(Math.random() * colors.length)],
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${6 + Math.random() * 6}s`,
        size: `${8 + Math.random() * 10}px`,
      });
    }

    setPetals(newPetals);
  }, []);

  const handleEnter = useCallback(() => {
    setIsExiting(true);
    setTimeout(onEnter, 600);
  }, [onEnter]);

  return (
    <div className={`splash-screen ${isExiting ? 'exit' : ''}`}>
      <div className="splash-bg">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="petal-float"
            style={{
              left: petal.left,
              background: petal.background,
              animationDelay: petal.animationDelay,
              animationDuration: petal.animationDuration,
              width: petal.size,
              height: petal.size,
            }}
          />
        ))}
      </div>
      <div className="splash-content">
        <span className="splash-envelope">💌</span>
        <h1 className="splash-title">
          A little something
          <br />
          <em>for you</em>
        </h1>
        <p className="splash-sub">From someone who loves you</p>
        <button type="button" className="btn-enter" onClick={handleEnter}>
          Enter ✨
        </button>
      </div>
    </div>
  );
}
