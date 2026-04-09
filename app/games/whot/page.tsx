'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  WhotCard, WhotGameState, Suit, PlayerHand,
} from '@/types';
import {
  subscribeToWhotGame, playCard, drawCard, rematchWhot,
  canPlay, getEffectLabel, SUIT_SYMBOL, SUIT_COLOR, SUIT_BG, cardLabel,
} from '@/lib/whot';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';

// ─── CARD COMPONENT ───────────────────────────────────────

function Card({
  card, playable, selected, onClick, small = false,
}: {
  card: WhotCard;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
}) {
  const isWhot = card.suit === 'whot';
  const effect = getEffectLabel(card);

  return (
    <div
      onClick={onClick}
      style={{
        width: small ? 44 : 64,
        height: small ? 64 : 96,
        borderRadius: 10,
        background: selected
          ? SUIT_COLOR[card.suit]
          : SUIT_BG[card.suit],
        border: selected
          ? `2px solid ${SUIT_COLOR[card.suit]}`
          : playable
          ? `1.5px solid ${SUIT_COLOR[card.suit]}`
          : '1.5px solid rgba(200,180,200,0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: playable ? 'pointer' : 'default',
        opacity: playable || selected ? 1 : 0.55,
        transition: 'all 0.18s ease',
        transform: selected ? 'translateY(-10px)' : playable ? 'translateY(0)' : 'none',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        boxShadow: selected ? `0 6px 20px ${SUIT_COLOR[card.suit]}55` : 'none',
      }}
    >
      <span style={{
        fontSize: small ? 14 : 20,
        color: selected ? 'white' : SUIT_COLOR[card.suit],
        fontWeight: 400,
        fontFamily: "'Cormorant Garamond', serif",
        lineHeight: 1,
      }}>
        {isWhot ? 'W' : cardLabel(card)}
      </span>
      <span style={{
        fontSize: small ? 11 : 15,
        color: selected ? 'rgba(255,255,255,0.85)' : SUIT_COLOR[card.suit],
        marginTop: 2,
      }}>
        {SUIT_SYMBOL[card.suit]}
      </span>
      {!small && effect && (
        <span style={{
          position: 'absolute',
          bottom: 4,
          left: 0, right: 0,
          textAlign: 'center',
          fontSize: 7,
          color: selected ? 'rgba(255,255,255,0.7)' : SUIT_COLOR[card.suit],
          letterSpacing: '0.04em',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          textTransform: 'uppercase',
        }}>
          {effect}
        </span>
      )}
    </div>
  );
}

// ─── SUIT PICKER MODAL ────────────────────────────────────

