'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import { RAPID_FIRE_QUESTIONS, Question } from '@/lib/questions';

interface GameState {
  type: 'rapidfire';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  currentPlayer: string;
  timerStartedAt: number | null;
  timerDuration: number;
  currentQuestionIndex: number;
  answers: Record<string, Record<string, 'A' | 'B'>>;
  roundsCompleted: number;
  status: 'waiting' | 'round1' | 'round2' | 'finished';
  questions: Question[];
  createdAt: number;
}

const QUESTIONS_PER_ROUND = 10;
const ROUND_DURATION = 60;

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
// TIMER HOOK - uses server timestamp for sync
// ────────────────────────────────────────────────────────────
function useTimer(timerStartedAt: number | null, duration: number, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!timerStartedAt || !isActive) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const newElapsed = Math.floor((now - timerStartedAt) / 1000);
      setElapsed(Math.min(newElapsed, duration));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 100);
    return () => clearInterval(interval);
  }, [timerStartedAt, duration, isActive]);

  const remaining = Math.max(0, duration - elapsed);
  const progress = elapsed / duration;

  return { elapsed, remaining, progress, isFinished: remaining === 0 };
}

// ────────────────────────────────────────────────────────────
// RESULTS SCREEN
// ────────────────────────────────────────────────────────────
function ResultsScreen({ game, uid, router }: { game: GameState; uid: string; router: any }) {
  const opponentUid = game.players.find(p => p !== uid) || '';
  const myAnswers = game.answers[uid] || {};
  const opponentAnswers = game.answers[opponentUid] || {};

  const allQuestions = game.questions;
  const matches = allQuestions.filter((q, i) => {
    const qKey = q.id;
    return myAnswers[qKey] && opponentAnswers[qKey] && myAnswers[qKey] === opponentAnswers[qKey];
  }).length;

  const matchPercent = Math.round((matches / allQuestions.length) * 100);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 40px', overflow: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 8 }}>Results</p>
        <p style={{ fontSize: 48, fontWeight: 700, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{matchPercent}% Match</p>
        <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)' }}>You agreed on {matches} of {allQuestions.length} questions</p>
      </div>

      {/* Question by question comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {allQuestions.map((q, i) => {
          const myAnswer = myAnswers[q.id];
          const oppAnswer = opponentAnswers[q.id];
          const isMatch = myAnswer === oppAnswer && myAnswer;
          const myChoiceText = myAnswer === 'A' ? 'Option A' : myAnswer === 'B' ? 'Option B' : 'No answer';
          const oppChoiceText = oppAnswer === 'A' ? 'Option A' : oppAnswer === 'B' ? 'Option B' : 'No answer';

          return (
            <div key={q.id} style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: '14px 16px', border: isMatch ? '1.5px solid rgba(168,213,162,0.5)' : '1.5px solid rgba(255,255,255,0.7)' }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A5C7A', marginBottom: 8 }}>Question {i + 1}</p>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 12 }}>{q.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: myAnswer ? 'rgba(232,160,160,0.15)' : 'rgba(200,200,200,0.1)', border: myAnswer ? '1px solid rgba(232,160,160,0.3)' : 'none' }}>
                  <p style={{ fontSize: 10, color: 'rgba(122,92,122,0.5)', marginBottom: 2 }}>You chose</p>
                  <p style={{ fontSize: 12, color: myAnswer ? '#3D2B3D' : '#999' }}>{myChoiceText}</p>
                </div>
                <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: oppAnswer ? 'rgba(201,184,216,0.15)' : 'rgba(200,200,200,0.1)', border: oppAnswer ? '1px solid rgba(201,184,216,0.3)' : 'none' }}>
                  <p style={{ fontSize: 10, color: 'rgba(122,92,122,0.5)', marginBottom: 2 }}>Partner chose</p>
                  <p style={{ fontSize: 12, color: oppAnswer ? '#3D2B3D' : '#999' }}>{oppChoiceText}</p>
                </div>
              </div>
              {isMatch && (
                <p style={{ fontSize: 11, color: '#5A7A56', fontWeight: 500, marginTop: 10, textAlign: 'center' }}>
                  You both chose the same!
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => router.push('/games')} style={{ marginTop: 24, padding: '14px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
        Back to Games
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
function RapidFireInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | null>(null);
  const questionsRef = useRef<Question[]>([]);

  // Generate questions once
  useEffect(() => {
    if (questionsRef.current.length === 0) {
      const shuffled = [...RAPID_FIRE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_ROUND * 2);
      questionsRef.current = shuffled;
    }
  }, []);

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

  // Timer
  const isActive = game?.status === 'round1' || game?.status === 'round2';
  const { remaining, progress, isFinished } = useTimer(game?.timerStartedAt || null, game?.timerDuration || ROUND_DURATION, isActive && game?.currentPlayer === uid);

  // Auth/Loading states
  if (!uid) return <Skeleton />;

  const handleCreate = async () => {
    const newId = await generateGameId();
    const user = auth?.currentUser;
    await setDoc(doc(db, 'games', newId), {
      type: 'rapidfire',
      creatorUid: uid,
      players: [uid],
      playerNames: { [uid]: user?.displayName || 'You' },
      playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
      currentPlayer: uid,
      timerStartedAt: null,
      timerDuration: ROUND_DURATION,
      currentQuestionIndex: 0,
      answers: {},
      roundsCompleted: 0,
      status: 'waiting',
      questions: questionsRef.current,
      createdAt: serverTimestamp(),
    });
    router.replace(`/games/rapid-fire?id=${newId}`);
  };

  // No game ID in URL - show landing/create screen
  if (!gameId && !game) {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Rapid Fire" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(232,160,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(232,160,160,0.3)' }}>
              ⚡
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#3D2B3D', marginBottom: 8 }}>Rapid Fire</h2>
              <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', maxWidth: 260 }}>60 seconds. 10 questions. How many can you and your partner agree on?</p>
            </div>
            <button onClick={handleCreate} style={{ width: '100%', maxWidth: 240, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(232,160,160,0.2)' }}>
              Create New Game
            </button>
            <button onClick={() => router.push('/games')} style={{ fontSize: 13, color: '#7A5C7A', background: 'none', border: 'none', cursor: 'pointer' }}>
              Back to Games
            </button>
          </div>
        </GameScreen>
      </>
    );
  }

  if (!game) return <Skeleton />;

  const opponentUid = game.players.find(p => p !== uid) || '';
  const opponentName = game.playerNames[opponentUid] || 'Partner';
  const myName = game.playerNames[uid] || 'You';
  const myPhoto = game.playerPhotos[uid];
  const oppPhoto = game.playerPhotos[opponentUid];
  const isMyTurn = game.currentPlayer === uid;
  const currentQuestion = game.questions[game.currentQuestionIndex];

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
      status: 'round1',
      timerStartedAt: Date.now(),
    });
  };

  const handleAnswer = async (answer: 'A' | 'B') => {
    if (!game || !isMyTurn || !currentQuestion) return;
    setSelectedAnswer(answer);

    const gameRef = doc(db, 'games', gameId);
    const nextIndex = game.currentQuestionIndex + 1;

    if (nextIndex >= QUESTIONS_PER_ROUND) {
      // Round complete - switch player
      const nextPlayer = game.currentPlayer === uid ? opponentUid : uid;
      const nextRound = game.roundsCompleted + 1;

      if (nextRound >= 2) {
        // Game over
        await updateDoc(gameRef, {
          [`answers.${uid}.${currentQuestion.id}`]: answer,
          status: 'finished',
          roundsCompleted: nextRound,
        });
      } else {
        await updateDoc(gameRef, {
          [`answers.${uid}.${currentQuestion.id}`]: answer,
          currentPlayer: nextPlayer,
          currentQuestionIndex: 0,
          timerStartedAt: Date.now(),
          roundsCompleted: nextRound,
          status: nextRound === 1 ? 'round2' : 'finished',
        });
      }
    } else {
      await updateDoc(gameRef, {
        [`answers.${uid}.${currentQuestion.id}`]: answer,
        currentQuestionIndex: nextIndex,
      });
    }

    setTimeout(() => setSelectedAnswer(null), 300);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Waiting for partner
  if (game.status === 'waiting') {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Rapid Fire" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontStyle: 'italic', color: '#7A5C7A', textAlign: 'center' }}>Share this code with your partner</p>
            <div onClick={copyCode} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, letterSpacing: '0.2em', color: '#3D2B3D', cursor: 'pointer', padding: '16px 32px', background: 'rgba(255,255,255,0.5)', borderRadius: 16 }}>
              {gameId}
            </div>
            <p style={{ fontSize: 12, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy code'}</p>
            <button onClick={handleJoin} style={{ marginTop: 24, padding: '14px 32px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              Join Game
            </button>
          </div>
        </GameScreen>
      </>
    );
  }

  // Game finished - show results
  if (game.status === 'finished') {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Rapid Fire" onExit={() => setShowExit(true)}>
          <ResultsScreen game={game} uid={uid} router={router} />
        </GameScreen>
      </>
    );
  }

  // Playing
  const myAnswers = game.answers[uid] || {};
  const questionsAnswered = Object.keys(myAnswers).length;

  return (
    <>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      <GameScreen title="Rapid Fire" onExit={() => setShowExit(true)}>
        {/* Timer Ring */}
        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            {/* Progress ring */}
            <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="70" cy="70" r="62"
                fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="12"
              />
              <circle
                cx="70" cy="70" r="62"
                fill="none" stroke="url(#gradient)" strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 62}
                strokeDashoffset={2 * Math.PI * 62 * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E8A0A0" />
                  <stop offset="100%" stopColor="#C9B8D8" />
                </linearGradient>
              </defs>
            </svg>
            {/* Time display */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 700, color: '#3D2B3D' }}>
                {remaining}
              </span>
              <span style={{ fontSize: 11, color: '#7A5C7A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>seconds</span>
            </div>
          </div>
        </div>

        {/* Player indicator */}
        <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#7A5C7A' }}>
            {isMyTurn ? "Your turn - answer quickly!" : `${opponentName}'s turn`}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 4 }}>
            Question {game.currentQuestionIndex + 1} of {QUESTIONS_PER_ROUND}
          </p>
        </div>

        {/* Question Card */}
        {currentQuestion && isMyTurn && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '24px', border: '1.5px solid rgba(255,255,255,0.8)', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic', color: '#3D2B3D', lineHeight: 1.5 }}>
                {currentQuestion.text}
              </p>
            </div>
          </div>
        )}

        {/* Answer Options */}
        {isMyTurn && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px 16px', justifyContent: 'center' }}>
            <button
              onClick={() => handleAnswer('A')}
              disabled={!!selectedAnswer}
              style={{
                flex: 1,
                background: selectedAnswer === 'A' ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)' : 'rgba(255,255,255,0.65)',
                border: selectedAnswer === 'A' ? 'none' : '2px solid rgba(232,160,160,0.4)',
                borderRadius: 20,
                cursor: selectedAnswer ? 'default' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '0 24px',
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: selectedAnswer === 'A' ? 'white' : '#E8A0A0' }}>A</span>
              <span style={{ fontSize: 14, color: selectedAnswer === 'A' ? 'white' : '#3D2B3D', fontWeight: 500 }}>Option A</span>
            </button>

            <button
              onClick={() => handleAnswer('B')}
              disabled={!!selectedAnswer}
              style={{
                flex: 1,
                background: selectedAnswer === 'B' ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)' : 'rgba(255,255,255,0.65)',
                border: selectedAnswer === 'B' ? 'none' : '2px solid rgba(201,184,216,0.4)',
                borderRadius: 20,
                cursor: selectedAnswer ? 'default' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '0 24px',
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: selectedAnswer === 'B' ? 'white' : '#C9B8D8' }}>B</span>
              <span style={{ fontSize: 14, color: selectedAnswer === 'B' ? 'white' : '#3D2B3D', fontWeight: 500 }}>Option B</span>
            </button>
          </div>
        )}

        {!isMyTurn && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {oppPhoto ? (
                  <img src={oppPhoto} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} alt={opponentName} />
                ) : (
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: '#7A5C7A' }}>{opponentName[0]?.toUpperCase()}</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: '#7A5C7A' }}>{opponentName} is answering...</p>
              <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.4)', marginTop: 8 }}>Get ready for your turn!</p>
            </div>
          </div>
        )}

        {/* Code row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px 16px' }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, letterSpacing: '0.12em', color: 'rgba(61,43,61,0.5)' }}>{gameId}</span>
          <button onClick={copyCode} style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </GameScreen>
    </>
  );
}

export default function RapidFirePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <RapidFireInner />
    </Suspense>
  );
}
