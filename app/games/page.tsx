'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createGame, joinGame } from '@/lib/games';
import { createWhotGame, joinWhotGame } from '@/lib/whot';
import BottomNav from '@/components/BottomNav';
import { useHeader } from '@/lib/HeaderContext';
import NotificationBell from '@/components/NotificationBell';

type GameType = 'tictactoe' | 'whot' | 'wordle' | 'truthordare' | 'rapidfire' | 'wouldyourather';

export default function GamesPage() {
  useHeader({ hide: true });
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [checking, setChecking] = useState(true);

  // Per-game state
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      setUid(user.uid);
      setPhotoURL(user.photoURL || '');
      const snap = await getDoc(doc(db, 'users', user.uid));
      setDisplayName(snap.exists()
        ? snap.data().displayName || user.displayName || 'Player'
        : user.displayName || 'Player');
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const handleCreate = async (type: GameType) => {
    if (!uid) return;
    setLoading(true); setError('');
    try {
      if (type === 'tictactoe') {
        const id = await createGame(uid, displayName, photoURL);
        router.push(`/games/tictactoe?id=${id}`);
      } else if (type === 'whot') {
        const id = await createWhotGame(uid, displayName, photoURL);
        router.push(`/games/whot?id=${id}`);
      } else if (type === 'wordle') {
        // Wordle has a separate setup page
        router.push(`/games/wordle/setup`);
      } else if (type === 'truthordare') {
        router.push(`/games/truth-or-dare`);
      } else if (type === 'rapidfire') {
        router.push(`/games/rapid-fire`);
      } else if (type === 'wouldyourather') {
        router.push(`/games/would-you-rather`);
      }
    } catch {
      setError('Could not create game. Try again.');
      setLoading(false);
    }
  };

  const handleJoin = async (type: GameType) => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('Enter a game code'); return; }
    setLoading(true); setError('');
    try {
      const gameRef = doc(db, 'games', code);
      const snap = await getDoc(gameRef);

      if (!snap.exists()) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const data = snap.data();
      const gameType = data.type as GameType;

      // Check if player is already in the game
      if (data.players?.includes(uid)) {
        router.push(`/games/${getGamePath(gameType)}?id=${code}`);
        return;
      }

      // Check if game is full
      if (data.players?.length >= 2) {
        setError('Game is full');
        setLoading(false);
        return;
      }

      // Join the game based on type
      let result;
      if (gameType === 'tictactoe') {
        result = await joinGame(code, uid, displayName, photoURL);
      } else if (gameType === 'whot') {
        result = await joinWhotGame(code, uid, displayName, photoURL);
      } else {
        // Push newly implemented games directly to their routes 
        // to let them natively execute their specific join logic.
        result = { ok: true };
      }

      if (result.ok) {
        router.push(`/games/${getGamePath(gameType)}?id=${code}`);
      } else {
        setError(result.error || 'Could not join.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Join error:', err);
      setError('Could not join game.');
      setLoading(false);
    }
  };

  const getGamePath = (type: GameType): string => {
    switch (type) {
      case 'tictactoe': return 'tictactoe';
      case 'whot': return 'whot';
      case 'wordle': return 'wordle';
      case 'truthordare': return 'truth-or-dare';
      case 'rapidfire': return 'rapid-fire';
      case 'wouldyourather': return 'would-you-rather';
    }
  };

  const resetGame = () => { setActiveGame(null); setJoinCode(''); setError(''); };

  if (checking) return (
    <div className="app-container">
      <div className="loading-state"><div className="loading-spinner" /></div>
    </div>
  );

  const games: Array<{
    type: GameType;
    name: string;
    desc: string;
    symbol?: string;
    icon?: string;
    color: string;
    bg: string;
    border: string;
    new?: boolean;
  }> = [
    {
      type: 'tictactoe',
      name: 'Tic Tac Toe',
      desc: 'Classic 3×3 board game',
      icon: '/images/games/tictactoe.png',
      color: '#E8A0A0',
      bg: 'rgba(232,160,160,0.12)',
      border: 'rgba(232,160,160,0.3)',
    },
    {
      type: 'whot',
      name: 'Naija Whot',
      desc: 'Nigerian shedding card game',
      icon: '/icon.png',
      color: '#C9B8D8',
      bg: 'rgba(201,184,216,0.12)',
      border: 'rgba(201,184,216,0.3)',
    },
    {
      type: 'wordle',
      name: 'Partner Wordle',
      desc: 'Guess the 5-letter word',
      icon: '/images/games/wordle.png',
      color: '#68B88B',
      bg: 'rgba(104,184,139,0.12)',
      border: 'rgba(104,184,139,0.3)',
    },
    {
      type: 'truthordare',
      name: 'Truth or Dare',
      desc: 'Deep questions & dares',
      icon: '/images/games/truth-or-dare.png',
      color: '#D4A94A',
      bg: 'rgba(212,169,74,0.12)',
      border: 'rgba(212,169,74,0.3)',
    },
    {
      type: 'rapidfire',
      name: 'Rapid Fire',
      desc: 'Quick questions, 60 seconds',
      icon: '/images/games/rapid-fire.png',
      color: '#E8A0A0',
      bg: 'rgba(232,160,160,0.12)',
      border: 'rgba(232,160,160,0.3)',
    },
    {
      type: 'wouldyourather',
      name: 'Would You Rather',
      desc: 'Impossible choices together',
      icon: '/images/games/would-you-rather.png',
      color: '#9B7EBD',
      bg: 'rgba(155,126,189,0.12)',
      border: 'rgba(155,126,189,0.3)',
    },
  ];

  return (
    <>
      <div className="app-container">
        <div className="page-content-wrapper">
          <div className="home-header">
            <div className="home-header-left">
              <p className="home-label">Games</p>
              <h1 className="home-title">Play <em>together</em></h1>
            </div>
            <NotificationBell />
          </div>

          <div className="section-label">Available games</div>

          <div className="games-grid">
            {games.map((g, i) => (
              <div 
                key={g.type} 
                className="game-card" 
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="game-card-header">
                  <div className="game-icon-wrap" style={{ background: g.bg, border: `1px solid ${g.border}` }}>
                    {g.icon
                      ? <div className="relative w-full h-full"><Image src={g.icon} alt={g.name} fill className="object-contain" unoptimized /></div>
                      : <span style={{ color: g.color, fontSize: '20px' }}>{g.symbol || g.name[0]}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="game-name-row">
                      <div className="game-name">{g.name}</div>
                      {g.new && <span className="new-game-badge">NEW</span>}
                    </div>
                    <div className="game-desc">{g.desc}</div>
                  </div>
                </div>

                {activeGame === g.type ? (
                  <div className="join-panel mt-auto">
                    <div className="join-row">
                      <input
                        className="join-input"
                        type="text"
                        maxLength={6}
                        placeholder="Enter code"
                        value={joinCode}
                        onChange={e => { setJoinCode(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleJoin(g.type)}
                        autoFocus
                      />
                      <button className="join-confirm" onClick={() => handleJoin(g.type)} disabled={loading || !joinCode.trim()}>
                        Join
                      </button>
                    </div>
                    {error && <p className="lobby-error">{error}</p>}
                    <span className="join-cancel" onClick={resetGame}>Cancel</span>
                  </div>
                ) : (
                  <div className="game-actions">
                    <button
                      className="btn-game btn-game-primary"
                      onClick={() => handleCreate(g.type)}
                      disabled={loading}
                    >
                      <span>{g.type === 'wordle' ? 'Set up word' : 'Create Game'}</span>
                      <span>✨</span>
                    </button>
                    <button
                      className="btn-game btn-game-secondary"
                      onClick={() => { setActiveGame(g.type); setError(''); }}
                    >
                      Join
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <BottomNav activeTab="games" />
      </div>
    </>
  );
}