function SuitPicker({ onPick }: { onPick: (suit: Suit) => void }) {
  const suits: Exclude<Suit, 'whot'>[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(61,43,61,0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 24, padding: '28px 24px',
        width: '100%', maxWidth: 340, textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22, fontWeight: 300, fontStyle: 'italic',
          color: '#3D2B3D', marginBottom: 6,
        }}>Call a suit</p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.6)', marginBottom: 20 }}>
          Choose the suit your partner must play
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {suits.map(suit => (
            <button key={suit} onClick={() => onPick(suit)} style={{
              width: 56, height: 72,
              borderRadius: 12,
              background: SUIT_BG[suit],
              border: `1.5px solid ${SUIT_COLOR[suit]}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 6, cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 22, color: SUIT_COLOR[suit] }}>{SUIT_SYMBOL[suit]}</span>
              <span style={{ fontSize: 9, color: SUIT_COLOR[suit], fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {suit}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────

function WhotInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<WhotGameState | null>(null);
  const [myHand, setMyHand] = useState<WhotCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WhotCard | null>(null);
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace('/auth'); return; }
      setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToWhotGame(gameId, setGame);
    return () => unsub();
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !uid) return;
    const unsub = onSnapshot(doc(db, 'games', gameId.toUpperCase(), 'hands', uid), snap => {
      if (snap.exists()) {
        setMyHand((snap.data() as PlayerHand).cards);
      }
    });
    return () => unsub();
  }, [gameId, uid]);

  // Clear error after 2s
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 2000);
    return () => clearTimeout(t);
  }, [actionError]);

  if (!game || !uid) return (
    <div className="app-container">
      <div className="loading-state"><div className="loading-spinner" /></div>
    </div>
  );

  const opponent = game.players.find(p => p !== uid) ?? '';
  const myHandCount = game.handCounts[uid] ?? 0;
  const opponentHandCount = game.handCounts[opponent] ?? 0;
  const isMyTurn = game.turn === uid && game.status === 'playing';
  const myName = game.playerNames[uid] ?? 'You';
  const oppName = game.playerNames[opponent] ?? 'Partner';
  const myPhoto = game.playerPhotos[uid];
  const oppPhoto = game.playerPhotos[opponent];
  const iWon = game.winner === uid;
  const iLost = game.winner && game.winner !== uid;
  const hasLastCard = game.lastCardUids.includes(uid);
  const oppHasLastCard = game.lastCardUids.includes(opponent);

  const playableCards = myHand.filter(c =>
    canPlay(c, game.topCard, game.calledSuit, game.pendingPickup)
  );

  const handleCardTap = (card: WhotCard) => {
    if (!isMyTurn) return;
    if (!canPlay(card, game.topCard, game.calledSuit, game.pendingPickup)) return;
    setSelectedCard(prev => prev?.id === card.id ? null : card);
  };

  const handlePlay = async () => {
    if (!selectedCard) return;
    if (selectedCard.suit === 'whot') {
      setShowSuitPicker(true);
      return;
    }
    setSelectedCard(null);
    const result = await playCard(gameId, uid, selectedCard);
    if (!result.ok) setActionError(result.error ?? 'Cannot play that card');
  };

  const handleSuitPick = async (suit: Suit) => {
    setShowSuitPicker(false);
    if (!selectedCard) return;
    const card = selectedCard;
    setSelectedCard(null);
    const result = await playCard(gameId, uid, card, suit);
    if (!result.ok) setActionError(result.error ?? 'Error playing card');
  };

  const handleDraw = async () => {
    if (!isMyTurn) return;
    const result = await drawCard(gameId, uid);
    if (!result.ok) setActionError(result.error ?? 'Cannot draw');
  };

  const handleRematch = async () => {
    setRematching(true);
    const newId = await rematchWhot(gameId);
    router.replace(`/games/whot?id=${newId}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusText = () => {
    if (game.status === 'waiting') return 'Waiting for partner…';
    if (game.status === 'finished') {
      if (iWon) return 'You won! 🎉';
      return `${oppName} won`;
    }
    if (game.pendingPickup > 0) {
      return isMyTurn
        ? `Pick ${game.pendingPickup} or counter!`
        : `${oppName} must pick ${game.pendingPickup}`;
    }
    if (game.calledSuit) {
      return isMyTurn
        ? `Play a ${game.calledSuit} or Whot!`
        : `${oppName} called ${game.calledSuit}`;
    }
    return isMyTurn ? 'Your turn' : `${oppName}'s turn`;
  };

  return (
    <>
      <style>{`
        .whot-page { padding-bottom: 90px; min-height: 100vh; }
        .whot-header { padding: 44px 20px 12px; display: flex; align-items: center; justify-content: space-between; }
        .whot-code-bar { margin: 0 16px 10px; background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border-radius: 14px; padding: 10px 16px; border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: space-between; }
        .whot-status-bar { margin: 0 16px 10px; background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border-radius: 14px; padding: 11px 16px; border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: space-between; }
        .whot-status-txt { font-size: 13px; color: #7A5C7A; }
        .w-badge { font-size: 10px; font-weight: 500; padding: 4px 10px; border-radius: 100px; display: flex; align-items: center; gap: 5px; }
        .w-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.7; }
        .w-badge-turn { background: rgba(232,160,160,0.2); color: #B06060; }
        .w-badge-wait { background: rgba(201,184,216,0.25); color: #7A6A8A; }
        .w-badge-win  { background: rgba(168,213,162,0.25); color: #5A7A56; }
        .w-badge-lose { background: rgba(201,184,216,0.2); color: #7A6A8A; }
        .w-badge-pick { background: rgba(232,207,160,0.3); color: #9A7040; }

        .whot-players { display: flex; gap: 8px; margin: 0 16px 10px; }
        .w-player { flex: 1; background: rgba(255,255,255,0.55); border-radius: 16px; padding: 10px 12px; border: 1.5px solid rgba(255,255,255,0.7); display: flex; align-items: center; gap: 8px; transition: border-color 0.2s; }
        .w-player.active { border-color: rgba(232,160,160,0.45); background: rgba(255,255,255,0.8); }
        .w-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.8); flex-shrink: 0; }
        .w-avatar-fb { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#F2C4CE,#C9B8D8); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond',serif; font-size: 14px; color: #3D2B3D; flex-shrink: 0; border: 1.5px solid rgba(255,255,255,0.8); }
        .w-player-info { flex: 1; min-width: 0; }
        .w-player-lbl { font-size: 10px; color: rgba(122,92,122,0.5); letter-spacing: 0.06em; }
        .w-player-name { font-family: 'Cormorant Garamond',serif; font-size: 13px; color: #3D2B3D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .w-card-count { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 100px; background: rgba(201,184,216,0.2); color: #7A6A8A; white-space: nowrap; }
        .last-card-badge { background: rgba(232,160,160,0.2); color: #B06060; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        .whot-table { margin: 0 16px 10px; background: rgba(255,255,255,0.62); backdrop-filter: blur(12px); border-radius: 20px; padding: 16px; border: 1px solid rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; gap: 20px; }
        .whot-deck-pile { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
        .whot-deck-back { width: 64px; height: 96px; border-radius: 10px; background: linear-gradient(135deg, #E8A0A0, #C9B8D8); display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(255,255,255,0.6); transition: transform 0.15s; }
        .whot-deck-back:hover { transform: scale(1.04); }
        .pile-label { font-size: 10px; color: rgba(122,92,122,0.5); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500; }
        .whot-vs { font-family: 'Cormorant Garamond',serif; font-size: 13px; font-style: italic; color: rgba(122,92,122,0.4); }
        .called-suit-pill { margin-top: 6px; font-size: 10px; font-weight: 500; padding: 3px 10px; border-radius: 100px; }

        .whot-hand { padding: 0 16px 10px; }
        .hand-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(122,92,122,0.55); font-weight: 500; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
        .hand-label::after { content: ''; flex: 1; height: 0.5px; background: linear-gradient(90deg, rgba(201,184,216,0.5), transparent); }
        .hand-scroll { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
        .hand-scroll::-webkit-scrollbar { display: none; }

        .whot-actions { display: flex; gap: 8px; padding: 0 16px; }
        .btn-play-card { flex: 1; padding: 14px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.25s; letter-spacing: 0.04em; box-shadow: 0 4px 16px rgba(232,160,160,0.3); }
        .btn-play-card:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(232,160,160,0.4); }
        .btn-play-card:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-draw { padding: 14px 20px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; font-family: 'DM Sans',sans-serif; font-size: 13px; color: #7A5C7A; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-weight: 500; }
        .btn-draw:hover:not(:disabled) { background: rgba(232,160,160,0.1); }
        .btn-draw:disabled { opacity: 0.4; cursor: not-allowed; }

        .action-error { font-size: 12px; color: #c0706a; text-align: center; margin: 6px 16px 0; animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }

        .whot-finished { margin: 0 16px; background: rgba(255,255,255,0.65); border-radius: 20px; padding: 24px 20px; border: 1px solid rgba(255,255,255,0.8); text-align: center; }
        .finished-title { font-family: 'Cormorant Garamond',serif; font-size: 26px; font-weight: 300; font-style: italic; color: #3D2B3D; margin-bottom: 6px; }
        .finished-sub { font-size: 12px; color: rgba(122,92,122,0.6); margin-bottom: 20px; }
        .btn-rematch { width: 100%; padding: 14px; border-radius: 100px; background: linear-gradient(135deg,#E8A0A0,#C9B8D8); border: none; color: white; font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 8px; transition: all 0.25s; box-shadow: 0 4px 16px rgba(232,160,160,0.3); }
        .btn-rematch:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-rematch:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-new-game { width: 100%; padding: 12px; border-radius: 100px; border: 1.5px solid rgba(232,160,160,0.35); background: transparent; font-family: 'DM Sans',sans-serif; font-size: 13px; color: #7A5C7A; cursor: pointer; transition: all 0.2s; }
        .btn-new-game:hover { background: rgba(232,160,160,0.08); }

        .whot-waiting { margin: 0 16px; background: rgba(255,255,255,0.6); border-radius: 20px; padding: 32px 20px; border: 1px solid rgba(255,255,255,0.8); text-align: center; }
        .waiting-title { font-family: 'Cormorant Garamond',serif; font-size: 20px; font-weight: 300; font-style: italic; color: #7A5C7A; margin-bottom: 8px; }
        .waiting-code { font-family: 'Cormorant Garamond',serif; font-size: 32px; letter-spacing: 0.2em; color: #3D2B3D; cursor: pointer; }

        .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .whot-code-lbl { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(122,92,122,0.5); margin-bottom: 2px; }
        .whot-code-val { font-family: 'Cormorant Garamond',serif; font-size: 16px; letter-spacing: 0.12em; color: #3D2B3D; }
        .whot-copy-btn { padding: 5px 12px; border-radius: 100px; background: rgba(232,160,160,0.15); border: 1px solid rgba(232,160,160,0.3); font-size: 11px; color: #B06060; cursor: pointer; font-weight: 500; font-family: 'DM Sans',sans-serif; }
      `}</style>

      {showSuitPicker && <SuitPicker onPick={handleSuitPick} />}

      <div className="app-container whot-page">
        <div className="whot-header">
          <div>
            <p className="home-label">Games</p>
            <h1 className="home-title">Naija <em>Whot</em></h1>
          </div>
          <Link href="/games" className="back-btn" style={{ marginBottom: 0 }}>← Back</Link>
        </div>

        {game.status === 'waiting' ? (
          <div className="whot-waiting">
            <p className="waiting-title">Waiting for your partner…</p>
            <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.5)', marginBottom: 16 }}>Share this code</p>
            <div className="waiting-code" onClick={copyCode}>{gameId}</div>
            <p style={{ fontSize: 11, color: '#B06060', marginTop: 8 }}>{copied ? 'Copied!' : 'Tap to copy'}</p>
          </div>
        ) : (
          <>
            {/* Code bar */}
            <div className="whot-code-bar">
              <div>
                <div className="whot-code-lbl">Game code</div>
                <div className="whot-code-val">{gameId}</div>
              </div>
              <button className="whot-copy-btn" onClick={copyCode}>{copied ? 'Copied!' : 'Share'}</button>
            </div>

            {/* Status */}
            <div className="whot-status-bar">
              <span className="whot-status-txt">{statusText()}</span>
              <span className={`w-badge ${
                game.status === 'finished'
                  ? iWon ? 'w-badge-win' : 'w-badge-lose'
                  : game.pendingPickup > 0 ? 'w-badge-pick'
                  : isMyTurn ? 'w-badge-turn' : 'w-badge-wait'
              }`}>
                <span className="w-badge-dot" />
                {game.status === 'finished'
                  ? iWon ? 'Winner!' : 'Game over'
                  : game.pendingPickup > 0 ? `Pick ${game.pendingPickup}`
                  : isMyTurn ? 'Your turn' : 'Their turn'}
              </span>
            </div>

            {/* Players */}
            <div className="whot-players">
              <div className={`w-player ${isMyTurn && game.status === 'playing' ? 'active' : ''}`}>
                {myPhoto
                  ? <img src={myPhoto} className="w-avatar" referrerPolicy="no-referrer" alt={myName} />
                  : <div className="w-avatar-fb">{myName[0]?.toUpperCase()}</div>}
                <div className="w-player-info">
                  <div className="w-player-lbl">You</div>
                  <div className="w-player-name">{myName}</div>
                </div>
                <span className={`w-card-count ${hasLastCard ? 'last-card-badge' : ''}`}>
                  {hasLastCard ? 'Last card!' : `${myHand.length} cards`}
                </span>
              </div>
              <div className={`w-player ${!isMyTurn && game.status === 'playing' ? 'active' : ''}`}>
                {oppPhoto
                  ? <img src={oppPhoto} className="w-avatar" referrerPolicy="no-referrer" alt={oppName} />
                  : <div className="w-avatar-fb">{oppName[0]?.toUpperCase()}</div>}
                <div className="w-player-info">
                  <div className="w-player-lbl">Partner</div>
                  <div className="w-player-name">{oppName}</div>
                </div>
                <span className={`w-card-count ${oppHasLastCard ? 'last-card-badge' : ''}`}>
                  {oppHasLastCard ? 'Last card!' : `${opponentHandCount} cards`}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="whot-table">
              {/* Draw pile */}
              <div className="whot-deck-pile" onClick={isMyTurn ? handleDraw : undefined}>
                <div className="whot-deck-back">
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'white', fontStyle: 'italic' }}>W</span>
                </div>
                <span className="pile-label">{game.deckCount} left</span>
                {isMyTurn && game.status === 'playing' && (
                  <span style={{ fontSize: 10, color: '#B06060', fontWeight: 500 }}>
                    {game.pendingPickup > 0 ? `Draw ${game.pendingPickup}` : 'Draw'}
                  </span>
                )}
              </div>

              <div className="whot-vs">vs</div>

              {/* Top card */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Card card={game.topCard} />
                {game.calledSuit && (
                  <div className="called-suit-pill" style={{
                    background: SUIT_BG[game.calledSuit],
                    color: SUIT_COLOR[game.calledSuit],
                    border: `1px solid ${SUIT_COLOR[game.calledSuit]}`,
                  }}>
                    {SUIT_SYMBOL[game.calledSuit]} {game.calledSuit}
                  </div>
                )}
                <span className="pile-label">Top card</span>
              </div>
            </div>

            {/* My hand */}
            {game.status === 'playing' && (
              <>
                <div className="whot-hand">
                  <div className="hand-label">Your hand</div>
                  <div className="hand-scroll">
                    {myHand.map(card => (
                      <Card
                        key={card.id}
                        card={card}
                        playable={isMyTurn && canPlay(card, game.topCard, game.calledSuit, game.pendingPickup)}
                        selected={selectedCard?.id === card.id}
                        onClick={() => handleCardTap(card)}
                      />
                    ))}
                  </div>
                </div>

                <div className="whot-actions">
                  <button
                    className="btn-play-card"
                    onClick={handlePlay}
                    disabled={!selectedCard || !isMyTurn}
                  >
                    {selectedCard ? `Play ${SUIT_SYMBOL[selectedCard.suit]} ${cardLabel(selectedCard)}` : 'Select a card'}
                  </button>
                  <button
                    className="btn-draw"
                    onClick={handleDraw}
                    disabled={!isMyTurn}
                  >
                    {game.pendingPickup > 0 ? `Pick ${game.pendingPickup}` : 'Draw'}
                  </button>
                </div>
                {actionError && <p className="action-error">{actionError}</p>}
              </>
            )}

            {/* Finished */}
            {game.status === 'finished' && (
              <div className="whot-finished">
                <p className="finished-title">{iWon ? 'You won! 🎉' : `${oppName} won`}</p>
                <p className="finished-sub">{iWon ? 'Well played habibi' : 'Better luck next round'}</p>
                <button className="btn-rematch" onClick={handleRematch} disabled={rematching}>
                  {rematching ? <span className="spinner-sm" /> : 'Rematch'}
                </button>
                <Link href="/games" className="btn-new-game" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Back to games
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

export default function WhotPage() {
  return (
    <Suspense fallback={
      <div className="app-container">
        <div className="loading-state"><div className="loading-spinner" /></div>
      </div>
    }>
      <WhotInner />
    </Suspense>
  );
}