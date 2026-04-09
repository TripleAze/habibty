'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  makeMove, subscribeToGame, rematch, joinGame, GameState, getWinningCells,
} from '@/lib/games';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

function TicTacToeInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [copied, setCopied] = useState(false);
  const [rematching, setRematching] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.replace('/auth'); return; }
      setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToGame(gameId, setGame);
    return () => unsub();
  }, [gameId]);

  const mySymbol = game?.symbols?.[uid] ?? '';
  const isMyTurn = game?.turn === uid && game?.status === 'playing';
  const opponentUid = game?.players?.find(p => p !== uid) ?? '';
  const opponentName = game?.playerNames?.[opponentUid] ?? 'Partner';
  const myName = game?.playerNames?.[uid] ?? 'You';
  const opponentPhoto = game?.playerPhotos?.[opponentUid] ?? '';
  const myPhoto = game?.playerPhotos?.[uid] ?? '';

  const winCells = game?.winner ? getWinningCells(game.board) : [];
  const winCellSet = new Set(winCells);

  const iWon = game?.winner === uid;
  const iLost = game?.winner && game.winner !== uid;

  const statusText = () => {
    if (!game) return '';
    if (game.status === 'waiting') return 'Waiting for your partner…';
    if (game.status === 'finished') {
      if (game.isDraw) return "It's a draw!";
      return iWon ? 'You won! 🎉' : `${opponentName} won`;
    }
    return isMyTurn ? 'Your turn' : `${opponentName}'s turn`;
  };

  const handleCell = (i: number) => {
    if (!isMyTurn || !game || game.board[i] || game.status !== 'playing') return;
    makeMove(gameId, uid, i);
  };

  const handleRematch = async () => {
    setRematching(true);
    const newId = await rematch(gameId, uid);
    router.replace(`/games/tictactoe?id=${newId}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cellClass = (i: number) => {
    const val = game?.board[i] ?? '';
    const classes = ['ttt-cell'];
    if (!val) {
      classes.push('ttt-cell-empty');
      if (isMyTurn && game?.status === 'playing') classes.push('ttt-cell-hover');
    } else {
      classes.push(val === 'X' ? 'ttt-cell-x' : 'ttt-cell-o');
    }
    if (winCellSet.has(i)) classes.push('ttt-cell-win');
    return classes.join(' ');
  };

  return (
    <>
      <style>{`
        .ttt-container { padding-bottom: 100px; }

        .ttt-header {
          padding: 48px 24px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ttt-game-code {
          margin: 0 16px 12px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 11px 16px;
          border: 1px solid rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ttt-code-label {
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(122,92,122,0.5);
          margin-bottom: 2px;
        }
        .ttt-code-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          letter-spacing: 0.15em;
          color: #3D2B3D;
        }
        .ttt-copy-btn {
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(232,160,160,0.15);
          border: 1px solid rgba(232,160,160,0.3);
          font-size: 11px;
          color: #B06060;
          cursor: pointer;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .ttt-copy-btn:hover { background: rgba(232,160,160,0.25); }

        .ttt-status {
          margin: 0 16px 12px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          border-radius: 14px;
          padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ttt-status-text {
          font-size: 13px;
          color: var(--soft-ink);
        }
        .ttt-status-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .badge-your-turn { background: rgba(232,160,160,0.2); color: #B06060; }
        .badge-their-turn { background: rgba(201,184,216,0.25); color: #7A6A8A; }
        .badge-waiting { background: rgba(201,184,216,0.2); color: #7A6A8A; }
        .badge-won { background: rgba(168,213,162,0.25); color: #5A7A56; }
        .badge-lost { background: rgba(201,184,216,0.2); color: #7A6A8A; }
        .badge-draw { background: rgba(212,169,106,0.2); color: #9A7040; }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7; }

        .ttt-players {
          display: flex;
          gap: 8px;
          margin: 0 16px 12px;
        }
        .ttt-player {
          flex: 1;
          background: rgba(255,255,255,0.55);
          border-radius: 16px;
          padding: 12px;
          border: 1.5px solid rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
          gap: 10px;
          transition: border-color 0.2s;
        }
        .ttt-player.active-player {
          border-color: rgba(232,160,160,0.45);
          background: rgba(255,255,255,0.75);
        }
        .ttt-player-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid rgba(255,255,255,0.8);
          flex-shrink: 0;
        }
        .ttt-player-avatar-fallback {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F2C4CE, #C9B8D8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          color: #3D2B3D;
          flex-shrink: 0;
          border: 1.5px solid rgba(255,255,255,0.8);
        }
        .ttt-player-info { flex: 1; min-width: 0; }
        .ttt-player-label { font-size: 10px; color: rgba(122,92,122,0.55); letter-spacing: 0.08em; margin-bottom: 1px; }
        .ttt-player-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          color: #3D2B3D;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ttt-symbol-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 100px;
          flex-shrink: 0;
        }
        .sym-x { background: rgba(232,160,160,0.2); color: #B06060; }
        .sym-o { background: rgba(201,184,216,0.25); color: #7A6A8A; }

        .ttt-board-wrap {
          margin: 0 16px;
          background: rgba(255,255,255,0.62);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.8);
        }
        .ttt-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .ttt-cell {
          aspect-ratio: 1;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          border: 1.5px solid rgba(232,160,160,0.2);
          background: rgba(255,255,255,0.5);
          transition: all 0.18s ease;
          cursor: default;
          user-select: none;
        }
        .ttt-cell-empty { color: transparent; }
        .ttt-cell-hover { cursor: pointer; }
        .ttt-cell-hover:hover {
          background: rgba(232,160,160,0.08);
          border-color: rgba(232,160,160,0.35);
        }
        .ttt-cell-x {
          color: #E8A0A0;
          background: rgba(232,160,160,0.12);
          border-color: rgba(232,160,160,0.35);
        }
        .ttt-cell-o {
          color: #C9B8D8;
          background: rgba(201,184,216,0.15);
          border-color: rgba(201,184,216,0.4);
        }
        .ttt-cell-win {
          background: rgba(232,160,160,0.22) !important;
          border-color: #E8A0A0 !important;
        }

        .ttt-waiting {
          margin: 0 16px;
          background: rgba(255,255,255,0.55);
          border-radius: 20px;
          padding: 32px 20px;
          border: 1px solid rgba(255,255,255,0.7);
          text-align: center;
        }
        .ttt-waiting-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 300;
          font-style: italic;
          color: var(--soft-ink);
          margin-bottom: 8px;
        }
        .ttt-waiting-sub {
          font-size: 12px;
          color: rgba(122,92,122,0.55);
          margin-bottom: 20px;
        }
        .ttt-share-code {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(247,232,238,0.6);
          border: 1px solid rgba(232,160,160,0.3);
          border-radius: 14px;
          padding: 12px 20px;
          cursor: pointer;
        }
        .ttt-share-code-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          letter-spacing: 0.2em;
          color: #3D2B3D;
        }

        .ttt-actions {
          margin: 12px 16px 0;
          display: flex;
          gap: 8px;
        }
        .btn-rematch {
          flex: 1;
          padding: 14px;
          border-radius: 100px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 4px 16px rgba(232,160,160,0.3);
          letter-spacing: 0.04em;
        }
        .btn-rematch:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(232,160,160,0.4);
        }
        .btn-rematch:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-new-game {
          padding: 14px 18px;
          border-radius: 100px;
          border: 1.5px solid rgba(232,160,160,0.35);
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: var(--soft-ink);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-new-game:hover { background: rgba(232,160,160,0.08); }

        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .spinner-sm {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="app-container ttt-container">
        <div className="ttt-header">
          <div>
            <p className="home-label">Games</p>
            <h1 className="home-title">Tic <em>Tac</em> Toe</h1>
          </div>
          <Link href="/games" className="back-btn" style={{ marginBottom: 0 }}>← Back</Link>
        </div>

        {!game ? (
          <div className="loading-state"><div className="loading-spinner" /></div>
        ) : game.status === 'waiting' ? (
          /* ── WAITING LOBBY ── */
          <>
            <div className="ttt-waiting">
              <p className="ttt-waiting-title">Waiting for your partner…</p>
              <p className="ttt-waiting-sub">Share this code so they can join</p>
              <div className="ttt-share-code" onClick={copyCode}>
                <span className="ttt-share-code-val">{gameId}</span>
                <span style={{ fontSize: 11, color: '#B06060', fontWeight: 500 }}>
                  {copied ? 'Copied!' : 'Tap to copy'}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* ── ACTIVE GAME ── */
          <>
            {/* Game code */}
            <div className="ttt-game-code">
              <div>
                <div className="ttt-code-label">Game code</div>
                <div className="ttt-code-value">{gameId}</div>
              </div>
              <button className="ttt-copy-btn" onClick={copyCode}>
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>

            {/* Status */}
            <div className="ttt-status">
              <span className="ttt-status-text">{statusText()}</span>
              <span className={`ttt-status-badge ${
                game.status === 'finished'
                  ? iWon ? 'badge-won' : iLost ? 'badge-lost' : 'badge-draw'
                  : isMyTurn ? 'badge-your-turn' : 'badge-their-turn'
              }`}>
                <span className="badge-dot" />
                {game.status === 'finished'
                  ? iWon ? 'Winner!' : iLost ? 'Better luck next time' : 'Draw'
                  : isMyTurn ? 'Your turn' : 'Their turn'}
              </span>
            </div>

            {/* Players */}
            <div className="ttt-players">
              {/* Me */}
              <div className={`ttt-player ${isMyTurn && game.status === 'playing' ? 'active-player' : ''}`}>
                {myPhoto ? (
                  <img src={myPhoto} alt={myName} className="ttt-player-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="ttt-player-avatar-fallback">
                    {myName[0]?.toUpperCase() ?? 'Y'}
                  </div>
                )}
                <div className="ttt-player-info">
                  <div className="ttt-player-label">You</div>
                  <div className="ttt-player-name">{myName}</div>
                </div>
                <span className={`ttt-symbol-badge ${mySymbol === 'X' ? 'sym-x' : 'sym-o'}`}>
                  {mySymbol}
                </span>
              </div>

              {/* Opponent */}
              <div className={`ttt-player ${!isMyTurn && game.status === 'playing' ? 'active-player' : ''}`}>
                {opponentPhoto ? (
                  <img src={opponentPhoto} alt={opponentName} className="ttt-player-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="ttt-player-avatar-fallback">
                    {opponentName[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="ttt-player-info">
                  <div className="ttt-player-label">Partner</div>
                  <div className="ttt-player-name">{opponentName}</div>
                </div>
                {game.symbols[opponentUid] && (
                  <span className={`ttt-symbol-badge ${game.symbols[opponentUid] === 'X' ? 'sym-x' : 'sym-o'}`}>
                    {game.symbols[opponentUid]}
                  </span>
                )}
              </div>
            </div>

            {/* Board */}
            <div className="ttt-board-wrap">
              <div className="ttt-board">
                {game.board.map((val, i) => (
                  <div
                    key={i}
                    className={cellClass(i)}
                    onClick={() => handleCell(i)}
                  >
                    {val || ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Post-game actions */}
            {game.status === 'finished' && (
              <div className="ttt-actions">
                <button
                  className="btn-rematch"
                  onClick={handleRematch}
                  disabled={rematching}
                >
                  {rematching ? <span className="spinner-sm" /> : 'Rematch'}
                </button>
                <Link href="/games" className="btn-new-game">
                  New game
                </Link>
              </div>
            )}
          </>
        )}

        <BottomNav activeTab="games" />
      </div>
    </>
  );
}

export default function TicTacToePage() {
  return (
    <Suspense fallback={
      <div className="app-container">
        <div className="loading-state"><div className="loading-spinner" /></div>
      </div>
    }>
      <TicTacToeInner />
    </Suspense>
  );
}