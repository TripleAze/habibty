'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  WhotCard, WhotGameState, Suit, PlayerHand,
} from '@/types';
import {
  subscribeToWhotGame, playCard, drawCard, rematchWhot,
  canPlay, getEffectLabel, SUIT_SYMBOL, SUIT_COLOR, cardLabel,
} from '@/lib/whot';
import { doc, onSnapshot } from 'firebase/firestore';
import BottomNav from '@/components/BottomNav';
import Link from 'next/link';
import { ChevronLeft, Share2, Info, CheckCircle2, Clock, Trophy, Zap } from 'lucide-react';

// ─── CARD COMPONENT ───────────────────────────────────────

function Card({
  card, playable, selected, onClick, large = false, disabled = false,
}: {
  card: WhotCard;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  large?: boolean;
  disabled?: boolean;
}) {
  const isWhot = card.suit === 'whot';
  const effect = getEffectLabel(card);
  const color = SUIT_COLOR[card.suit];

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center
        rounded-2xl bg-white border-2 transition-all duration-300
        ${large ? 'w-24 h-36' : 'w-20 h-28'}
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed border-gray-100' : 'cursor-pointer'}
        ${selected 
          ? 'scale-110 -translate-y-4 shadow-2xl z-10' 
          : playable && !disabled
            ? 'hover:scale-105 hover:-translate-y-2 shadow-lg'
            : 'shadow-md'}
        ${selected ? 'border-indigo-500' : playable && !disabled ? 'border-indigo-100 ring-2 ring-indigo-500/10' : 'border-transparent'}
      `}
      style={{
        boxShadow: selected ? `0 20px 40px -10px ${color}44` : undefined,
      }}
    >
      {/* Playable Pulse Effect */}
      {playable && !disabled && !selected && (
        <div className="absolute inset-0 rounded-2xl animate-pulse ring-4 ring-indigo-500/20" />
      )}

      {/* Card Value/Suit */}
      <div className="flex flex-col items-center">
        <span 
          className={`font-serif leading-none ${large ? 'text-4xl' : 'text-3xl'}`}
          style={{ color }}
        >
          {isWhot ? 'W' : cardLabel(card)}
        </span>
        <span 
          className={`mt-1 font-medium ${large ? 'text-xl' : 'text-lg'}`}
          style={{ color }}
        >
          {SUIT_SYMBOL[card.suit]}
        </span>
      </div>

      {/* Special Effect Label */}
      {effect && (
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <span className="text-[7px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
            {effect}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── SUIT PICKER MODAL ────────────────────────────────────

function SuitPicker({ onPick }: { onPick: (suit: Suit) => void }) {
  const suits: Exclude<Suit, 'whot'>[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  return (
    <div className="fixed inset-0 bg-romantic-dark/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
        <h3 className="font-serif text-2xl italic text-romantic-dark mb-2">Call a Suit</h3>
        <p className="text-sm text-gray-500 mb-6">Choose the suit your partner must play</p>
        <div className="grid grid-cols-3 gap-3">
          {suits.map(suit => (
            <button
              key={suit}
              onClick={() => onPick(suit)}
              className="group flex flex-col items-center justify-center p-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
              style={{ background: `${SUIT_COLOR[suit]}11`, border: `1px solid ${SUIT_COLOR[suit]}33` }}
            >
              <span className="text-2xl mb-1 group-hover:scale-125 transition-transform" style={{ color: SUIT_COLOR[suit] }}>
                {SUIT_SYMBOL[suit]}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tight opacity-60" style={{ color: SUIT_COLOR[suit] }}>
                {suit}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN INNER COMPONENT ─────────────────────────────────

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

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(''), 2500);
    return () => clearTimeout(t);
  }, [actionError]);

  if (!game || !uid) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  const opponent = game.players.find(p => p !== uid) ?? '';
  const oppName = game.playerNames[opponent] ?? 'Partner';
  const oppPhoto = game.playerPhotos[opponent];
  const oppHandCount = game.handCounts[opponent] ?? 0;
  const isMyTurn = game.turn === uid && game.status === 'playing';
  const iWon = game.winner === uid;
  const hasLastCard = game.lastCardUids.includes(uid);
  const oppHasLastCard = game.lastCardUids.includes(opponent);

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
    const cardToPlay = selectedCard;
    setSelectedCard(null);
    const result = await playCard(gameId, uid, cardToPlay);
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
    setSelectedCard(null);
    const result = await drawCard(gameId, uid);
    if (!result.ok) setActionError(result.error ?? 'Cannot draw');
  };

  const handleRematch = async () => {
    setRematching(true);
    try {
      const newId = await rematchWhot(gameId);
      router.replace(`/games/whot?id=${newId}`);
    } catch (e) {
      setRematching(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F2] flex flex-col pb-32">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">Whot Battle</h2>
          <h1 className="font-serif text-3xl italic text-romantic-dark">Habibty Whot</h1>
        </div>
        <Link href="/games" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 transition-transform active:scale-90">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {showSuitPicker && <SuitPicker onPick={handleSuitPick} />}

      {game.status === 'waiting' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
          <div className="w-full max-w-sm bg-white/70 backdrop-blur-xl rounded-[40px] p-10 border border-white text-center shadow-xl">
            <div className="w-20 h-20 bg-indigo-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Clock className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
            <h2 className="font-serif text-2xl italic text-romantic-dark mb-3">Wait for Partner</h2>
            <p className="text-sm text-gray-500 mb-10 leading-relaxed">The game is ready. Share your code with your partner to start the fun!</p>
            
            <div 
              onClick={copyCode}
              className="group relative bg-[#F7E8EE]/40 border-2 border-indigo-100 rounded-2xl py-6 cursor-pointer overflow-hidden transition-all hover:border-indigo-300"
            >
              <span className="font-serif text-4xl tracking-widest text-romantic-dark block mb-2">{gameId}</span>
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3 text-indigo-400" />}
                {copied ? 'Copied' : 'Tap to Copy Code'}
              </div>
              {copied && <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] pointer-events-none" />}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-4 gap-6">
          {/* Top Zone: Opponent */}
          <div className={`
            p-5 rounded-[28px] flex items-center gap-4 transition-all duration-500 border-2
            ${!isMyTurn ? 'bg-white border-indigo-200 shadow-xl scale-100' : 'bg-white/50 border-white/50 opacity-80 scale-95 origin-top'}
          `}>
             <div className="relative">
               {oppPhoto 
                 ? <img src={oppPhoto} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md" referrerPolicy="no-referrer" />
                 : <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-serif text-indigo-400 shadow-inner">
                    {Array.from(oppName)[0]?.toUpperCase()}
                   </div>
               }
               {!isMyTurn && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white animate-pulse" />}
             </div>
             <div className="flex-1">
               <div className="flex items-center justify-between mb-1">
                 <h3 className="text-sm font-bold text-gray-700 tracking-tight capitalize">{oppName}</h3>
                 {!isMyTurn && <span className="text-[9px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>}
               </div>
               <div className="flex items-center gap-2">
                 <div className="flex gap-0.5">
                   {[...Array(Math.min(5, oppHandCount))].map((_, i) => (
                     <div key={i} className="w-2 h-3 bg-indigo-100 rounded-sm border border-indigo-200" />
                   ))}
                   {oppHandCount > 5 && <span className="text-[10px] text-indigo-300 font-bold ml-1">+{oppHandCount - 5}</span>}
                 </div>
                 <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">({oppHandCount} Cards)</span>
                 {oppHasLastCard && <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase animate-bounce ml-auto">Last Card!</span>}
               </div>
             </div>
          </div>

          {/* Center Zone: Game Table */}
          <div className="flex-1 flex items-center justify-center gap-10 relative">
            {/* Draw Pile (Deck) */}
            <div 
              onClick={isMyTurn ? handleDraw : undefined}
              className={`group flex flex-col items-center gap-3 transition-transform ${isMyTurn ? 'cursor-pointer active:scale-95' : 'opacity-50'}`}
            >
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-300">Deck</span>
              <div className="relative">
                {/* Visual Stack Effect */}
                <div className="absolute -right-1.5 -bottom-1.5 w-20 h-28 bg-[#FFF8F2] border border-gray-200 rounded-2xl shadow-sm -rotate-3" />
                <div className="absolute -right-0.5 -bottom-0.5 w-20 h-28 bg-white border border-gray-200 rounded-2xl shadow-sm rotate-2" />
                <div className={`
                  w-20 h-28 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all
                  bg-gradient-to-br from-indigo-500 to-romantic-purple shadow-xl z-10 
                  ${isMyTurn ? 'border-white group-hover:-translate-y-2' : 'border-indigo-100'}
                `}>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1">
                    <span className="font-serif text-3xl italic text-white leading-none">W</span>
                  </div>
                  <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest italic">{game.deckCount} Left</span>
                </div>
              </div>
              {isMyTurn && game.pendingPickup > 0 && (
                <div className="absolute -bottom-8 bg-rose-500 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg shadow-rose-500/30 whitespace-nowrap animate-bounce">
                  + {game.pendingPickup} PENDING!
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center gap-3">
               <div className="w-8 h-8 rounded-full bg-indigo-50/50 flex items-center justify-center">
                 <div className="w-0.5 h-full bg-indigo-100 rotate-45 transform" />
               </div>
            </div>

            {/* Top Played Card */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-300">Played</span>
              <div className="relative">
                <Card card={game.topCard} large />
                {game.calledSuit && (
                  <div className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-full p-3 shadow-xl border-2 border-white animate-in zoom-in spin-in-12 duration-500">
                    <span className="text-xl block leading-none">{SUIT_SYMBOL[game.calledSuit]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Turn Indicator Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
               {isMyTurn ? (
                 <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <Zap className="w-4 h-4 fill-white animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">It's Your Turn!</span>
                 </div>
               ) : game.status === 'playing' ? (
                 <div className="bg-white/80 backdrop-blur border border-indigo-100 text-indigo-400 px-6 py-2 rounded-full shadow-lg flex items-center gap-3">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Waiting for Partner</span>
                 </div>
               ) : null}
            </div>
          </div>

          {/* Action Error Toast (Inline) */}
          {actionError && (
             <div className="mx-auto bg-rose-50 border border-rose-100 text-rose-500 px-4 py-2 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
                <Info className="w-3.5 h-3.5" /> {actionError}
             </div>
          )}

          {/* Bottom Zone: Player Hand */}
          <div className="flex flex-col gap-4 mt-auto">
            <div className="flex items-center justify-between opacity-50">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                Your Hand ({myHand.length})
              </span>
              {hasLastCard && <span className="text-[10px] font-black text-rose-500 uppercase italic underline underline-offset-4 animate-pulse">Check Up!</span>}
            </div>
            
            <div className="overflow-x-auto overflow-y-visible pb-12 -mx-4 px-4 no-scrollbar scroll-smooth">
               <div className="flex items-end gap-2 pr-10">
                 {myHand.map((card, i) => (
                   <div 
                    key={card.id}
                    className="flex-shrink-0"
                    style={{ 
                      zIndex: selectedCard?.id === card.id ? 50 : 10 + i,
                      marginLeft: i === 0 ? 0 : '-3.5rem' 
                    }}
                   >
                     <Card 
                       card={card}
                       playable={isMyTurn && canPlay(card, game.topCard, game.calledSuit, game.pendingPickup)}
                       selected={selectedCard?.id === card.id}
                       onClick={() => handleCardTap(card)}
                       disabled={!isMyTurn || game.status !== 'playing'}
                     />
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Actions Strip */}
      {game.status === 'playing' && (
        <div className="fixed bottom-[84px] left-0 right-0 px-6 z-40 pointer-events-none">
          <div className="max-w-md mx-auto flex gap-4 pointer-events-auto">
            <button
              onClick={handlePlay}
              disabled={!selectedCard || !isMyTurn}
              className={`
                flex-[2] py-5 rounded-[22px] font-black text-xs uppercase tracking-widest text-white
                transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100
                shadow-[0_12px_30px_-10px_rgba(79,70,229,0.5)]
                ${selectedCard ? 'bg-indigo-600 border-b-4 border-indigo-800' : 'bg-gray-400'}
              `}
            >
              {selectedCard ? `Play This Card` : 'Pick a card to play'}
            </button>
            <button
              onClick={handleDraw}
              disabled={!isMyTurn}
              className={`
                flex-1 py-5 rounded-[22px] font-black text-xs uppercase tracking-widest
                transition-all active:scale-95 disabled:opacity-30
                border-2 border-indigo-200 bg-white text-indigo-600
              `}
            >
              Draw
            </button>
          </div>
        </div>
      )}

      {/* Finish Screen Overlay */}
      {game.status === 'finished' && (
        <div className="fixed inset-0 bg-romantic-dark/80 backdrop-blur-xl z-[150] flex items-center justify-center p-8 animate-in fade-in duration-700">
           <div className="w-full max-w-sm bg-white rounded-[40px] px-10 py-14 text-center shadow-3xl transform animate-in slide-in-from-bottom duration-500">
              <div className="w-24 h-24 rounded-[32px] bg-indigo-50 flex items-center justify-center mx-auto mb-8 relative">
                 <Trophy className={`w-12 h-12 ${iWon ? 'text-yellow-500 animate-bounce' : 'text-gray-300'}`} />
                 {iWon && <div className="absolute inset-0 rounded-[32px] animate-ping ring-4 ring-yellow-400 opacity-20" />}
              </div>
              <h2 className="font-serif text-3xl italic text-romantic-dark mb-2">
                {iWon ? 'Champion! 🎉' : 'Heartbreak 💔'}
              </h2>
              <p className="text-gray-500 text-sm mb-12 leading-relaxed italic font-serif">
                {iWon 
                  ? 'Victory is yours, my lovely! Well played and gracefully won.'
                  : `Alas, ${oppName} took the glory this time. Rematch?`}
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleRematch} 
                  disabled={rematching}
                  className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200"
                >
                  {rematching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Start Rematch'}
                </button>
                <Link href="/games" className="block w-full py-5 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest transition-colors hover:bg-gray-50">
                  Back to Lobby
                </Link>
              </div>
           </div>
        </div>
      )}

      <BottomNav activeTab="games" />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default function WhotPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <WhotInner />
    </Suspense>
  );
}