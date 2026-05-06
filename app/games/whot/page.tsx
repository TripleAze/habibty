'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  WhotCard, WhotGameState, Suit,
  subscribeToWhotGame, subscribeToWhotHand, playCard, drawCard, rematchWhot,
  canPlay, getEffectLabel, SUIT_SYMBOL, SUIT_COLOR, SUIT_BG, cardLabel,
  createWhotGame,
} from '@/lib/whot';
import { useHeader } from '@/lib/HeaderContext';

// ── EXIT SHEET ────────────────────────────────────────────
function ExitSheet({ onResume, onMessages, onLeave }: { onResume: () => void; onMessages: () => void; onLeave: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(61,43,61,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{
        background: 'white', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, 
        padding: `28px 24px calc(24px + env(safe-area-inset-bottom, 20px))`,
        maxHeight: '85vh', overflowY: 'auto',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,184,216,0.4)', margin: '0 auto 24px' }} />
        <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center', marginBottom: 6 }}>Leave game?</p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.6)', textAlign: 'center', marginBottom: 24 }}>Your game is saved — come back anytime</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onResume} style={{ padding: 14, borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>Resume game</button>
          <button onClick={onMessages} style={{ padding: 14, borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(232,160,160,0.35)', color: '#7A5C7A', fontSize: 14, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>Open messages</button>
          <button onClick={onLeave} style={{ padding: 14, borderRadius: 100, background: 'transparent', border: 'none', color: '#B06060', fontSize: 13, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>Leave game</button>
        </div>
      </div>
    </div>
  );
}

// ── SUIT PICKER ───────────────────────────────────────────
function SuitPicker({ onPick }: { onPick: (s: Suit) => void }) {
  const suits: Exclude<Suit, 'whot'>[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(61,43,61,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 24, padding: '28px 20px', width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 4 }}>Call a suit</p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.55)', marginBottom: 20 }}>Your partner must match this suit</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {suits.map(s => (
            <button key={s} onClick={() => onPick(s)} style={{
              width: 58, height: 76, borderRadius: 12,
              background: SUIT_BG[s], border: `2px solid ${SUIT_COLOR[s]}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              cursor: 'pointer', transition: 'transform 0.15s',
            }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 24, color: SUIT_COLOR[s] }}>{SUIT_SYMBOL[s]}</span>
              <span style={{ fontSize: 9, color: SUIT_COLOR[s], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SINGLE CARD ───────────────────────────────────────────
function WhotCardView({
  card, playable, selected, onClick, style: extraStyle = {},
}: {
  card: WhotCard; playable?: boolean; selected?: boolean;
  onClick?: () => void; style?: React.CSSProperties;
}) {
  const effect = getEffectLabel(card);
  return (
    <div onClick={onClick} style={{
      width: 58, height: 88,
      borderRadius: 11,
      background: selected ? SUIT_COLOR[card.suit] : SUIT_BG[card.suit],
      border: `2px solid ${selected ? SUIT_COLOR[card.suit] : playable ? SUIT_COLOR[card.suit] : 'rgba(200,180,200,0.3)'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: playable ? 'pointer' : 'default',
      opacity: playable || selected ? 1 : 0.5,
      transition: 'all 0.18s ease',
      userSelect: 'none', position: 'relative',
      flexShrink: 0,
      boxShadow: selected ? `0 8px 20px ${SUIT_COLOR[card.suit]}55` : '0 2px 6px rgba(0,0,0,0.08)',
      ...extraStyle,
    }}>
      <span style={{ fontSize: 22, color: selected ? 'white' : SUIT_COLOR[card.suit], fontFamily: "var(--font-cormorant),serif", lineHeight: 1, fontWeight: 400 }}>
        {card.suit === 'whot' ? 'W' : cardLabel(card)}
      </span>
      <span style={{ fontSize: 14, color: selected ? 'rgba(255,255,255,0.85)' : SUIT_COLOR[card.suit] }}>
        {SUIT_SYMBOL[card.suit]}
      </span>
      {effect && (
        <span style={{
          position: 'absolute', bottom: 3, left: 0, right: 0, textAlign: 'center',
          fontSize: 6.5, color: selected ? 'rgba(255,255,255,0.7)' : SUIT_COLOR[card.suit],
          letterSpacing: '0.04em', fontFamily: "var(--font-dm-sans),sans-serif", fontWeight: 600,
          textTransform: 'uppercase',
        }}>{effect}</span>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
function WhotInner() {
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<WhotGameState | null>(null);
  const [myHand, setMyHand] = useState<WhotCard[]>([]);
  const [selected, setSelected] = useState<WhotCard | null>(null);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scoreboard, setScoreboard] = useState<any>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => { if (!u) router.replace('/auth'); else setUid(u.uid); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToWhotGame(gameId, setGame);
    return () => unsub();
  }, [gameId]);

  // Subscribe to scoreboard
  useEffect(() => {
    if (!uid || !game?.players || game.players.length < 2) return;
    const pairId = [...game.players].sort().join('_');
    return onSnapshot(doc(db, 'scoreboards', pairId), (snap) => {
      if (snap.exists()) setScoreboard(snap.data()?.whot);
    });
  }, [uid, game?.players]);

  // Subscribe to own hand
  useEffect(() => {
    if (!gameId || !uid) return;
    const unsub = subscribeToWhotHand(gameId, uid, setMyHand);
    return () => unsub();
  }, [gameId, uid]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-join if user is not in the players list and game is waiting
  useEffect(() => {
    if (!game || !uid || game.status !== 'waiting') return;
    if (!game.players?.includes(uid)) {
      const doJoin = async () => {
        const { joinWhotGame } = await import('@/lib/whot');
        const user = auth?.currentUser;
        await joinWhotGame(gameId, uid, user?.displayName || 'Partner', user?.photoURL || '');
      };
      doJoin();
    }
  }, [game, uid, gameId]);

  // Clear error
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 2200);
    return () => clearTimeout(t);
  }, [actionError]);

  if (!uid) return <WhotSkeleton />;

  // No game ID in URL - show landing/create screen
  if (!gameId && !game) {
    const handleCreateLocal = async () => {
      const user = auth?.currentUser;
      const id = await createWhotGame(uid, user?.displayName || 'You', user?.photoURL || '');
      router.push(`/games/whot?id=${id}`);
    };

    return (
      <div className="whot-screen">
        <div className="whot-topbar">
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p>
            <h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontWeight: 300, color: '#3D2B3D' }}>
              Naija <em style={{ fontStyle: 'italic', color: '#7A5C7A' }}>Whot</em>
            </h1>
          </div>
          <button className="whot-exit" onClick={() => router.push('/games')}>✕</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 24px' }}>
          <div style={{ width: 84, height: 112, borderRadius: 16, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, color: 'white', fontFamily: "var(--font-cormorant),serif", fontStyle: 'italic', boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
            W
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 30, color: '#3D2B3D', marginBottom: 10 }}>Naija Whot</h2>
            <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.65)', maxWidth: 280, lineHeight: 1.5 }}>
              The legendary Nigerian card game. Play special cards, pick from market, and be the first to go "Whot!"
            </p>
          </div>
          <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={handleCreateLocal} style={{ width: '100%', padding: '18px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 20px rgba(232,160,160,0.2)' }}>
              Create New Game
            </button>
            <button onClick={() => router.push('/games')} style={{ width: '100%', padding: '16px', borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(232,160,160,0.3)', color: '#7A5C7A', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) return <WhotSkeleton />;

  const opponent = game.players?.find(p => p !== uid) ?? '';
  const oppHandCount = game.handCounts?.[opponent] ?? 0;
  const isMyTurn = game.turn === uid && game.status === 'playing';
  const myName = game.playerNames?.[uid] ?? 'You';
  const oppName = game.playerNames?.[opponent] ?? 'Partner';
  const myPhoto = game.playerPhotos?.[uid];
  const oppPhoto = game.playerPhotos?.[opponent];
  const iWon = game.winner === uid;
  const hasLastCard = game.lastCardUids?.includes(uid);
  const oppLastCard = game.lastCardUids?.includes(opponent);

  const playableIds = new Set(
    myHand.filter(c => canPlay(c, game.topCard, game.calledSuit, game.pendingPickup)).map(c => c.id)
  );

  const handleCardTap = (card: WhotCard) => {
    if (!isMyTurn || !playableIds.has(card.id)) return;
    setSelected(prev => prev?.id === card.id ? null : card);
  };

  const handlePlay = async () => {
    if (!selected) return;
    if (selected.suit === 'whot') { setShowSuitPicker(true); return; }
    const card = selected;
    setSelected(null);
    const res = await playCard(gameId, uid, card);
    if (!res.ok) setActionError(res.error ?? 'Cannot play that card');
  };

  const handleSuitPick = async (suit: Suit) => {
    setShowSuitPicker(false);
    if (!selected) return;
    const card = selected;
    setSelected(null);
    const res = await playCard(gameId, uid, card, suit);
    if (!res.ok) setActionError(res.error ?? 'Error');
  };

  const handleDraw = async () => {
    if (!isMyTurn) return;
    const res = await drawCard(gameId, uid);
    if (!res.ok) setActionError(res.error ?? 'Cannot draw');
  };

  const handleRematch = async () => {
    setRematching(true);
    const newId = await rematchWhot(gameId);
    router.replace(`/games/whot?id=${newId}`);
  };

  const copyCode = () => { navigator.clipboard.writeText(gameId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const statusText = () => {
    if (game.status === 'waiting') return 'Waiting for partner…';
    if (game.status === 'finished') return iWon ? 'You won! 🎉' : `${oppName} won`;
    if (game.pendingPickup > 0) return isMyTurn ? `Pick ${game.pendingPickup} or counter!` : `${oppName} must pick ${game.pendingPickup}`;
    if (game.calledSuit) return isMyTurn ? `Play ${game.calledSuit} or Whot!` : `${oppName} called ${game.calledSuit}`;
    return isMyTurn ? 'Your turn' : `${oppName}'s turn`;
  };

  // Fan layout math — cards slightly spread, selected lifts up
  const getFanStyle = (i: number, total: number, isSelected: boolean): React.CSSProperties => {
    const maxAngle = Math.min(4 * (total - 1), 30);
    const angle = total > 1 ? -maxAngle / 2 + (maxAngle / (total - 1)) * i : 0;
    const overlap = Math.min(48, (total > 10 ? 46 : total > 7 ? 42 : total > 4 ? 34 : 26));
    const xOffset = i * (58 - overlap) - ((total - 1) * (58 - overlap)) / 2;
    const yOffset = Math.abs(angle) * 0.8;
    return {
      transform: `translateX(${xOffset}px) rotate(${angle}deg) translateY(${isSelected ? -18 : yOffset}px)`,
      transformOrigin: 'bottom center',
      position: 'absolute',
      zIndex: isSelected ? total + 10 : i,
      transition: 'transform 0.18s ease',
    };
  };

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes popIn   { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }

        .whot-screen {
          position: fixed; inset: 0;
          top: calc(0px + env(safe-area-inset-top, 0px));
          overflow: hidden;
          background: linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%);
          display: flex; flex-direction: column;
          font-family: var(--font-dm-sans), sans-serif;
        }

        .whot-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px 10px; flex-shrink: 0; }
        .whot-exit { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: #7A5C7A; backdrop-filter: blur(8px); flex-shrink: 0; }

        .whot-status { margin: 0 16px 8px; background: rgba(255,255,255,0.65); backdrop-filter: blur(8px); border-radius: 100px; padding: 9px 14px; border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        .whot-status-txt { font-size: 12px; color: #7A5C7A; }
        .w-badge { font-size: 10px; font-weight: 500; padding: 3px 10px; border-radius: 100px; display: flex; align-items: center; gap: 4px; }
        .w-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7; }
        .b-mine { background: rgba(232,160,160,0.2); color: #B06060; animation: pulse 2s infinite; }
        .b-theirs { background: rgba(201,184,216,0.25); color: #7A6A8A; }
        .b-win { background: rgba(168,213,162,0.25); color: #5A7A56; }
        .b-pick { background: rgba(212,169,106,0.2); color: #9A7040; }

        .whot-players { display: flex; gap: 6px; margin: 0 16px 8px; flex-shrink: 0; }
        .whot-player { flex: 1; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.55); border-radius: 12px; padding: 8px 10px; border: 1.5px solid rgba(255,255,255,0.7); transition: border-color 0.2s; }
        .whot-player.active { border-color: rgba(232,160,160,0.5); background: rgba(255,255,255,0.8); }
        .w-av { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .w-av-fb { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg,#F2C4CE,#C9B8D8); display: flex; align-items: center; justify-content: center; font-family: var(--font-cormorant),serif; font-size: 13px; color: #3D2B3D; flex-shrink: 0; }
        .w-pname { font-size: 12px; color: #3D2B3D; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .w-count { font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 100px; background: rgba(201,184,216,0.2); color: #7A6A8A; white-space: nowrap; flex-shrink: 0; }
        .w-lastcard { background: rgba(232,160,160,0.2) !important; color: #B06060 !important; animation: pulse 1.5s infinite; }

        .whot-opp-hand { display: flex; align-items: center; justify-content: center; gap: -8px; padding: 0 20px 8px; flex-shrink: 0; }
        .card-back-sm { width: 22px; height: 34px; border-radius: 5px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: 1.5px solid rgba(255,255,255,0.6); flex-shrink: 0; margin-right: -8px; box-shadow: 1px 0 3px rgba(0,0,0,0.08); }

        .whot-table { flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 24px; padding: 0 20px 8px; }
        .deck-pile { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; }
        .deck-back { width: 64px; height: 96px; border-radius: 11px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.6); transition: transform 0.15s; box-shadow: 0 4px 12px rgba(200,140,160,0.2); }
        .deck-back:hover { transform: scale(1.04); }
        .pile-lbl { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(122,92,122,0.5); font-weight: 500; }
        .called-pill { margin-top: 4px; font-size: 10px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }

        .whot-hand-area { flex: 1; display: flex; align-items: flex-end; justify-content: center; min-height: 0; padding-bottom: 8px; position: relative; }
        .hand-fan { position: relative; height: 120px; width: 100%; display: flex; align-items: flex-end; justify-content: center; }

        .whot-action-bar { flex-shrink: 0; padding: 8px 16px 32px; display: flex; gap: 8px; }
        .btn-play { flex: 1; padding: 13px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-dm-sans),sans-serif; transition: all 0.2s; box-shadow: 0 4px 14px rgba(232,160,160,0.3); }
        .btn-play:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-play:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-draw-card { padding: 13px 18px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; font-family: var(--font-dm-sans),sans-serif; font-size: 13px; color: #7A5C7A; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .btn-draw-card:hover:not(:disabled) { background: rgba(232,160,160,0.08); }
        .btn-draw-card:disabled { opacity: 0.4; cursor: not-allowed; }

        .action-err { font-size: 12px; color: #c0706a; text-align: center; padding: 0 16px 6px; animation: fadeIn 0.2s ease; flex-shrink: 0; }

        .whot-finished { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 10px; }
        .fin-title { font-family: var(--font-cormorant),serif; font-size: 28px; font-weight: 300; font-style: italic; color: #3D2B3D; }
        .btn-rematch { width: 100%; max-width: 280px; padding: 14px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-size: 14px; font-weight: 500; cursor: pointer; font-family: var(--font-dm-sans),sans-serif; box-shadow: 0 4px 16px rgba(232,160,160,0.3); }
        .btn-back-games { width: 100%; max-width: 280px; padding: 13px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; color: #7A5C7A; font-size: 13px; cursor: pointer; font-family: var(--font-dm-sans),sans-serif; }

        .whot-waiting { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
        .wait-code { font-family: var(--font-cormorant),serif; font-size: 38px; letter-spacing: 0.2em; color: #3D2B3D; cursor: pointer; }

        .code-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; padding: 0 16px 6px; }
        .code-row-val { font-family: var(--font-cormorant),serif; font-size: 14px; letter-spacing: 0.12em; color: rgba(61,43,61,0.45); }
        .code-row-btn { font-size: 11px; color: rgba(122,92,122,0.45); background: none; border: none; cursor: pointer; font-family: var(--font-dm-sans),sans-serif; }
      `}</style>

      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      {showSuitPicker && <SuitPicker onPick={handleSuitPick} />}

      <div className="whot-screen">
        {/* Top bar */}
        <div className="whot-topbar">
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p>
            <h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontWeight: 300, color: '#3D2B3D' }}>
              Naija <em style={{ fontStyle: 'italic', color: '#7A5C7A' }}>Whot</em>
            </h1>
          </div>
          <button className="whot-exit" onClick={() => setShowExit(true)}>✕</button>
        </div>

        {/* Scoreboard Strip */}
        {scoreboard && (
          <div style={{
            margin: '0 20px 12px',
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', width: '100%' }}>
              <span style={{ fontSize: 11, color: '#3D2B3D', opacity: 0.8, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {game.playerNames[[...game.players].sort()[0]] || 'Partner'}
              </span>
              <span style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 24, fontWeight: 500, color: '#3D2B3D' }}>{scoreboard.winsA}</span>
              <span style={{ fontSize: 12, color: '#7A5C7A', opacity: 0.4 }}>—</span>
              <span style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 24, fontWeight: 500, color: '#3D2B3D' }}>{scoreboard.winsB}</span>
              <span style={{ fontSize: 11, color: '#3D2B3D', opacity: 0.8, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {game.playerNames[[...game.players].sort()[1]] || 'Partner'}
              </span>
            </div>
          </div>
        )}

        {game.status === 'waiting' ? (
          <div className="whot-waiting">
            <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 18, fontStyle: 'italic', color: '#7A5C7A' }}>Share code with partner</p>
            <div className="wait-code" onClick={copyCode}>{gameId}</div>
            <p style={{ fontSize: 11, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy'}</p>
          </div>
        ) : game.status === 'finished' ? (
          <div className="whot-finished">
            <p className="fin-title">{iWon ? 'When you\'re good, you\'re good!! 😌🎉' : 'Do Better Next Time 😘💌'}</p>
            <p style={{ fontSize: 13, color: 'rgba(122,92,122,0.6)', marginBottom: 8 }}>{iWon ? 'There\'s something about being good, it\'s not a fluke 😎.' : 'Better luck next round'}</p>
            <button className="btn-rematch" onClick={handleRematch} disabled={rematching}>
              {rematching ? 'Starting…' : 'Rematch'}
            </button>
            <button className="btn-back-games" onClick={() => router.push('/games')}>Back to games</button>
          </div>
        ) : (
          <>
            {/* Status */}
            <div className="whot-status">
              <span className="whot-status-txt">{statusText()}</span>
              <span className={`w-badge ${game.pendingPickup > 0 ? 'b-pick' : isMyTurn ? 'b-mine' : 'b-theirs'}`}>
                <span className="w-dot" />
                {game.pendingPickup > 0 ? `Pick ${game.pendingPickup}` : isMyTurn ? 'Your turn' : 'Their turn'}
              </span>
            </div>

            {/* Players */}
            <div className="whot-players">
              {[
                { u: uid, name: 'You', photo: myPhoto, active: isMyTurn, lc: hasLastCard, count: myHand.length },
                { u: opponent, name: oppName, photo: oppPhoto, active: !isMyTurn, lc: oppLastCard, count: oppHandCount },
              ].map(p => (
                <div key={p.u} className={`whot-player ${p.active && game.status === 'playing' ? 'active' : ''}`}>
                  {p.photo
                    ? <img src={p.photo} className="w-av" referrerPolicy="no-referrer" alt={p.name} />
                    : <div className="w-av-fb">{p.name[0]?.toUpperCase()}</div>}
                  <span className="w-pname">{p.name}</span>
                  <span className={`w-count ${p.lc ? 'w-lastcard' : ''}`}>
                    {p.lc ? 'Last!' : `${p.count}`}
                  </span>
                </div>
              ))}
            </div>

            {/* Opponent card backs */}
            <div className="whot-opp-hand">
              {Array(Math.min(oppHandCount, 14)).fill(0).map((_, i) => (
                <div key={i} className="card-back-sm" style={{ marginRight: i < Math.min(oppHandCount, 14) - 1 ? -10 : 0 }} />
              ))}
              {oppHandCount > 14 && (
                <span style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginLeft: 8 }}>+{oppHandCount - 14}</span>
              )}
            </div>

            {/* Table: Deck + Top Card */}
            <div className="whot-table">
              <div className="deck-pile" onClick={isMyTurn ? handleDraw : undefined}>
                <div className="deck-back">
                  <span style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, color: 'white', fontStyle: 'italic' }}>W</span>
                </div>
                <span className="pile-lbl">{game.deckCount ?? 0} cards</span>
                {isMyTurn && <span style={{ fontSize: 10, color: '#B06060', fontWeight: 500 }}>{game.pendingPickup > 0 ? `Draw ${game.pendingPickup}` : 'Tap to draw'}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <WhotCardView card={game.topCard} />
                {game.calledSuit && (
                  <div className="called-pill" style={{ background: SUIT_BG[game.calledSuit], color: SUIT_COLOR[game.calledSuit], border: `1px solid ${SUIT_COLOR[game.calledSuit]}` }}>
                    {SUIT_SYMBOL[game.calledSuit]} {game.calledSuit}
                  </div>
                )}
                <span className="pile-lbl">Top card</span>
              </div>
            </div>

            {/* ── FAN HAND ── */}
            <div className="whot-hand-area">
              <div className="hand-fan">
                {myHand.map((card, i) => (
                  <WhotCardView
                    key={card.id}
                    card={card}
                    playable={isMyTurn && playableIds.has(card.id)}
                    selected={selected?.id === card.id}
                    onClick={() => handleCardTap(card)}
                    style={getFanStyle(i, myHand.length, selected?.id === card.id)}
                  />
                ))}
              </div>
            </div>

            {/* Code row */}
            <div className="code-row">
              <span className="code-row-val">{gameId}</span>
              <button className="code-row-btn" onClick={copyCode}>{copied ? 'Copied' : 'Copy code'}</button>
            </div>

            {/* Action bar */}
            {actionError && <p className="action-err">{actionError}</p>}
            <div className="whot-action-bar">
              <button className="btn-play" onClick={handlePlay} disabled={!selected || !isMyTurn}>
                {selected
                  ? `Play ${SUIT_SYMBOL[selected.suit]} ${cardLabel(selected)}`
                  : isMyTurn ? 'Tap a card' : 'Waiting…'}
              </button>
              <button className="btn-draw-card" onClick={handleDraw} disabled={!isMyTurn}>
                {game.pendingPickup > 0 ? `Pick ${game.pendingPickup}` : 'Draw'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function WhotPage() {
  return (
    <Suspense fallback={<WhotSkeleton />}>
      <WhotInner />
    </Suspense>
  );
}

function WhotSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: 140, height: 22, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ display: 'flex', gap: 12 }}>
        {[0,1].map(i => <div key={i} style={{ width: 70, height: 100, borderRadius: 12, background: 'rgba(255,255,255,0.4)' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2,3,4].map(i => <div key={i} style={{ width: 50, height: 76, borderRadius: 10, background: 'rgba(255,255,255,0.3)' }} />)}
      </div>
    </div>
  );
}