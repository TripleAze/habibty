'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { makeMove, subscribeToGame, rematch, GameState, getWinningCells } from '@/lib/games';
import { useHeader } from '@/lib/HeaderContext';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import WaitingLobby from '@/components/games/WaitingLobby';

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
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [scoreboard, setScoreboard] = useState<any>(null);
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

  useEffect(() => {
    if (!uid || !game?.players || game.players.length < 2) return;
    const pairId = [...game.players].sort().join('_');
    return onSnapshot(doc(db, 'scoreboards', pairId), (snap) => {
      if (snap.exists()) setScoreboard(snap.data()?.tic_tac_toe);
    });
  }, [uid, game?.players]);

  useEffect(() => {
    if (game?.rematchId) {
      router.replace(`/games/tictactoe?id=${game.rematchId}`);
    }
  }, [game?.rematchId, router]);

  useEffect(() => {
    if (!game || !uid || game.status !== 'waiting') return;
    if (!game.players?.includes(uid)) {
      const doJoin = async () => {
        const { joinGame } = await import('@/lib/games');
        const user = auth?.currentUser;
        await joinGame(gameId, uid, user?.displayName || 'Partner', user?.photoURL || '');
      };
      doJoin();
    }
  }, [game, uid, gameId]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!uid) return <TTTSkeleton />;
  if (gameId && !game) return <TTTSkeleton />;

  if (!gameId && !game) {
    const handleCreateLocal = async () => {
      const { createGame: cg } = await import('@/lib/games');
      const user = auth?.currentUser;
      const id = await cg(uid, user?.displayName || 'You', user?.photoURL || '');
      router.push(`/games/tictactoe?id=${id}`);
    };

    return (
      <div className="game-lobby-screen">
        <div className="ttt-topbar-landing">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 20px 10px' }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p>
              <h1 className="ttt-title">Tic <em>Tac</em> Toe</h1>
            </div>
            <button className="ttt-exit-btn" onClick={() => router.push('/games')}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(232,160,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(232,160,160,0.3)' }}>
            ✕
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 28, color: '#3D2B3D', marginBottom: 8 }}>Tic Tac Toe</h2>
            <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', maxWidth: 260 }}>Classic 3×3 strategy. Play a quick game with your partner!</p>
          </div>
          <button onClick={handleCreateLocal} style={{ width: '100%', maxWidth: 240, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(232,160,160,0.2)' }}>
            Create New Game
          </button>
          <button onClick={() => router.push('/games')} style={{ fontSize: 13, color: '#7A5C7A', background: 'none', border: 'none', cursor: 'pointer' }}>
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (!game) return <TTTSkeleton />;

  if (game.status === 'waiting') {
    return (
      <WaitingLobby 
        gameId={gameId} 
        gameType="tictactoe" 
        myPhoto={game?.playerPhotos?.[uid]} 
        onCancel={() => router.push('/games')} 
      />
    );
  }

  return (
    <TicTacToePlaying
      game={game}
      uid={uid}
      gameId={gameId}
      router={router}
      scoreboard={scoreboard}
      showExit={showExit}
      setShowExit={setShowExit}
      rematching={rematching}
      setRematching={setRematching}
      copied={copied}
      setCopied={setCopied}
    />
  );
}

// ────────────────────────────────────────────────────────────
// PLAYING COMPONENT (Normalized)
// ────────────────────────────────────────────────────────────
function TicTacToePlaying({
  game, uid, gameId, router, scoreboard, showExit, setShowExit, rematching, setRematching, copied, setCopied
}: {
  game: GameState; uid: string; gameId: string; router: any; scoreboard: any; showExit: boolean; setShowExit: (b: boolean) => void; rematching: boolean; setRematching: (b: boolean) => void; copied: boolean; setCopied: (b: boolean) => void;
}) {
  const mySymbol = game?.symbols?.[uid] ?? '';
  const isMyTurn = game?.turn === uid && game?.status === 'playing';
  const opponentUid = game?.players?.find(p => p !== uid) ?? '';
  const opponentName = game?.playerNames?.[opponentUid] ?? 'Partner';
  const myName = game?.playerNames?.[uid] ?? 'You';
  const myPhoto = game?.playerPhotos?.[uid];
  const oppPhoto = game?.playerPhotos?.[opponentUid];
  const iWon = game?.winner === uid;

  const winCells = new Set(game?.winner && game?.board ? getWinningCells(game.board) : []);

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
        @keyframes scoreUpdate { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        .ttt-screen {
          display: flex; flex-direction: column;
          font-family: var(--font-dm-sans), sans-serif;
          padding-bottom: 40px;
        }
        .ttt-topbar {
          display: none;
        }
        .ttt-exit-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; color: #7A5C7A;
          backdrop-filter: blur(8px);
        }
        .ttt-title { font-family: var(--font-cormorant),serif; font-size: 22px; font-weight: 300; color: #3D2B3D; }
        .ttt-title em { font-style: italic; color: #7A5C7A; }
        .ttt-scoreboard {
          margin: 0 20px 12px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.45);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.7);
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          box-shadow: 0 4px 15px rgba(232,160,160,0.1);
        }
        .score-row { display: flex; align-items: center; gap: 16px; width: 100%; justify-content: center; }
        .score-val { font-family: var(--font-cormorant), serif; font-size: 28px; font-weight: 500; color: #3D2B3D; min-width: 24px; text-align: center; }
        .score-sep { font-size: 14px; color: #7A5C7A; opacity: 0.5; }
        .score-name { font-size: 12px; color: #3D2B3D; opacity: 0.8; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .draws-label { font-size: 10px; color: #7A5C7A; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
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
        }
        .ttt-player.active { border-color: rgba(232,160,160,0.5); background: rgba(255,255,255,0.8); }
        .ttt-pav { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .ttt-pav-fb { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#F2C4CE,#C9B8D8); display: flex; align-items: center; justify-content: center; font-family: var(--font-cormorant),serif; font-size: 15px; color: #3D2B3D; }
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
          font-family: var(--font-cormorant),serif; font-size: 40px; font-weight: 300;
          cursor: default; user-select: none; transition: all 0.18s ease;
        }
        .ttt-cell.playable { cursor: pointer; }
        .ttt-cell.playable:hover { background: rgba(232,160,160,0.1); border-color: rgba(232,160,160,0.4); }
        .ttt-cell.x { color: #E8A0A0; background: rgba(232,160,160,0.12); border-color: rgba(232,160,160,0.4); }
        .ttt-cell.o { color: #C9B8D8; background: rgba(201,184,216,0.15); border-color: rgba(201,184,216,0.5); }
        .ttt-cell.win { background: rgba(232,160,160,0.25) !important; border-color: #E8A0A0 !important; }
        .ttt-actions {
          padding: 12px 20px 32px; flex-shrink: 0; display: flex; gap: 8px;
        }
        .ttt-btn-main { flex: 1; padding: 14px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-size: 14px; font-weight: 500; cursor: pointer; }
        .ttt-btn-sec { padding: 14px 18px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; color: #7A5C7A; font-size: 13px; cursor: pointer; }
        .ttt-code-row { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 20px 8px; flex-shrink: 0; }
        .ttt-code-val { font-family: var(--font-cormorant),serif; font-size: 15px; letter-spacing: 0.12em; color: rgba(61,43,61,0.5); }
        .ttt-code-copy { font-size: 11px; color: rgba(122,92,122,0.5); background: none; border: none; cursor: pointer; }
      `}</style>

      {showExit && (
        <ExitSheet
          onResume={() => setShowExit(false)}
          onMessages={() => router.push('/inbox')}
          onLeave={() => router.push('/games')}
        />
      )}

      {game.status === 'waiting' ? (
        <WaitingLobby 
          gameId={gameId} 
          gameType="tictactoe" 
          myPhoto={myPhoto} 
          onCancel={() => router.push('/games')} 
        />
      ) : (
        <div className="game-active-screen">
          <GameScreen title="Tic <em>Tac</em> Toe" onExit={() => setShowExit(true)}>
            <div className="ttt-screen">
              {scoreboard && (
          <div className="ttt-scoreboard">
            <div className="score-row">
              <span className="score-name">{game?.playerNames?.[([...(game?.players || [])].sort()[0])] || 'Partner'}</span>
              <span className="score-val">{scoreboard.winsA}</span>
              <span className="score-sep">—</span>
              <span className="score-val">{scoreboard.winsB}</span>
              <span className="score-name">{game?.playerNames?.[([...(game?.players || [])].sort()[1])] || 'Partner'}</span>
            </div>
            {scoreboard.draws > 0 && <span className="draws-label">{scoreboard.draws} Draws</span>}
          </div>
        )}

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

          <div className="ttt-board-wrap">
            <div className="ttt-board">
              {game.board.map((val, i) => (
                <div
                  key={i}
                  className={[
                    'ttt-cell',
                    val === 'X' ? 'x' : val === 'O' ? 'o' : '',
                    winCells.has(i) ? 'win' : '',
                    !val && isMyTurn && game?.status === 'playing' ? 'playable' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleCell(i)}
                >
                  {val}
                </div>
              ))}
            </div>
          </div>

          <div className="ttt-code-row">
            <span className="ttt-code-val">{gameId}</span>
            <button className="ttt-code-copy" onClick={copyCode}>{copied ? 'Copied' : 'Copy code'}</button>
          </div>

          {game.status === 'finished' && (
            <div className="ttt-actions">
              <button className="ttt-btn-main" onClick={handleRematch} disabled={rematching}>
                {rematching ? 'Starting…' : 'Rematch'}
              </button>
              <button className="ttt-btn-sec" onClick={() => router.push('/games')}>Games</button>
            </div>
          )}
          {game.status === 'playing' && <div style={{ height: 32 }} />}
            </div>
          </GameScreen>
        </div>
      )}
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