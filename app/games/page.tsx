'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createGame, joinGame } from '@/lib/games';
import { createWhotGame, joinWhotGame } from '@/lib/whot';
import BottomNav from '@/components/BottomNav';

type GameType = 'tictactoe' | 'whot' | 'wordle' | 'truthordare' | 'rapidfire' | 'wouldyourather';

export default function GamesPage() {
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
        // Generic join for other games
        const { updateDoc, arrayUnion } = await import('firebase/firestore');
        await updateDoc(gameRef, {
          players: arrayUnion(uid),
          [`playerNames.${uid}`]: displayName,
          ...(photoURL ? { [`playerPhotos.${uid}`]: photoURL } : {}),
          status: gameType === 'wordle' ? 'playing' : 'active',
        });
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
      new: true,
    },
    {
      type: 'truthordare',
      name: 'Truth or Dare',
      desc: 'Deep questions & dares',
      icon: '/images/games/truth-or-dare.png',
      color: '#D4A94A',
      bg: 'rgba(212,169,74,0.12)',
      border: 'rgba(212,169,74,0.3)',
      new: true,
    },
    {
      type: 'rapidfire',
      name: 'Rapid Fire',
      desc: 'Quick questions, 60 seconds',
      icon: '/images/games/rapid-fire.png',
      color: '#E8A0A0',
      bg: 'rgba(232,160,160,0.12)',
      border: 'rgba(232,160,160,0.3)',
      new: true,
    },
    {
      type: 'wouldyourather',
      name: 'Would You Rather',
      desc: 'Impossible choices together',
      icon: '/images/games/would-you-rather.png',
      color: '#9B7EBD',
      bg: 'rgba(155,126,189,0.12)',
      border: 'rgba(155,126,189,0.3)',
      new: true,
    },
  ];

  return (
    <>
      <style>{`
        .game-card {
          background: rgba(255,255,255,0.65);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(255,255,255,0.8);
          margin: 0 16px 12px;
          transition: transform 0.2s;
        }
        .game-card:hover { transform: translateY(-2px); }
        .game-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .game-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; flex-shrink: 0; letter-spacing: 0.04em; font-family: 'DM Sans', sans-serif; }
        .game-name { font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; color: #3D2B3D; margin-bottom: 2px; }
        .game-desc { font-size: 11px; color: rgba(122,92,122,0.6); }
        .game-btns { display: flex; gap: 8px; }
        .btn-game-create { flex: 1; padding: 11px; border-radius: 100px; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.03em; }
        .btn-game-join { padding: 11px 16px; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; cursor: pointer; transition: all 0.2s; background: transparent; white-space: nowrap; }
        .new-badge { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); color: white; margin-left: 6px; }

        .join-panel { margin-top: 12px; padding-top: 12px; border-top: 0.5px solid rgba(201,184,216,0.3); }
        .join-row { display: flex; gap: 8px; }
        .join-input { flex: 1; padding: 10px 14px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.3); background: rgba(255,255,255,0.7); font-family: 'DM Sans', sans-serif; font-size: 13px; color: #3D2B3D; outline: none; text-transform: uppercase; letter-spacing: 0.08em; transition: border-color 0.2s; }
        .join-input::placeholder { text-transform: none; letter-spacing: 0; color: rgba(122,92,122,0.4); }
        .join-input:focus { border-color: #E8A0A0; }
        .join-confirm { padding: 10px 16px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.4); background: transparent; font-size: 13px; color: #B06060; cursor: pointer; font-weight: 500; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
        .join-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .join-cancel { font-size: 11px; color: rgba(122,92,122,0.5); cursor: pointer; margin-top: 6px; text-align: center; display: block; }
        .lobby-error { font-size: 12px; color: #c0706a; margin-top: 8px; text-align: center; }
      `}</style>

      <div className="app-container">
        <div className="home-header">
          <div className="home-header-left">
            <p className="home-label">Games</p>
            <h1 className="home-title">Play <em>together</em></h1>
          </div>
        </div>

        <div style={{ margin: '0 16px 10px' }}>
          <div className="section-label" style={{ padding: '0 4px' }}>Available games</div>
        </div>

        {games.map(g => (
          <div key={g.type} className="game-card">
            <div className="game-card-header">
              <div className="game-icon" style={{ background: g.bg, color: g.color, border: `1px solid ${g.border}`, overflow: 'hidden', padding: 0 }}>
                {g.icon
                  ? <img src={g.icon} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
                  : g.symbol
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="game-name">{g.name}</div>
                  {g.new && <span className="new-badge">NEW</span>}
                </div>
                <div className="game-desc">{g.desc}</div>
              </div>
            </div>

            {activeGame === g.type ? (
              <div className="join-panel">
                <div className="join-row">
                  <input
                    className="join-input"
                    type="text"
                    maxLength={6}
                    placeholder="Enter game code"
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
              <div className="game-btns">
                <button
                  className="btn-game-create"
                  style={{ background: `linear-gradient(135deg, ${g.color}, #C9B8D8)`, color: 'white' }}
                  onClick={() => handleCreate(g.type)}
                  disabled={loading}
                >
                  {g.type === 'wordle' ? 'Set up word' : 'Create game'}
                </button>
                <button
                  className="btn-game-join"
                  style={{ border: `1.5px solid ${g.border}`, color: g.color }}
                  onClick={() => { setActiveGame(g.type); setError(''); }}
                >
                  Join
                </button>
              </div>
            )}
          </div>
        ))}

        <BottomNav activeTab="games" />
      </div>
    </>
  );
}
