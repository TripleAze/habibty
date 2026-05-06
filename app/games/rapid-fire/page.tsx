'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import { useHeader } from '@/lib/HeaderContext';
import { RAPID_FIRE_QUESTIONS } from '@/lib/questions';

interface RapidFireQuestion {
  id: string;
  text: string;
  type: 'binary' | 'single';
  options?: string[];
  category: string;
}

interface GameState {
  type: 'rapidfire';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  currentPlayer: string;
  difficulty: 'chill' | 'standard' | 'blitz';
  timerStartedAt: number | null;
  timerDuration: number;
  currentQuestionIndex: number;
  answers: Record<string, Record<string, string>>;
  roundsCompleted: number;
  status: 'waiting' | 'playing' | 'round2' | 'finished';
  questions: RapidFireQuestion[];
  usedQuestionIds: string[];
  createdAt: number;
  creatorUid: string;
}

const DIFFICULTY_CONFIG = {
  chill: { duration: 90, preload: 15 },
  standard: { duration: 60, preload: 25 },
  blitz: { duration: 30, preload: 20 },
};

// ────────────────────────────────────────────────────────────
// SKELETON
// ────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ width: 200, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ width: '80%', height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.4)' }} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// RESULTS SCREEN
// ────────────────────────────────────────────────────────────
function ResultsScreen({ game, uid, router }: { game: GameState; uid: string; router: any }) {
  const opponentUid = game.players.find(p => p !== uid) || '';
  const myAnswers = game.answers[uid] || {};
  const opponentAnswers = game.answers[opponentUid] || {};

  const allQuestions = game.questions;
  const matches = allQuestions.filter((q) => {
    const myA = myAnswers[q.id]?.toLowerCase().trim();
    const oppA = opponentAnswers[q.id]?.toLowerCase().trim();
    return myA && oppA && (myA === oppA || (q.type === 'binary' && myA === oppA));
  }).length;

  const matchPercent = Math.round((matches / allQuestions.length) * 100);
  
  // Calculate speed (questions per minute)
  const durationUsed = game.timerDuration;
  const qpm = Math.round((Object.keys(myAnswers).length / (durationUsed / 60)) * 10) / 10;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 40px', overflow: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 28, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 8 }}>Match Results</p>
        <p style={{ fontSize: 56, fontWeight: 700, background: 'linear-gradient(135deg,#E8A0A0,#9B7EBD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{matchPercent}%</p>
        <p style={{ fontSize: 13, color: '#7A5C7A', fontWeight: 600, marginTop: 4 }}>You matched on {matches} out of {allQuestions.length} dilemmas</p>
        <div style={{ marginTop: 12, display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.5)', border: '1px solid #eee', fontSize: 12, color: '#7A5C7A' }}>
          Your Speed: 🚀 {qpm} QPM
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allQuestions.map((q, i) => {
          const myA = myAnswers[q.id];
          const oppA = opponentAnswers[q.id];
          const isMatch = myA && oppA && myA.toLowerCase().trim() === oppA.toLowerCase().trim();

          return (
            <div key={q.id} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 18, padding: '16px', border: isMatch ? '2px solid #A8D5A2' : '1.5px solid #eee', transition: 'all 0.3s' }}>
              <p style={{ fontSize: 10, color: '#C9829A', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Question {i + 1}</p>
              <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 17, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 16 }}>{q.text}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'white', border: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: 9, color: '#7A5C7A', opacity: 0.6, marginBottom: 4, fontWeight: 600 }}>You</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#3D2B3D' }}>{myA || '-'}</p>
                </div>
                <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'white', border: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: 9, color: '#7A5C7A', opacity: 0.6, marginBottom: 4, fontWeight: 600 }}>Partner</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#3D2B3D' }}>{oppA || '-'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => router.push('/games')} style={{ marginTop: 32, padding: '18px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 600, boxShadow: '0 4px 15px rgba(232,160,160,0.3)', cursor: 'pointer' }}>Return to Lobby</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
function RapidFireInner() {
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [singleValue, setSingleValue] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'chill' | 'standard' | 'blitz'>('standard');

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
    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (snap.exists()) setGame(snap.data() as GameState);
    });
    return () => unsub();
  }, [gameId]);

  // Timer logic
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(1);
  const isMyTurn = game?.currentPlayer === uid && (game?.status === 'playing' || game?.status === 'round2');

  useEffect(() => {
    if (!isMyTurn || !game?.timerStartedAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - game.timerStartedAt!) / 1000);
      const rem = Math.max(0, game.timerDuration - elapsed);
      setRemaining(rem);
      setProgress(rem / game.timerDuration);
      if (rem === 0) {
        clearInterval(interval);
        handleRoundTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, game?.timerStartedAt, game?.timerDuration]);

  // SELECTION LOGIC
  const selectQuestions = async (count: number, usedIds: string[]): Promise<RapidFireQuestion[]> => {
    const colRef = collection(db, 'rapid_fire_questions');
    const snap = await getDocs(query(colRef, limit(100)));
    let all = snap.docs.map(d => ({ id: d.id, ...d.data() } as RapidFireQuestion)).filter(q => !usedIds.includes(q.id));
    
    if (all.length < count) {
      console.log("Not enough unseen questions. Shuffling from main pool.");
      const fullSnap = await getDocs(colRef);
      all = fullSnap.docs.map(d => ({ id: d.id, ...d.data() } as RapidFireQuestion));
    }

    return all.sort(() => Math.random() - 0.5).slice(0, count);
  };

  const handleCreate = async () => {
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const initialQSet = await selectQuestions(config.preload, []);
    const newId = await generateGameId();
    const user = auth?.currentUser;

    await setDoc(doc(db, 'games', newId), {
      type: 'rapidfire',
      creatorUid: uid,
      players: [uid],
      playerNames: { [uid]: user?.displayName || 'You' },
      playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
      currentPlayer: uid,
      difficulty: selectedDifficulty,
      timerStartedAt: null,
      timerDuration: config.duration,
      currentQuestionIndex: 0,
      answers: {},
      roundsCompleted: 0,
      status: 'waiting',
      questions: initialQSet,
      usedQuestionIds: initialQSet.map(q => q.id),
      createdAt: serverTimestamp(),
    });
    router.replace(`/games/rapid-fire?id=${newId}`);
  };

  const handleJoin = async () => {
    if (!gameId) return;
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const user = auth?.currentUser;
    await updateDoc(gameRef, {
      players: [...(snap.data()?.players || []), uid],
      [`playerNames.${uid}`]: user?.displayName || 'You',
      ...(user?.photoURL ? { [`playerPhotos.${uid}`]: user.photoURL } : {}),
      status: 'playing',
      timerStartedAt: Date.now(),
    });
  };

  const handleAnswer = async (answer: string) => {
    if (!game || !isMyTurn) return;
    const gameRef = doc(db, 'games', gameId);
    const currentQ = game.questions[game.currentQuestionIndex];
    const nextIndex = game.currentQuestionIndex + 1;

    const update: any = {
      [`answers.${uid}.${currentQ.id}`]: answer,
    };

    if (nextIndex >= game.questions.length) {
      if (game.status === 'playing') {
        const opponentUid = game.players.find(p => p !== uid);
        update.status = 'round2';
        update.currentPlayer = opponentUid;
        update.currentQuestionIndex = 0;
        update.timerStartedAt = Date.now();
      } else {
        update.status = 'finished';
      }
    } else {
      update.currentQuestionIndex = nextIndex;
    }

    await updateDoc(gameRef, update);
    setSingleValue('');
  };

  const handleRoundTimeout = async () => {
    if (!game || !isMyTurn) return;
    const gameRef = doc(db, 'games', gameId);
    if (game.status === 'playing') {
      const opponentUid = game.players.find(p => p !== uid);
      await updateDoc(gameRef, { status: 'round2', currentPlayer: opponentUid, currentQuestionIndex: 0, timerStartedAt: Date.now() });
    } else {
      await updateDoc(gameRef, { status: 'finished' });
    }
  };

  const handleSeedDB = async () => {
    const batch = writeBatch(db);
    const col = collection(db, 'rapid_fire_questions');
    
    const BINARY = [
      "Love or money", "Text or call", "Morning or night", "Hug or kiss", "Stay in or go out", "Sweet or funny", "Clingy or independent", "Long calls or short texts",
      "Surprise or plan", "Romantic or playful", "Jealous or chill", "Talk or listen", "Loud love or quiet love", "Late-night chats or early mornings", "Deep talks or jokes",
      "First move or wait", "Public or private", "Honest or protective", "Emotional or logical", "Best friend or lover first",
      "Pizza or burger", "Tea or coffee", "Android or iPhone", "Netflix or YouTube", "Beach or mountains", "Music or movies", "Dogs or cats", "Sweet or spicy",
      "Rain or sun", "Sneakers or sandals", "Books or podcasts", "Eat in or eat out", "Cold or hot", "Sleep or scroll", "Gym or home workout", "Travel or chill",
      "Fast food or home food", "Online or offline", "Save or spend", "Plan or improvise", "Risk or safe", "Lead or follow", "Work or rest", "Busy or free",
      "Focus or multitask", "Routine or random", "Quiet or loud", "Early or late", "Alone or with people", "Speak or observe", "Act or think", "Push or pause", "Start or finish",
      "Build or fix", "Learn or teach", "Try or avoid", "Stay or leave", "Control or flow", "Kiss or hug", "Flirt or ignore", "Bold or shy", "Tease or praise", "Text or voice",
      "Slow or fast", "Soft or intense", "Close or distant", "Whisper or say it", "Look or touch", "Wait or go", "Win or learn", "Luck or skill", "Try again or quit", "Fast or careful",
      "Attack or defend", "Solo or team", "Practice or perform", "Safe or risky", "Compete or cooperate", "Short or long", "Think fast or act fast", "Control or chaos"
    ];
    
    const SINGLE = [
      "Favorite food", "Favorite color", "Best memory", "Dream destination", "Favorite song", "Favorite person", "Favorite hobby", "Biggest fear", "Best day ever", "Favorite movie",
      "One word for me", "Favorite emoji", "Favorite app", "Favorite snack", "Favorite drink", "Favorite game", "Favorite place", "Favorite outfit", "Favorite smell", "Favorite time",
      "One goal", "One regret", "One wish", "One habit", "One skill", "One dream", "One truth", "One lie", "One secret", "What are you feeling", "Miss me?", "Thinking of?", "Want what?",
      "Need what?", "Say something", "Describe me", "Describe us", "One word for love", "One word for today", "First thing you see", "First thought now", "First word in mind", "One emotion"
    ];

    BINARY.forEach(q => {
      const d = doc(col);
      batch.set(d, { text: q, type: 'binary', category: 'general', isActive: true });
    });
    SINGLE.forEach(q => {
      const d = doc(col);
      batch.set(d, { text: q, type: 'single', category: 'personal', isActive: true });
    });

    await batch.commit();
    alert("Seeded dataset successfully!");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!uid) return <Skeleton />;

  if (!gameId && !game) {
    return (
      <GameScreen title="Rapid Fire" onExit={() => router.push('/games')}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, justifyContent: 'center', gap: 36 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(232,160,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', boxShadow: '0 8px 16px rgba(232,160,160,0.1)' }}>⚡</div>
            <h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 36, color: '#3D2B3D' }}>Rapid Fire</h2>
            <p style={{ fontSize: 13, color: '#7A5C7A', opacity: 0.8, maxWidth: 220, margin: '8px auto 0' }}>Sync your minds at high speed in this dual-round challenge.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B06060', letterSpacing: '0.12em' }}>Select Intensity</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['chill', 'standard', 'blitz'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSelectedDifficulty(mode)}
                  style={{ flex: 1, padding: '16px 8px', borderRadius: 20, border: selectedDifficulty === mode ? '2.5px solid #E8A0A0' : '1.5px solid #eee', background: selectedDifficulty === mode ? 'rgba(232,160,160,0.06)' : 'white', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#3D2B3D', textTransform: 'capitalize', marginBottom: 4 }}>{mode}</span>
                  <span style={{ fontSize: 11, color: '#7A5C7A', opacity: 0.7 }}>{DIFFICULTY_CONFIG[mode].duration}s • {DIFFICULTY_CONFIG[mode].preload}Q</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} style={{ width: '100%', padding: '20px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 700, fontSize: 16, boxShadow: '0 10px 30px rgba(232,160,160,0.35)', cursor: 'pointer' }}>Generate Challenge</button>
        </div>
      </GameScreen>
    );
  }

  if (!game) return <Skeleton />;

  if (game.status === 'finished') {
    return <GameScreen title="Results" onExit={() => router.push('/games')}><ResultsScreen game={game} uid={uid} router={router} /></GameScreen>;
  }

  if (game.status === 'waiting') {
    return (
      <GameScreen title="Waiting" onExit={() => router.push('/games')}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(232,160,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>🔗</div>
          <div>
            <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, color: '#7A5C7A', fontStyle: 'italic', marginBottom: 8 }}>Partner Invite Code</p>
            <div onClick={copyCode} style={{ fontSize: 44, letterSpacing: '0.15em', fontFamily: "var(--font-cormorant),serif", color: '#3D2B3D', cursor: 'pointer', background: 'rgba(255,255,255,0.4)', padding: '16px 32px', borderRadius: 20 }}>{gameId}</div>
            <p style={{ fontSize: 12, color: '#B06060', marginTop: 12 }}>{copied ? 'Copied to clipboard!' : 'Tap code to copy'}</p>
          </div>
          <button onClick={handleJoin} style={{ padding: '16px 48px', borderRadius: 100, background: '#E8A0A0', color: 'white', border: 'none', fontWeight: 700, boxShadow: '0 6px 20px rgba(232,160,160,0.2)' }}>Join Game</button>
          {uid === game.creatorUid && <button onClick={handleSeedDB} style={{ marginTop: 60, opacity: 0.2, fontSize: 10, background: 'none', border: 'none' }}>[ADMIN] Seed 150 Dataset</button>}
        </div>
      </GameScreen>
    );
  }

  const currentQ = game.questions[game.currentQuestionIndex];
  const opponentName = game.playerNames[game.players.find(p => p !== uid) || 'Partner'];

  return (
    <GameScreen title="Rapid Fire" onExit={() => setShowExit(true)}>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.4)', height: 10, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', background: progress < 0.25 ? '#B06060' : 'linear-gradient(90deg,#E8A0A0,#C9B8D8)', transition: 'width 1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#7A5C7A', fontWeight: 700 }}>{remaining}s left</span>
          <span style={{ fontSize: 11, color: '#7A5C7A', fontWeight: 700 }}>Q {game.currentQuestionIndex + 1} / {game.questions.length}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 24px 40px', justifyContent: 'space-between' }}>
        {isMyTurn ? (
          <>
            <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', borderRadius: 28, padding: 36, border: '1.5px solid rgba(255,255,255,0.9)', textAlign: 'center', boxShadow: '0 15px 35px rgba(122,92,122,0.06)' }}>
              <p style={{ fontSize: 10, color: '#C9829A', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Rapid Fire Question</p>
              <h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 26, fontStyle: 'italic', color: '#3D2B3D', lineHeight: 1.3 }}>{currentQ?.text}</h1>
            </div>

            {currentQ?.type === 'binary' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['A', 'B'].map((opt, i) => {
                  const parts = currentQ.text.split(/ or /i);
                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(i === 0 ? 'A' : 'B')}
                      style={{ padding: '24px 20px', borderRadius: 22, background: 'white', border: '2px solid #f0f0f0', fontSize: 18, fontWeight: 700, color: i === 0 ? '#E8A0A0' : '#C9B8D8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'all 0.2s' }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {i === 0 ? (parts[0] || 'Option A') : (parts[1] || 'Option B')}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  autoFocus
                  placeholder="First word only..."
                  value={singleValue}
                  onChange={e => setSingleValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && singleValue && handleAnswer(singleValue)}
                  style={{ width: '100%', padding: '22px', borderRadius: 24, border: '2.5px solid #E8A0A0', fontSize: 20, textAlign: 'center', fontFamily: 'inherit', background: 'white', boxShadow: '0 8px 20px rgba(232,160,160,0.1)' }}
                />
                <button 
                  onClick={() => singleValue && handleAnswer(singleValue)} 
                  disabled={!singleValue}
                  style={{ padding: 20, borderRadius: 100, background: '#3D2B3D', color: 'white', border: 'none', fontWeight: 700, fontSize: 16, opacity: singleValue ? 1 : 0.5, transition: 'all 0.3s' }}
                >
                  Send Answer ⚡
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 40px rgba(122,92,122,0.1)' }}>
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, animation: 'pulse 2s infinite' }}>⚡</div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 26, fontStyle: 'italic', color: '#3D2B3D' }}>{opponentName} is in the zone...</h3>
              <p style={{ fontSize: 14, color: '#7A5C7A', marginTop: 8, opacity: 0.8 }}>Watch the timer, your turn is coming!</p>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(232,160,160,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(232,160,160,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(232,160,160,0); }
        }
      `}</style>
    </GameScreen>
  );
}

export default function RapidFirePage() {
  return <Suspense fallback={<Skeleton />}><RapidFireInner /></Suspense>;
}
