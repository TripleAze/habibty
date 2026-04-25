'use client';

import { useState, useEffect, ReactNode } from 'react';

interface GameScreenProps {
  title: string;
  subtitle?: string;
  onExit: () => void;
  children: ReactNode;
}

export default function GameScreen({ title, subtitle, onExit, children }: GameScreenProps) {
  // Lock body scroll while in game
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes popIn { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }

        .game-screen {
          position: fixed; inset: 0; overflow: hidden;
          background: linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%);
          display: flex; flex-direction: column;
          font-family: var(--font-dm-sans), sans-serif;
        }
        .game-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 48px 20px 12px; flex-shrink: 0;
        }
        .game-exit-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; color: #7A5C7A;
          backdrop-filter: blur(8px);
        }
        .game-title { font-family: var(--font-cormorant),serif; font-size: 22px; font-weight: 300; color: #3D2B3D; }
        .game-title em { font-style: italic; color: #7A5C7A; }
        .game-label { font-size: 10px; letter-spacing: '0.2em'; text-transform: uppercase; color: '#C9829A'; font-weight: 500; margin-bottom: 3px; }
      `}</style>

      <div className="game-screen">
        <div className="game-topbar">
          <div>
            <p className="game-label">Games</p>
            <h1 className="game-title" dangerouslySetInnerHTML={{ __html: title }} />
          </div>
          <button className="game-exit-btn" onClick={onExit}>×</button>
        </div>
        {children}
      </div>
    </>
  );
}
