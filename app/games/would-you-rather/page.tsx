'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import { WOULD_YOU_RATHER_QUESTIONS, WouldYouRatherQuestion } from '@/lib/questions';

interface GameState {
  type: 'wouldyourather';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  questionIndex: number;
  responses: Record<string, 'A' | 'B'>;
  revealed: boolean;
  readyForNext: string[];
  status: 'waiting' | 'playing' | 'finished';
  score: { matches: number; total: number };
  createdAt: number;
}

const QUESTIONS_PER_GAME = 10;

// ────────────────────────────────────────────────────────────
// SKELETON
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
function WouldYouRatherInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [copied, setCopied] = useState(false);
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
      (error) => {
        console.error("Firestore snapshot error:", error);
      }
    );
    return () => unsub();
  }, [gameId]);

  // Auth/Loading states
  if (!uid) return <Skeleton />;

  // No game ID in URL - show landing/create screen
  if (!gameId && !game) {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(155,126,189,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(155,126,189,0.3)' }}>
              🤔
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#3D2B3D', marginBottom: 8 }}>Would You Rather</h2>
              <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', maxWidth: 260 }}>Make impossible choices together. See if you and your partner agree!</p>
            </div>
            <button onClick={handleCreate} style={{ width: '100%', maxWidth: 240, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#9B7EBD,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(155,126,189,0.2)' }}>
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
  const hasAnswered = !!game.responses[uid];
  const bothAnswered = game.responses[uid] && game.responses[opponentUid];
  const allReadyForNext = game.readyForNext?.length === 2;

  const currentQuestion = WOULD_YOU_RATHER_QUESTIONS[game.questionIndex % WOULD_YOU_RATHER_QUESTIONS.length];

  const handleCreate = async () => {
    const newId = await generateGameId();
    const user = auth?.currentUser;
    await setDoc(doc(db, 'games', newId), {
      type: 'wouldyourather',
      creatorUid: uid,
      players: [uid],
      playerNames: { [uid]: user?.displayName || 'You' },
      playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
      questionIndex: 0,
      responses: {},
      revealed: false,
      readyForNext: [],
      status: 'waiting',
      score: { matches: 0, total: 0 },
      createdAt: serverTimestamp(),
    });
    router.replace(`/games/would-you-rather?id=${newId}`);
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
    if (hasAnswered || !game) return;
    setSelected(choice);
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      responses: { ...game.responses, [uid]: choice },
      revealed: bothAnswered || true,
    });
  };

  const handleReadyForNext = async () => {
    if (!game || game.readyForNext?.includes(uid)) return;
    const gameRef = doc(db, 'games', gameId);

    const newReady = [...(game.readyForNext || []), uid];

    if (newReady.length === 2) {
      // Both ready - move to next question
      const nextIndex = game.questionIndex + 1;
      const isMatch = game.responses[uid] === game.responses[opponentUid];

      if (nextIndex >= QUESTIONS_PER_GAME) {
        // Game over
        await updateDoc(gameRef, {
          readyForNext: [],
          status: 'finished',
          [`score.matches`]: game.score.matches + (isMatch ? 1 : 0),
          [`score.total`]: game.score.total + 1,
        });
      } else {
        await updateDoc(gameRef, {
          questionIndex: nextIndex,
          responses: {},
          revealed: false,
          readyForNext: [],
          [`score.matches`]: game.score.matches + (isMatch ? 1 : 0),
          [`score.total`]: game.score.total + 1,
        });
      }
    } else {
      await updateDoc(gameRef, {
        readyForNext: newReady,
      });
    }
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
        <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
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

  // Game finished
  if (game.status === 'finished') {
    const matchPercent = Math.round((game.score.matches / game.score.total) * 100);
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 8 }}>Game Over!</p>
              <p style={{ fontSize: 48, fontWeight: 700, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{matchPercent}% Match</p>
              <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', marginTop: 8 }}>You agreed on {game.score.matches} of {game.score.total} questions</p>
            </div>

            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320 }}>
              <button onClick={() => router.push('/games')} style={{ flex: 1, padding: '14px', borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(232,160,160,0.35)', color: '#7A5C7A', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                Back to Games
              </button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '14px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                New Game
              </button>
            </div>
          </div>
        </GameScreen>
      </>
    );
  }

  // Playing
  return (
    <>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
        {/* Progress */}
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${((game.questionIndex) / QUESTIONS_PER_GAME) * 100}%`, height: '100%', background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: '#7A5C7A', fontWeight: 500 }}>{game.questionIndex + 1}/{QUESTIONS_PER_GAME}</span>
        </div>

        {/* Players status */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
          {[
            { uid, name: 'You', photo: myPhoto, answered: hasAnswered, ready: game.readyForNext?.includes(uid) },
            { uid: opponentUid, name: opponentName, photo: oppPhoto, answered: !!game.responses[opponentUid], ready: game.readyForNext?.includes(opponentUid) },
          ].map(p => (
            <div key={p.uid} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '10px 12px', border: p.ready ? '2px solid rgba(168,213,162,0.6)' : '1.5px solid rgba(255,255,255,0.7)' }}>
              {p.photo ? (
                <img src={p.photo} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt={p.name} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#F2C4CE,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 14, color: '#3D2B3D' }}>
                  {p.name[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, color: '#3D2B3D', flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 100, background: p.answered ? 'rgba(168,213,162,0.25)' : 'rgba(201,184,216,0.2)', color: p.answered ? '#5A7A56' : '#7A6A8A' }}>
                {p.ready ? 'Ready' : p.answered ? 'Answered' : 'Thinking'}
              </span>
            </div>
          ))}
        </div>

        {/* Question Card */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '20px', border: '1.5px solid rgba(255,255,255,0.8)' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Would You Rather</p>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center', lineHeight: 1.5 }}>
              {currentQuestion.optionA}
            </p>
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(232,160,160,0.4),transparent)', margin: '16px 0' }} />
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center', lineHeight: 1.5 }}>
              {currentQuestion.optionB}
            </p>
          </div>
        </div>

        {/* Option Cards */}
        <div style={{ flex: 1, display: 'flex', gap: 12, padding: '0 20px 16px', minHeight: 0 }}>
          <button
            onClick={() => handleSelect('A')}
            disabled={hasAnswered || bothAnswered}
            style={{
              flex: 1,
              background: selected === 'A'
                ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)'
                : game.revealed && game.responses[uid] === 'A'
                ? 'rgba(232,160,160,0.3)'
                : 'rgba(255,255,255,0.65)',
              border: selected === 'A' ? 'none' : '2px solid rgba(232,160,160,0.4)',
              borderRadius: 20,
              padding: '20px 16px',
              cursor: hasAnswered || bothAnswered ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: selected === 'A' ? 'white' : '#E8A0A0' }}>A</span>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontStyle: 'italic', color: selected === 'A' ? 'white' : '#3D2B3D', textAlign: 'center', lineHeight: 1.4 }}>
              {currentQuestion.optionA}
            </p>
          </button>

          <button
            onClick={() => handleSelect('B')}
            disabled={hasAnswered || bothAnswered}
            style={{
              flex: 1,
              background: selected === 'B'
                ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)'
                : game.revealed && game.responses[uid] === 'B'
                ? 'rgba(201,184,216,0.3)'
                : 'rgba(255,255,255,0.65)',
              border: selected === 'B' ? 'none' : '2px solid rgba(201,184,216,0.4)',
              borderRadius: 20,
              padding: '20px 16px',
              cursor: hasAnswered || bothAnswered ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 700, color: selected === 'B' ? 'white' : '#C9B8D8' }}>B</span>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontStyle: 'italic', color: selected === 'B' ? 'white' : '#3D2B3D', textAlign: 'center', lineHeight: 1.4 }}>
              {currentQuestion.optionB}
            </p>
          </button>
        </div>

        {/* Reveal / Ready state */}
        {bothAnswered && !allReadyForNext && (
          <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#7A5C7A', marginBottom: 12 }}>
              {game.readyForNext?.includes(uid) ? 'Waiting for partner...' : 'You both answered!'}
            </p>
            {!game.readyForNext?.includes(uid) && (
              <button
                onClick={handleReadyForNext}
                style={{ padding: '14px 32px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                {game.responses[uid] === game.responses[opponentUid] ? "You both chose the same! 🎉" : "Different choices! 😄"} - Next Question
              </button>
            )}
          </div>
        )}

        {allReadyForNext && (
          <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#7A5C7A' }}>Loading next question...</p>
          </div>
        )}

        {!bothAnswered && !hasAnswered && (
          <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#7A5C7A' }}>Tap your choice</p>
          </div>
        )}

        {!bothAnswered && hasAnswered && (
          <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#7A5C7A' }}>Waiting for {opponentName}...</p>
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

export default function WouldYouRatherPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <WouldYouRatherInner />
    </Suspense>
  );
}
