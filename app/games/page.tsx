'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createGame, joinGame } from '@/lib/games';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

export default function GamesPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      setUid(user.uid);
      setPhotoURL(user.photoURL || '');
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setDisplayName(snap.data().displayName || user.displayName || 'Player');
      } else {
        setDisplayName(user.displayName || 'Player');
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const handleCreate = async () => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      const gameId = await createGame(uid, displayName, photoURL);
      router.push(`/games/tictactoe?id=${gameId}`);
    } catch {
      setError('Could not create game. Try again.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !uid) { setError('Please enter a game code'); return; }
    setLoading(true);
    setError('');
    const result = await joinGame(code, uid, displayName, photoURL);
    if (result.ok) {
      router.push(`/games/tictactoe?id=${code}`);
    } else {
      setError(result.error || 'Could not join game.');
      setLoading(false);
    }
  };

  if (checking) return (
    <div className="app-container">
      <div className="loading-state"><div className="loading-spinner" /></div>
    </div>
  );

  return (
    <>
      <style>{`
        .games-lobby {
          margin: 0 16px;
          background: rgba(255,255,255,0.62);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 24px 20px;
          border: 1px solid rgba(255,255,255,0.8);
        }
        .games-lobby-sub {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-style: italic;
          color: var(--soft-ink);
          text-align: center;
          margin-bottom: 20px;
          opacity: 0.8;
        }
        .btn-create {
          width: 100%;
          padding: 15px;
          border-radius: 100px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.04em;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(232,160,160,0.3);
        }
        .btn-create:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(232,160,160,0.4);
        }
        .btn-create:disabled { opacity: 0.6; cursor: not-allowed; }
        .join-row {
          display: flex;
          gap: 8px;
        }
        .join-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 100px;
          border: 1.5px solid rgba(232,160,160,0.3);
          background: rgba(255,255,255,0.7);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: var(--ink);
          outline: none;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: border-color 0.2s;
        }
        .join-input::placeholder { text-transform: none; letter-spacing: 0; color: rgba(122,92,122,0.4); }
        .join-input:focus { border-color: var(--rose); }
        .btn-join {
          padding: 12px 18px;
          border-radius: 100px;
          border: 1.5px solid rgba(232,160,160,0.4);
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #B06060;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          font-weight: 500;
        }
        .btn-join:hover:not(:disabled) { background: rgba(232,160,160,0.1); }
        .btn-join:disabled { opacity: 0.5; cursor: not-allowed; }
        .lobby-error {
          font-size: 12px;
          color: #c0706a;
          text-align: center;
          margin-top: 10px;
        }
        .games-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 12px 0;
        }
        .games-divider::before,
        .games-divider::after {
          content: '';
          flex: 1;
          height: 0.5px;
          background: rgba(201,184,216,0.4);
        }
        .games-divider span {
          font-size: 11px;
          letter-spacing: 0.1em;
          color: rgba(122,92,122,0.4);
        }
        .coming-soon-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 16px 16px 0;
        }
        .coming-soon-card {
          padding: 16px 10px;
          background: rgba(255,255,255,0.4);
          border-radius: 16px;
          border: 1.5px dashed rgba(201,184,216,0.4);
          text-align: center;
          cursor: not-allowed;
        }
        .coming-soon-icon {
          font-size: 20px;
          opacity: 0.3;
          margin-bottom: 4px;
          display: block;
        }
        .coming-soon-label {
          font-size: 11px;
          color: rgba(122,92,122,0.4);
          letter-spacing: 0.04em;
        }
        .soon-label {
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(122,92,122,0.4);
          text-align: center;
          margin: 14px 0 10px;
        }
      `}</style>

      <div className="app-container">
        <div className="home-header">
          <div className="home-header-left">
            <p className="home-label">Games</p>
            <h1 className="home-title">Play <em>together</em></h1>
          </div>
        </div>

        {/* Active game: Tic Tac Toe */}
        <div style={{ margin: '0 16px 12px' }}>
          <div className="section-label" style={{ padding: '0 4px', marginBottom: '10px' }}>Now playing</div>
        </div>

        <div className="games-lobby">
          <p className="games-lobby-sub">Challenge your partner to a round</p>

          <button className="btn-create" onClick={handleCreate} disabled={loading}>
            {loading ? 'Starting…' : 'Create game'}
          </button>

          <div className="games-divider"><span>or join</span></div>

          <div className="join-row">
            <input
              className="join-input"
              type="text"
              maxLength={6}
              placeholder="Enter game code"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn-join" onClick={handleJoin} disabled={loading || !joinCode.trim()}>
              Join
            </button>
          </div>
          {error && <p className="lobby-error">{error}</p>}
        </div>

        {/* Coming soon */}
        <p className="soon-label">More games coming</p>
        <div className="coming-soon-grid">
          {[
            { icon: '♟', label: 'Chess' },
            { icon: '🎯', label: 'Wordle' },
            { icon: '🃏', label: 'Cards' },
          ].map(g => (
            <div key={g.label} className="coming-soon-card">
              <span className="coming-soon-icon">{g.icon}</span>
              <span className="coming-soon-label">{g.label}</span>
            </div>
          ))}
        </div>

        <BottomNav activeTab="games" />
      </div>
    </>
  );
}