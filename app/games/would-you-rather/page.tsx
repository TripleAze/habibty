'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import WaitingLobby from '@/components/games/WaitingLobby';
import { useHeader } from '@/lib/HeaderContext';
import { WOULD_YOU_RATHER_QUESTIONS, WouldYouRatherQuestion } from '@/lib/questions';

interface GameState {
  type: 'wouldyourather';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  currentQuestion: WouldYouRatherQuestion | null;
  usedQuestionIds: string[];
  lastCategory: string | null;
  responses: Record<string, 'A' | 'B'>;
  revealed: boolean;
  readyForNext: string[];
  status: 'waiting' | 'playing' | 'finished';
  score: { matches: number; total: number };
  creatorUid: string;
  createdAt: number;
}

interface FirestoreQuestion extends WouldYouRatherQuestion {
  isActive: boolean;
  isCustom?: boolean;
}

const QUESTIONS_PER_GAME = 10;

// ── SKELETON ──────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ width: 200, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 600, padding: '0 20px' }}>
        <div style={{ flex: 1, aspectRatio: '3/4', borderRadius: 16, background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ flex: 1, aspectRatio: '3/4', borderRadius: 16, background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  );
}

// ── CUSTOM QUESTION MODAL ──────────────────────────────
function CreateQuestionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (q: Partial<WouldYouRatherQuestion>) => void }) {
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(61,43,61,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 400, animation: 'scaleIn 0.3s ease' }}>
        <h3 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 24, fontStyle: 'italic', marginBottom: 20 }}>Create a dilemma</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, textTransform: 'uppercase', color: '#7A5C7A', marginBottom: 6 }}>Option A</p>
            <textarea value={optA} onChange={e => setOptA(e.target.value)} placeholder="e.g. Always be 10 minutes early" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid rgba(232,160,160,0.3)', fontFamily: 'inherit', fontSize: 14, minHeight: 80, resize: 'none' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, textTransform: 'uppercase', color: '#7A5C7A', marginBottom: 6 }}>Option B</p>
            <textarea value={optB} onChange={e => setOptB(e.target.value)} placeholder="e.g. Always be 20 minutes late" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid rgba(201,184,216,0.3)', fontFamily: 'inherit', fontSize: 14, minHeight: 80, resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 100, border: '1.5px solid #eee', background: 'none', color: '#7A5C7A', cursor: 'pointer' }}>Cancel</button>
            <button disabled={!optA || !optB} onClick={() => onSubmit({ optionA: optA, optionB: optB })} style={{ flex: 2, padding: '14px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', color: 'white', fontWeight: 600, cursor: optA && optB ? 'pointer' : 'default', opacity: optA && optB ? 1 : 0.5 }}>Add to Game</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────
