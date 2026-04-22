'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';

interface GameState {
  type: 'wordle';
  creatorUid: string;
  guesserUid: string | null;
  word?: string; // Only visible to creator
  hints: {
    text: string;
    emoji: string;
    category: string;
    revealLetters: number[];
  };
  attempts: string[];
  currentGuess: string;
  tileStates: Array<Array<'correct' | 'present' | 'absent'>>;
  hintLevel: 0 | 1 | 2 | 3;
  status: 'waiting' | 'playing' | 'won' | 'lost';
  winner?: string;
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  createdAt: number;
}

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

// Simple word validation (in production, use a full dictionary)
const VALID_WORD_PATTERN = /^[A-Z]{5}$/;

// ────────────────────────────────────────────────────────────
// SKELETON
// ────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 160, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, width: 180 }}>
        {Array(30).fill(0).map((_, i) => (
          <div key={i} style={{ aspectRatio: 1, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// KEYBOARD
// ────────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

function Keyboard({
  onKeyPress,
  disabled,
  keyStates,
}: {
  onKeyPress: (key: string) => void;
  disabled: boolean;
  keyStates: Record<string, 'correct' | 'present' | 'absent'>;
}) {
  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {KEYBOARD_ROWS.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {row.map(key => {
            const state = keyStates[key];
            return (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                disabled={disabled}
                style={{
                  minWidth: key === 'BACKSPACE' || key === 'ENTER' ? 50 : 36,
                  height: 50,
                  borderRadius: 8,
                  background: state
                    ? state === 'correct'
                      ? '#68B88B'
                      : state === 'present'
                      ? '#D4A94A'
                      : 'rgba(120,120,120,0.8)'
                    : 'rgba(255,255,255,0.8)',
                  border: state ? 'none' : '1px solid rgba(200,200,200,0.3)',
                  color: state ? 'white' : '#3D2B3D',
                  fontSize: key === 'BACKSPACE' || key === 'ENTER' ? 11 : 15,
                  fontWeight: 600,
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {key === 'BACKSPACE' ? '⌫' : key === 'ENTER' ? '↵' : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TILE
// ────────────────────────────────────────────────────────────
function Tile({
  letter,
  state,
  isRevealed,
  isRevealing,
}: {
  letter: string;
  state?: 'correct' | 'present' | 'absent';
  isRevealed?: boolean;
  isRevealing?: boolean;
}) {
  const bgColor = state
    ? state === 'correct'
      ? '#68B88B'
      : state === 'present'
      ? '#D4A94A'
      : 'rgba(120,120,120,0.6)'
    : 'rgba(255,255,255,0.65)';

  const borderColor = state ? bgColor : 'rgba(255,255,255,0.8)';

  return (
    <div
      style={{
        aspectRatio: 1,
        borderRadius: 8,
        background: bgColor,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontFamily: "'Cormorant Garamond',serif",
        fontWeight: 600,
        color: state ? 'white' : '#3D2B3D',
        transition: isRevealing ? 'all 0.5s ease' : 'all 0.15s',
        animation: isRevealing ? 'popIn 0.3s ease' : 'none',
      }}
    >
      {letter}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// HINT BANNER
// ────────────────────────────────────────────────────────────
function HintBanner({
  hintLevel,
  hints,
  word,
}: {
  hintLevel: number;
  hints: GameState['hints'];
  word?: string;
}) {
  if (hintLevel === 0) return null;

  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          padding: '12px 16px',
          border: '1.5px solid rgba(201,184,216,0.4)',
        }}
      >
        {hintLevel >= 1 && hints.text && (
          <p style={{ fontSize: 12, color: '#7A5C7A', marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>Hint: </span>{hints.text}
          </p>
        )}
        {hintLevel >= 2 && hints.emoji && (
          <p style={{ fontSize: 18, textAlign: 'center', marginTop: 6 }}>{hints.emoji}</p>
        )}
        {hintLevel >= 3 && word && hints.revealLetters?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10 }}>
            {Array(5).fill(0).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 40,
                  borderRadius: 6,
                  background: hints.revealLetters.includes(i)
                    ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)'
                    : 'rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(201,184,216,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontFamily: "'Cormorant Garamond',serif",
                  fontWeight: 600,
                  color: hints.revealLetters.includes(i) ? 'white' : 'rgba(122,92,122,0.3)',
                }}
              >
                {hints.revealLetters.includes(i) ? word[i] : '?'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
function WordleInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyStates, setKeyStates] = useState<Record<string, 'correct' | 'present' | 'absent'>>({});

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

  // Update key states from tile states
  useEffect(() => {
    if (!game?.tileStates || !game.attempts) return;

    const states: Record<string, 'correct' | 'present' | 'absent'> = {};

    game.attempts.forEach((attempt, i) => {
      const tileState = game.tileStates[i];
      if (!tileState) return;

      attempt.split('').forEach((letter, j) => {
        const state = tileState[j];
        if (!state) return;

        // Only upgrade states (absent -> present -> correct)
        if (!states[letter] ||
          (state === 'correct') ||
          (state === 'present' && states[letter] === 'absent')) {
          states[letter] = state;
        }
      });
    });

    setKeyStates(states);
  }, [game?.attempts, game?.tileStates]);

  const handleCreate = async () => {
    router.push('/games/wordle/setup');
  };

  const handleJoin = async () => {
    if (!gameId) return;
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.guesserUid) return; // Already has a guesser

    const user = auth?.currentUser;
    await updateDoc(gameRef, {
      guesserUid: uid,
      players: [data.creatorUid, uid],
      [`playerNames.${uid}`]: user?.displayName || 'Guesser',
      ...(user?.photoURL ? { [`playerPhotos.${uid}`]: user.photoURL } : {}),
      status: 'playing',
    });
  };

  const handleKeyPress = useCallback((key: string) => {
    if (!game || game.status !== 'playing' || isSubmitting) return;
    if (game.guesserUid !== uid && game.creatorUid !== uid) return;

    if (key === 'ENTER') {
      handleSubmit();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  }, [game, currentGuess, isSubmitting, uid]);

  const handleSubmit = async () => {
    if (!game || currentGuess.length !== WORD_LENGTH || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/wordle/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          guess: currentGuess,
          guesserUid: uid,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentGuess('');
        if (result.won || result.status === 'lost') {
          // Game over
        }
      } else {
        alert(result.error || 'Invalid guess');
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if current user is creator or guesser
  const isCreator = game?.creatorUid === uid;
  const isGuesser = game?.guesserUid === uid;
  const canPlay = isGuesser && game?.status === 'playing';

  // Waiting for partner
  if (game?.status === 'waiting') {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Partner Wordle" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
            {isCreator ? (
              <>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontStyle: 'italic', color: '#7A5C7A', textAlign: 'center' }}>Share this code with your partner</p>
                <div onClick={copyCode} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, letterSpacing: '0.2em', color: '#3D2B3D', cursor: 'pointer', padding: '16px 32px', background: 'rgba(255,255,255,0.5)', borderRadius: 16 }}>
                  {gameId}
                </div>
                <p style={{ fontSize: 12, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy code'}</p>
                <p style={{ fontSize: 13, color: 'rgba(122,92,122,0.5)', textAlign: 'center', maxWidth: 280 }}>
                  Your partner will guess the word you set. They get hints after each failed attempt!
                </p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic', color: '#7A5C7A', textAlign: 'center' }}>Join this word puzzle?</p>
                <button onClick={handleJoin} style={{ padding: '14px 32px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Join Game
                </button>
              </>
            )}
          </div>
        </GameScreen>
      </>
    );
  }

  // Game over
  if (game?.status === 'won' || game?.status === 'lost') {
    const won = game.winner === uid;
    const lost = game.winner && game.winner !== uid;

    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Partner Wordle" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontStyle: 'italic', color: won ? '#5A7A56' : '#B06060', marginBottom: 8 }}>
                {won ? 'You won! 🎉' : lost ? 'Better luck next time!' : 'Game Over'}
              </p>
              {isCreator && (
                <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)' }}>
                  The word was: <span style={{ fontWeight: 600, letterSpacing: '0.1em' }}>{game.word}</span>
                </p>
              )}
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
  const attempts = game?.attempts || [];
  const tileStates = game?.tileStates || [];
  const currentAttemptIndex = attempts.length;

  return (
    <>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      <GameScreen title="Partner Wordle" onExit={() => setShowExit(true)}>
        {/* Category hint */}
        <div style={{ padding: '0 20px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 600, marginBottom: 4 }}>Category</p>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontStyle: 'italic', color: '#3D2B3D' }}>{game?.hints.category}</p>
        </div>

        {/* Hint banner */}
        <HintBanner hintLevel={game?.hintLevel || 0} hints={game?.hints} word={isCreator ? game.word : undefined} />

        {/* Attempts remaining */}
        <div style={{ padding: '0 20px 8px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#7A5C7A' }}>
            {MAX_ATTEMPTS - attempts.length} {attempts.length === 5 ? 'attempt' : 'attempts'} remaining
          </p>
        </div>

        {/* Board */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${WORD_LENGTH}, 1fr)`, gap: 6, width: '100%', maxWidth: 280 }}>
            {Array(MAX_ATTEMPTS).fill(0).map((_, rowIndex) => {
              const attempt = attempts[rowIndex] || '';
              const states = tileStates[rowIndex];
              const isCurrentRow = rowIndex === currentAttemptIndex;

              return (
                <React.Fragment key={rowIndex}>
                  {Array(WORD_LENGTH).fill(0).map((_, colIndex) => {
                    const letter = isCurrentRow
                      ? (currentGuess[colIndex] || '')
                      : (attempt[colIndex] || '');
                    const state = states?.[colIndex];
                    const isRevealing = isCurrentRow && letter && !attempt[colIndex];

                    return (
                      <Tile
                        key={colIndex}
                        letter={letter}
                        state={state}
                        isRevealing={isRevealing}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Status message */}
        <div style={{ padding: '0 20px 8px', textAlign: 'center', minHeight: 36 }}>
          {isSubmitting && (
            <p style={{ fontSize: 13, color: '#7A5C7A' }}>Checking...</p>
          )}
          {!canPlay && !isSubmitting && game?.status === 'playing' && (
            <p style={{ fontSize: 13, color: '#7A5C7A' }}>Waiting for creator to join...</p>
          )}
        </div>

        {/* Keyboard */}
        <Keyboard
          onKeyPress={handleKeyPress}
          disabled={!canPlay || isSubmitting}
          keyStates={keyStates}
        />

        {/* Code row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px 12px' }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, letterSpacing: '0.12em', color: 'rgba(61,43,61,0.5)' }}>{gameId}</span>
          <button onClick={copyCode} style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </GameScreen>
    </>
  );
}

export default function WordlePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <WordleInner />
    </Suspense>
  );
}
