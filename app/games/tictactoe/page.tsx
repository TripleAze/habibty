'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { makeMove, subscribeToGame, rematch, GameState, getWinningCells } from '@/lib/games';

// ── EXIT SHEET ────────────────────────────────────────────
function ExitSheet({
  onResume, onMessages, onLeave,
}: { onResume: () => void; onMessages: () => void; onLeave: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(61,43,61,0.55)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, padding: '28px 24px 40px',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,184,216,0.4)', margin: '0 auto 24px' }} />
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center', marginBottom: 6 }}>Leave game?</p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.6)', textAlign: 'center', marginBottom: 24 }}>Your game is saved — you can come back anytime</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onResume} style={{ padding: '14px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Resume game
          </button>
          <button onClick={onMessages} style={{ padding: '14px', borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(232,160,160,0.35)', color: '#7A5C7A', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Open messages
          </button>
          <button onClick={onLeave} style={{ padding: '14px', borderRadius: 100, background: 'transparent', border: 'none', color: '#B06060', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Leave game
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SKELETON ──────────────────────────────────────────────
function TTTSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 160, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, width: 260 }}>
        {Array(9).fill(0).map((_,i) => (
          <div key={i} style={{ aspectRatio: 1, borderRadius: 14, background: 'rgba(255,255,255,0.4)' }} />
        ))}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
function TicTacToeInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => { if (!u) router.replace('/auth'); else setUid(u.uid); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToGame(gameId, setGame);
    return () => unsub();
  }, [gameId]);

  // Lock body scroll while in game
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!game || !uid) return <TTTSkeleton />;

  const mySymbol = game.symbols?.[uid] ?? '';
  const isMyTurn = game.turn === uid && game.status === 'playing';
  const opponentUid = game.players?.find(p => p !== uid) ?? '';
  const opponentName = game.playerNames?.[opponentUid] ?? 'Partner';
  const myName = game.playerNames?.[uid] ?? 'You';
  const myPhoto = game.playerPhotos?.[uid];
  const oppPhoto = game.playerPhotos?.[opponentUid];
  const iWon = game.winner === uid;
  const iLost = game.winner && game.winner !== uid;

  const winCells = new Set(game.winner ? getWinningCells(game.board) : []);

  const handleCell = (i: number) => {
    if (!isMyTurn || !game || game.board[i] || game.status !== 'playing') return;
    makeMove(gameId, uid, i);
  };

  const handleRematch = async () => {
    setRematching(true);
    const { rematch: rm } = await import('@/lib/games');
    const newId = await rm(gameId, uid);
    router.replace(`/games/tictactoe?id=${newId}`);
  };

  const copyCode = () => { navigator.clipboard.writeText(gameId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const statusMsg = () => {
    if (game.status === 'waiting') return 'Waiting for partner…';
    if (game.status === 'finished') return iWon ? 'You won! 🎉' : game.isDraw ? "It's a draw!" : `${opponentName} won`;
    return isMyTurn ? 'Your turn' : `${opponentName}'s turn`;
  };

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes popIn { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .ttt-screen {
          position: fixed; inset: 0; overflow: hidden;
          background: linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%);
          display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif;
        }
        .ttt-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 48px 20px 12px; flex-shrink: 0;
        }
        .ttt-exit-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; color: #7A5C7A;
          backdrop-filter: blur(8px);
        }
        .ttt-title { font-family: 'Cormorant Garamond',serif; font-size: 22px; font-weight: 300; color: #3D2B3D; }
        .ttt-title em { font-style: italic; color: #7A5C7A; }

        .ttt-status-pill {
          margin: 0 20px 12px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.65);
          backdrop-filter: blur(8px);
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .ttt-status-txt { font-size: 13px; color: #7A5C7A; }
        .ttt-badge { font-size: 10px; font-weight: 500; padding: 4px 10px; border-radius: 100px; display: flex; align-items: center; gap: 4px; }
        .ttt-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7; }
        .badge-mine { background: rgba(232,160,160,0.2); color: #B06060; animation: pulse 2s infinite; }
        .badge-theirs { background: rgba(201,184,216,0.25); color: #7A6A8A; }
        .badge-win { background: rgba(168,213,162,0.25); color: #5A7A56; }
        .badge-draw { background: rgba(212,169,106,0.2); color: #9A7040; }

        .ttt-players {
          display: flex; gap: 8px; margin: 0 20px 12px; flex-shrink: 0;
        }
        .ttt-player {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.55); border-radius: 14px;
          padding: 10px 12px; border: 1.5px solid rgba(255,255,255,0.7);
          transition: border-color 0.2s;
        }
        .ttt-player.active { border-color: rgba(232,160,160,0.5); background: rgba(255,255,255,0.8); }
        .ttt-pav { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.8); }
        .ttt-pav-fb { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#F2C4CE,#C9B8D8); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond',serif; font-size: 15px; color: #3D2B3D; flex-shrink: 0; }
        .ttt-pname { font-size: 13px; color: #3D2B3D; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ttt-sym { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 100px; }
        .sym-x { background: rgba(232,160,160,0.2); color: #B06060; }
        .sym-o { background: rgba(201,184,216,0.25); color: #7A6A8A; }

        .ttt-board-wrap {
          flex: 1; display: flex; align-items: center; justify-content: center;
          padding: 0 20px; min-height: 0;
        }
        .ttt-board {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 10px; width: 100%; max-width: 320px;
        }
        .ttt-cell {
          aspect-ratio: 1; border-radius: 16px;
          background: rgba(255,255,255,0.65); backdrop-filter: blur(8px);
          border: 1.5px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond',serif; font-size: 40px; font-weight: 300;
          cursor: default; user-select: none; transition: all 0.18s ease;
        }
        .ttt-cell.playable { cursor: pointer; }
        .ttt-cell.playable:hover { background: rgba(232,160,160,0.1); border-color: rgba(232,160,160,0.4); }
        .ttt-cell.x { color: #E8A0A0; background: rgba(232,160,160,0.12); border-color: rgba(232,160,160,0.4); animation: popIn 0.25s ease; }
        .ttt-cell.o { color: #C9B8D8; background: rgba(201,184,216,0.15); border-color: rgba(201,184,216,0.5); animation: popIn 0.25s ease; }
        .ttt-cell.win { background: rgba(232,160,160,0.25) !important; border-color: #E8A0A0 !important; }

        .ttt-actions {
          padding: 12px 20px 32px; flex-shrink: 0; display: flex; gap: 8px;
        }
        .ttt-btn-main { flex: 1; padding: 14px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans',sans-serif; }
        .ttt-btn-sec { padding: 14px 18px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; color: #7A5C7A; font-size: 13px; cursor: pointer; font-family: 'DM Sans',sans-serif; white-space: nowrap; }

        .ttt-code-row { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 20px 8px; flex-shrink: 0; }
        .ttt-code-val { font-family: 'Cormorant Garamond',serif; font-size: 15px; letter-spacing: 0.12em; color: rgba(61,43,61,0.5); }
        .ttt-code-copy { font-size: 11px; color: rgba(122,92,122,0.5); background: none; border: none; cursor: pointer; font-family: 'DM Sans',sans-serif; }

        .ttt-waiting-center {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
        }
        .ttt-waiting-code { font-family: 'Cormorant Garamond',serif; font-size: 36px; letter-spacing: 0.2em; color: #3D2B3D; cursor: pointer; }
      `}</style>

      {showExit && (
        <ExitSheet
          onResume={() => setShowExit(false)}
          onMessages={() => router.push('/inbox')}
          onLeave={() => router.push('/games')}
        />
      )}

      <div className="ttt-screen">
        {/* Top bar */}
        <div className="ttt-topbar">
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p>
            <h1 className="ttt-title">Tic <em>Tac</em> Toe</h1>
          </div>
          <button className="ttt-exit-btn" onClick={() => setShowExit(true)}>✕</button>
        </div>

        {game.status === 'waiting' ? (
          <div className="ttt-waiting-center">
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic', color: '#7A5C7A' }}>Share this code with your partner</p>
            <div className="ttt-waiting-code" onClick={copyCode}>{gameId}</div>
            <p style={{ fontSize: 11, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy'}</p>
          </div>
        ) : (
          <>
            {/* Status */}
            <div className="ttt-status-pill">
              <span className="ttt-status-txt">{statusMsg()}</span>
              <span className={`ttt-badge ${
                game.status === 'finished'
                  ? iWon ? 'badge-win' : game.isDraw ? 'badge-draw' : 'badge-theirs'
                  : isMyTurn ? 'badge-mine' : 'badge-theirs'
              }`}>
                <span className="ttt-badge-dot" />
                {game.status === 'finished' ? (iWon ? 'Winner!' : game.isDraw ? 'Draw' : 'Lost') : isMyTurn ? 'Your turn' : 'Their turn'}
              </span>
            </div>

            {/* Players */}
            <div className="ttt-players">
              {[
                { u: uid, name: myName, photo: myPhoto, active: isMyTurn },
                { u: opponentUid, name: opponentName, photo: oppPhoto, active: !isMyTurn },
              ].map(p => (
                <div key={p.u} className={`ttt-player ${p.active && game.status === 'playing' ? 'active' : ''}`}>
                  {p.photo
                    ? <img src={p.photo} className="ttt-pav" referrerPolicy="no-referrer" alt={p.name} />
                    : <div className="ttt-pav-fb">{p.name[0]?.toUpperCase()}</div>}
                  <span className="ttt-pname">{p.u === uid ? 'You' : p.name}</span>
                  <span className={`ttt-sym ${game.symbols?.[p.u] === 'X' ? 'sym-x' : 'sym-o'}`}>
                    {game.symbols?.[p.u] || '?'}
                  </span>
                </div>
              ))}
            </div>

            {/* Board */}
            <div className="ttt-board-wrap">
              <div className="ttt-board">
                {game.board.map((val, i) => (
                  <div
                    key={i}
                    className={[
                      'ttt-cell',
                      val === 'X' ? 'x' : val === 'O' ? 'o' : '',
                      winCells.has(i) ? 'win' : '',
                      !val && isMyTurn && game.status === 'playing' ? 'playable' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => handleCell(i)}
                  >
                    {val}
                  </div>
                ))}
              </div>
            </div>

            {/* Code row */}
            <div className="ttt-code-row">
              <span className="ttt-code-val">{gameId}</span>
              <button className="ttt-code-copy" onClick={copyCode}>{copied ? 'Copied' : 'Copy code'}</button>
            </div>

            {/* Actions */}
            {game.status === 'finished' && (
              <div className="ttt-actions">
                <button className="ttt-btn-main" onClick={handleRematch} disabled={rematching}>
                  {rematching ? 'Starting…' : 'Rematch'}
                </button>
                <button className="ttt-btn-sec" onClick={() => router.push('/games')}>Games</button>
              </div>
            )}
            {game.status === 'playing' && <div style={{ height: 32 }} />}
          </>
        )}
      </div>
    </>
  );
}

export default function TicTacToePage() {
  return (
    <Suspense fallback={<TTTSkeleton />}>
      <TicTacToeInner />
    </Suspense>
  );
}