function WouldYouRatherInner() {
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [showCreateQ, setShowCreateQ] = useState(false);
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);

  // Auth check
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) router.replace('/auth');
      else setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  // Subscribe to game
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, 'games', gameId), 
      (snap) => {
        if (snap.exists()) setGame(snap.data() as GameState);
      },
      (error) => { console.error("Firestore snapshot error:", error); }
    );
    return () => unsub();
  }, [gameId]);

  // Logic functions
  const selectNextQuestion = async (usedIds: string[], lastCat: string | null): Promise<WouldYouRatherQuestion> => {
    try {
      const questionsCol = collection(db, 'would_you_rather_questions');
      const customQ = await getDocs(query(questionsCol, where('isCustom', '==', true), where('isActive', '==', true), limit(30)));
      const customPool = customQ.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreQuestion)).filter(q => !usedIds.includes(q.id));
      if (customPool.length > 0) return customPool[Math.floor(Math.random() * customPool.length)];

      const standardQ = await getDocs(query(questionsCol, where('isCustom', '==', false), where('isActive', '==', true), limit(100)));
      let standardPool = standardQ.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreQuestion)).filter(q => !usedIds.includes(q.id));
      if (standardPool.length > 0) {
        const filteredByCat = standardPool.filter(q => q.category !== lastCat);
        return (filteredByCat.length > 0 ? filteredByCat : standardPool)[Math.floor(Math.random() * (filteredByCat.length > 0 ? filteredByCat.length : standardPool.length))];
      }
    } catch (err) { console.error("Failed to fetch questions:", err); }
    const localPool = WOULD_YOU_RATHER_QUESTIONS.filter(q => !usedIds.includes(q.id));
    const fallbackPool = localPool.length > 0 ? localPool : WOULD_YOU_RATHER_QUESTIONS;
    const q = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    return { ...q, id: q.id };
  };

  const handleCreate = async () => {
    try {
      const newId = await generateGameId();
      const user = auth?.currentUser;
      const initialQ = await selectNextQuestion([], null);
      await setDoc(doc(db, 'games', newId), {
        type: 'wouldyourather', creatorUid: uid, players: [uid],
        playerNames: { [uid]: user?.displayName || 'You' },
        playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
        currentQuestion: initialQ, usedQuestionIds: [initialQ.id],
        lastCategory: initialQ.category, responses: {}, revealed: false,
        readyForNext: [], status: 'waiting', score: { matches: 0, total: 0 },
        createdAt: serverTimestamp(),
      });
      router.replace(`/games/would-you-rather?id=${newId}`);
    } catch (err) { console.error("Create failed:", err); }
  };

  const handleJoin = async () => {
    if (!gameId) return;
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.players?.length >= 2) return;
    const user = auth?.currentUser;
    await updateDoc(gameRef, {
      players: [...(data.players || []), uid],
      [`playerNames.${uid}`]: user?.displayName || 'You',
      ...(user?.photoURL ? { [`playerPhotos.${uid}`]: user.photoURL } : {}),
      status: 'playing',
    });
  };

  const handleSelect = async (choice: 'A' | 'B') => {
    if (!game || !!game.responses[uid]) return;
    setSelected(choice);
    const gameRef = doc(db, 'games', gameId);
    const updatedResponses = { ...game.responses, [uid]: choice };
    await updateDoc(gameRef, { responses: updatedResponses, revealed: Object.keys(updatedResponses).length === 2 });
  };

  const handleReadyForNext = async () => {
    if (!game || game.readyForNext?.includes(uid)) return;
    const gameRef = doc(db, 'games', gameId);
    const newReady = [...(game.readyForNext || []), uid];
    if (newReady.length === 2) {
      const isMatch = game.responses[game.players[0]] === game.responses[game.players[1]];
      const totalPlayed = game.score.total + 1;
      if (totalPlayed >= QUESTIONS_PER_GAME) {
        await updateDoc(gameRef, { readyForNext: [], status: 'finished', [`score.matches`]: game.score.matches + (isMatch ? 1 : 0), [`score.total`]: totalPlayed });
      } else {
        const nextQ = await selectNextQuestion(game.usedQuestionIds, game.lastCategory);
        await updateDoc(gameRef, { currentQuestion: nextQ, usedQuestionIds: [...game.usedQuestionIds, nextQ.id], lastCategory: nextQ.category, responses: {}, revealed: false, readyForNext: [], [`score.matches`]: game.score.matches + (isMatch ? 1 : 0), [`score.total`]: totalPlayed });
      }
    } else { await updateDoc(gameRef, { readyForNext: newReady }); }
  };

  const handleAddCustomQuestion = async (q: Partial<WouldYouRatherQuestion>) => {
    const questionsCol = collection(db, 'would_you_rather_questions');
    const newDoc = doc(questionsCol);
    await setDoc(newDoc, { ...q, id: newDoc.id, category: 'random', isActive: true, isCustom: true, createdBy: uid, createdAt: serverTimestamp() });
    setShowCreateQ(false);
  };

  // Auto-join
  useEffect(() => {
    if (game && uid && game.status === 'waiting' && !game.players?.includes(uid)) handleJoin();
  }, [game, uid, gameId]);

  if (!uid || !gameId && !game) {
    if (!gameId) return (
      <div className="game-lobby-screen">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 10px', flexShrink: 0 }}>
          <div><p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p><h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontWeight: 300, color: '#3D2B3D' }}>Would You Rather</h1></div>
          <button onClick={() => router.push('/games')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#7A5C7A', backdropFilter: 'blur(8px)' }}>✕</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(232,160,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(232,160,160,0.3)' }}>⚖️</div>
          <div style={{ textAlign: 'center' }}><h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 28, color: '#3D2B3D', marginBottom: 8 }}>Would You Rather</h2><p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', maxWidth: 260 }}>Discover how much you and your partner agree on impossible choices!</p></div>
          <button onClick={handleCreate} style={{ width: '100%', maxWidth: 240, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(232,160,160,0.2)' }}>Create New Game</button>
          <button onClick={() => router.push('/games')} style={{ fontSize: 13, color: '#7A5C7A', background: 'none', border: 'none', cursor: 'pointer' }}>Back to Games</button>
        </div>
      </div>
    );
    return <Skeleton />;
  }

  if (!game) return <Skeleton />;

  if (game.status === 'waiting') {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <WaitingLobby gameId={gameId} gameType="would-you-rather" myPhoto={game.playerPhotos?.[uid]} onCancel={() => setShowExit(true)} />
      </>
    );
  }

  if (game.status === 'finished') {
    const matchPercent = Math.round((game.score.matches / game.score.total) * 100);
    return (
      <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 32, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 8 }}>Perfect Match!</p>
            <p style={{ fontSize: 64, fontWeight: 700, background: 'linear-gradient(135deg,#E8A0A0,#9B7EBD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{matchPercent}%</p>
            <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', marginTop: 8 }}>You agreed on {game.score.matches} of {game.score.total} dilemmas</p>
          </div>
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
            <button onClick={() => router.push('/games')} style={{ flex: 1, padding: '14px', borderRadius: 100, background: 'none', border: '1.5px solid #eee', color: '#7A5C7A' }}>Games</button>
            <button onClick={handleCreate} style={{ flex: 1.5, padding: '14px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 600 }}>Play Again</button>
          </div>
        </div>
      </GameScreen>
    );
  }

  return (
    <WouldYouRatherPlaying
      game={game} uid={uid} gameId={gameId} router={router}
      showExit={showExit} setShowExit={setShowExit}
      showCreateQ={showCreateQ} setShowCreateQ={setShowCreateQ}
      selected={selected} handleSelect={handleSelect}
      handleReadyForNext={handleReadyForNext}
      handleAddCustomQuestion={handleAddCustomQuestion}
    />
  );
}

// ── PLAYING COMPONENT (Normalized) ────────────────────────
function WouldYouRatherPlaying({
  game, uid, gameId, router, showExit, setShowExit, showCreateQ, setShowCreateQ, selected, handleSelect, handleReadyForNext, handleAddCustomQuestion
}: {
  game: GameState; uid: string; gameId: string; router: any; showExit: boolean; setShowExit: (b: boolean) => void; showCreateQ: boolean; setShowCreateQ: (b: boolean) => void; selected: 'A' | 'B' | null; handleSelect: (c: 'A' | 'B') => void; handleReadyForNext: () => void; handleAddCustomQuestion: (q: Partial<WouldYouRatherQuestion>) => void;
}) {
  const opponentUid = game.players.find(p => p !== uid) || '';
  const opponentName = game.playerNames[opponentUid] || 'Partner';
  const myPhoto = game.playerPhotos[uid];
  const oppPhoto = game.playerPhotos[opponentUid];
  const hasAnswered = !!game.responses[uid];
  const bothAnswered = Object.keys(game.responses).length === 2;
  const currentQuestion = game.currentQuestion;

  if (!currentQuestion) return <Skeleton />;

  return (
    <div className="game-active-screen" style={{ background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column' }}>
    <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      {showCreateQ && <CreateQuestionModal onClose={() => setShowCreateQ(false)} onSubmit={handleAddCustomQuestion} />}

      <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${((game.score.total) / QUESTIONS_PER_GAME) * 100}%`, height: '100%', background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 12, color: '#7A5C7A', fontWeight: 600 }}>{game.score.total + 1}/{QUESTIONS_PER_GAME}</span>
      </div>

      <div style={{ padding: '0 20px 24px', display: 'flex', gap: 8 }}>
        {[
          { id: uid, name: 'You', photo: myPhoto, answered: hasAnswered, ready: game.readyForNext?.includes(uid) },
          { id: opponentUid, name: opponentName, photo: oppPhoto, answered: !!game.responses[opponentUid], ready: game.readyForNext?.includes(opponentUid) }
        ].map(p => (
          <div key={p.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '8px 12px', border: p.ready ? '2px solid #A8D5A2' : '1.5px solid transparent' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
              {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{p.name[0]}</div>}
            </div>
            <span style={{ fontSize: 12, color: '#3D2B3D', flex: 1 }}>{p.name}</span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.answered ? '#A8D5A2' : '#eee' }} />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px' }}>
        <button onClick={() => handleSelect('A')} disabled={hasAnswered} style={{ flex: 1, background: game.revealed && game.responses[uid] === 'A' ? 'rgba(232,160,160,0.15)' : 'white', border: selected === 'A' ? '2px solid #E8A0A0' : '1.5px solid #eee', borderRadius: 24, padding: 32, cursor: hasAnswered ? 'default' : 'pointer' }}>
          <p style={{ fontSize: 12, color: '#E8A0A0', fontWeight: 800, marginBottom: 8 }}>OPTION A</p>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic' }}>{currentQuestion.optionA}</p>
        </button>
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: '#7A5C7A', fontWeight: 700, padding: '4px 12px', background: 'white', borderRadius: 100, border: '1px solid #eee' }}>OR</span></div>
        <button onClick={() => handleSelect('B')} disabled={hasAnswered} style={{ flex: 1, background: game.revealed && game.responses[uid] === 'B' ? 'rgba(201,184,216,0.15)' : 'white', border: selected === 'B' ? '2px solid #C9B8D8' : '1.5px solid #eee', borderRadius: 24, padding: 32, cursor: hasAnswered ? 'default' : 'pointer' }}>
          <p style={{ fontSize: 12, color: '#C9B8D8', fontWeight: 800, marginBottom: 8 }}>OPTION B</p>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic' }}>{currentQuestion.optionB}</p>
        </button>
      </div>

      {bothAnswered && (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          {!game.readyForNext?.includes(uid) ? (
            <button onClick={handleReadyForNext} style={{ width: '100%', padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
              {game.responses[uid] === game.responses[opponentUid] ? "A Great Match! 🎉" : "Interesting... 🤔"} Next Question
            </button>
          ) : ( <p style={{ color: '#7A5C7A', fontSize: 13, fontStyle: 'italic' }}>Waiting for {opponentName}...</p> )}
        </div>
      )}

      <div style={{ padding: '0 20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowCreateQ(true)} style={{ fontSize: 12, color: '#7A5C7A', background: 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', borderRadius: 100, cursor: 'pointer' }}>+ Suggest dilemma</button>
        <span style={{ fontSize: 12, color: 'rgba(122,92,122,0.4)' }}>Game ID: {gameId}</span>
      </div>
    </GameScreen>
    </div>
  );
}

export default function WouldYouRatherPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <WouldYouRatherInner />
    </Suspense>
  );
}
