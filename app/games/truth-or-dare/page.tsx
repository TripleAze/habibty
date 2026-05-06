'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import { useHeader } from '@/lib/HeaderContext';
import { Prompt, TRUTHS, DARES, getRandomTruth, getRandomDare } from '@/lib/prompts';

interface GameState {
  type: 'truthordare';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  currentTurn: string; // The Inquisitor (who picks)
  currentPrompt: Prompt | null;
  promptType: 'truth' | 'dare' | null;
  status: 'waiting' | 'selecting' | 'awaiting_response' | 'awaiting_approval' | 'active';
  response: {
    text?: string;
    submittedBy: string;
    approved: boolean | null;
  } | null;
  skipsLeft: Record<string, number>;
  history: HistoryEntry[];
  createdAt: number;
}

interface HistoryEntry {
  playerId: string;
  type: 'truth' | 'dare';
  prompt: string;
  completedAt: number;
  skipped: boolean;
}

const MAX_SKIPS = 2;

// ────────────────────────────────────────────────────────────
// SKELETON
// ────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ width: 200, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ width: '80%', height: 120, borderRadius: 16, background: 'rgba(255,255,255,0.4)' }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 120, height: 50, borderRadius: 25, background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ width: 120, height: 50, borderRadius: 25, background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// HISTORY PANEL
// ────────────────────────────────────────────────────────────
function HistoryPanel({ history, playerNames, onClose }: { history: HistoryEntry[]; playerNames: Record<string, string>; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(61,43,61,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 40px', animation: 'slideUp 0.3s ease', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,184,216,0.4)', margin: '0 auto 24px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3D2B3D' }}>Round History</p>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,184,216,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A5C7A', fontSize: 16 }}>×</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {history.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(122,92,122,0.5)', fontSize: 14, padding: '20px 0' }}>No rounds yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((entry, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 12, background: entry.type === 'truth' ? 'rgba(232,160,160,0.08)' : 'rgba(201,184,216,0.08)', border: `1px solid ${entry.type === 'truth' ? 'rgba(232,160,160,0.2)' : 'rgba(201,184,216,0.2)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 100, background: entry.type === 'truth' ? 'rgba(232,160,160,0.2)' : 'rgba(201,184,216,0.2)', color: entry.type === 'truth' ? '#B06060' : '#7A6A8A' }}>
                      {entry.type}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)' }}>{playerNames[entry.playerId] || 'Player'}</span>
                    {entry.skipped && <span style={{ fontSize: 10, color: '#B06060', marginLeft: 'auto' }}>Skipped</span>}
                  </div>
                  <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 14, fontStyle: 'italic', color: '#3D2B3D' }}>{entry.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// PROMPT CARD
// ────────────────────────────────────────────────────────────
function PromptCard({ prompt, type, subtitle }: { prompt: Prompt; type: 'truth' | 'dare'; subtitle?: string }) {
  return (
    <div style={{
      background: type === 'truth' ? 'linear-gradient(135deg, rgba(232,160,160,0.15), rgba(201,184,216,0.1))' : 'linear-gradient(135deg, rgba(201,184,216,0.15), rgba(232,160,160,0.1))',
      borderRadius: 24,
      padding: '28px 24px',
      border: type === 'truth' ? '2px solid rgba(232,160,160,0.3)' : '2px solid rgba(201,184,216,0.3)',
      textAlign: 'center',
      width: '100%',
      maxWidth: 400,
    }}>
      <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: type === 'truth' ? '#C9829A' : '#8B7A9E', fontWeight: 600, marginBottom: 16 }}>
        {type === 'truth' ? 'Truth' : 'Dare'}
      </p>
      <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic', color: '#3D2B3D', lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
        {prompt.text}
      </p>
      {subtitle && <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 8 }}>{subtitle}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
function TruthOrDareInner() {
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id') ?? '';
  const router = useRouter();

  const [uid, setUid] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [choosingType, setChoosingType] = useState(false);

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

  const handleCreate = async () => {
    const newId = await generateGameId();
    const user = auth?.currentUser;
    const startPlayer = uid;
    await setDoc(doc(db, 'games', newId), {
      type: 'truthordare',
      creatorUid: uid,
      players: [uid],
      playerNames: { [uid]: user?.displayName || 'You' },
      playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
      currentTurn: startPlayer,
      currentPrompt: null,
      promptType: null,
      status: 'waiting',
      skipsLeft: { [uid]: MAX_SKIPS },
      history: [],
      createdAt: serverTimestamp(),
      response: null,
    });
    router.replace(`/games/truth-or-dare?id=${newId}`);
  };

  // No game ID in URL - show landing/create screen
  if (!gameId && !game) {
    return (
      <>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <GameScreen title="Truth or Dare" onExit={() => setShowExit(true)}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(212,169,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid rgba(212,169,74,0.3)' }}>
              🔥
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 28, color: '#3D2B3D', marginBottom: 8 }}>Truth or Dare</h2>
              <p style={{ fontSize: 14, color: 'rgba(122,92,122,0.6)', maxWidth: 260 }}>Ready for some fun? Take turns choosing between deep truths and spicy dares!</p>
            </div>
            <button onClick={handleCreate} style={{ width: '100%', maxWidth: 240, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#D4A94A,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(212,169,74,0.2)' }}>
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
  
  // Inquisitor is the person whose Turn it is
  const isMyTurn = game.currentTurn === uid;
  const inquisitor = game.currentTurn;
  const performer = game.players.find(p => p !== inquisitor) || '';
  
  const iAmInquisitor = uid === inquisitor;
  const iAmPerformer = uid === performer;

  const mySkipsLeft = game.skipsLeft[uid] || MAX_SKIPS;
  const oppSkipsLeft = game.skipsLeft[opponentUid] || MAX_SKIPS;

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
      [`skipsLeft.${uid}`]: MAX_SKIPS,
      status: 'selecting',
    });
  };

  const handleChooseType = (type: 'truth' | 'dare') => {
    setChoosingType(false);
    const prompt = type === 'truth' ? getRandomTruth() : getRandomDare();
    const gameRef = doc(db, 'games', gameId);
    updateDoc(gameRef, {
      currentPrompt: prompt,
      promptType: type,
      status: 'awaiting_response',
      response: null,
    });
  };

  const handleSubmitResponse = async () => {
    if (!game || !iAmPerformer) return;
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      status: 'awaiting_approval',
      response: {
        submittedBy: uid,
        approved: null,
      }
    });
  };

  const handleApprove = async () => {
    if (!game || !iAmInquisitor) return;
    const gameRef = doc(db, 'games', gameId);
    const historyEntry: HistoryEntry = {
      playerId: performer,
      type: game.promptType!,
      prompt: game.currentPrompt!.text,
      completedAt: Date.now(),
      skipped: false,
    };
    await updateDoc(gameRef, {
      history: arrayUnion(historyEntry),
      currentPrompt: null,
      promptType: null,
      status: 'selecting',
      currentTurn: performer, // Switch roles
      response: null,
    });
  };

  const handleReject = async () => {
    if (!game || !iAmInquisitor) return;
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
      status: 'awaiting_response',
      response: null,
    });
  };

  const handleSkip = async () => {
    if (!game || mySkipsLeft <= 0 || !iAmPerformer) return;
    const gameRef = doc(db, 'games', gameId);
    const historyEntry: HistoryEntry = {
      playerId: uid,
      type: game.promptType || 'truth',
      prompt: game.currentPrompt?.text || 'Skipped challenge',
      completedAt: Date.now(),
      skipped: true,
    };
    await updateDoc(gameRef, {
      history: arrayUnion(historyEntry),
      [`skipsLeft.${uid}`]: mySkipsLeft - 1,
      currentPrompt: null,
      promptType: null,
      status: 'selecting',
      currentTurn: uid, // Actually stays their turn to be inquisitor? Usually in T&D person who skips still switches? Let's switch.
      response: null,
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── RENDERING ───

  // Waiting for partner
  if (game.status === 'waiting') {
    return (
      <GameScreen title="Truth or Dare" onExit={() => setShowExit(true)}>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic', color: '#7A5C7A', textAlign: 'center' }}>Share this code with your partner</p>
          <div onClick={copyCode} style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 36, letterSpacing: '0.2em', color: '#3D2B3D', cursor: 'pointer', padding: '16px 32px', background: 'rgba(255,255,255,0.5)', borderRadius: 16 }}>
            {gameId}
          </div>
          <p style={{ fontSize: 12, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy code'}</p>
          <button onClick={handleJoin} style={{ marginTop: 24, padding: '14px 32px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>
            Join Game
          </button>
        </div>
      </GameScreen>
    );
  }

  return (
    <>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      {showHistory && <HistoryPanel history={game.history} playerNames={game.playerNames} onClose={() => setShowHistory(false)} />}
      
      {choosingType && iAmInquisitor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(61,43,61,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 24, padding: '28px 20px', width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 4 }}>Challenge {opponentName}</p>
            <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.55)', marginBottom: 20 }}>What will it be?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => handleChooseType('truth')} style={{ flex: 1, padding: '16px 24px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>
                Truth
              </button>
              <button onClick={() => handleChooseType('dare')} style={{ flex: 1, padding: '16px 24px', borderRadius: 100, background: 'linear-gradient(135deg,#C9B8D8,#E8A0A0)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>
                Dare
              </button>
            </div>
          </div>
        </div>
      )}

      <GameScreen title="Truth or Dare" onExit={() => setShowExit(true)}>
        {/* Top Players Bar */}
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {[
            { id: uid, photo: myPhoto, name: myName, skips: mySkipsLeft, turn: isMyTurn },
            { id: opponentUid, photo: oppPhoto, name: opponentName, skips: oppSkipsLeft, turn: !isMyTurn }
          ].map(p => (
            <div key={p.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.55)', borderRadius: 14, padding: '10px 12px', border: p.turn ? '2px solid rgba(232,160,160,0.5)' : '1.5px solid rgba(255,255,255,0.7)' }}>
              {p.photo ? (
                <img src={p.photo} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt={p.name} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#F2C4CE,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-cormorant),serif", fontSize: 12, color: '#3D2B3D' }}>
                  {p.name[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 12, color: '#3D2B3D', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              {p.id === performer && (
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: 'rgba(232,160,160,0.2)', color: '#B06060' }}>ACTOR</span>
              )}
            </div>
          ))}
        </div>

        {/* Turn Status Indicator */}
        <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
          {isMyTurn ? (
            <p style={{ fontSize: 13, color: '#7A5C7A', fontWeight: 500 }}>
              {game.status === 'selecting' && "Your turn to challenge!"}
              {game.status === 'awaiting_response' && `Waiting for ${opponentName} to perform...`}
              {game.status === 'awaiting_approval' && `Review ${opponentName}'s response!`}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#7A5C7A', fontWeight: 500 }}>
              {game.status === 'selecting' && `${opponentName} is choosing your challenge...`}
              {game.status === 'awaiting_response' && "It's your time to shine!"}
              {game.status === 'awaiting_approval' && `Waiting for ${opponentName}'s approval...`}
            </p>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px 24px', gap: 24 }}>
          
          {/* STATE: SELECTING */}
          {game.status === 'selecting' && (
            iAmInquisitor ? (
              <>
                <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 24, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center' }}>What should {opponentName} do?</p>
                <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
                  <button onClick={() => setChoosingType(true)} style={{ flex: 1, padding: '18px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>Truth</button>
                  <button onClick={() => setChoosingType(true)} style={{ flex: 1, padding: '18px', borderRadius: 100, background: 'linear-gradient(135deg,#C9B8D8,#E8A0A0)', border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}>Dare</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {oppPhoto ? <img src={oppPhoto} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} alt={opponentName} /> : <span style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 32, color: '#7A5C7A' }}>{opponentName[0]?.toUpperCase()}</span>}
                </div>
                <p style={{ fontSize: 15, color: '#7A5C7A' }}>{opponentName} is choosing your fate...</p>
              </div>
            )
          )}

          {/* STATE: AWAITING RESPONSE */}
          {game.status === 'awaiting_response' && game.currentPrompt && (
            <>
              <PromptCard 
                prompt={game.currentPrompt} 
                type={game.promptType!} 
                subtitle={iAmPerformer ? "Perform this challenge now!" : `Waiting for ${opponentName}...`} 
              />
              {iAmPerformer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
                  <button
                    onClick={handleSubmitResponse}
                    style={{ padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#68B88B,#5A9A7A)', border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "var(--font-dm-sans),sans-serif" }}
                  >
                    Submit Response
                  </button>
                  {mySkipsLeft > 0 && (
                    <button onClick={handleSkip} style={{ background: 'none', border: 'none', color: '#B06060', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                      Skip ({mySkipsLeft} left)
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* STATE: AWAITING APPROVAL */}
          {game.status === 'awaiting_approval' && game.currentPrompt && (
            <>
              <PromptCard 
                prompt={game.currentPrompt} 
                type={game.promptType!} 
                subtitle={iAmInquisitor ? "Did they do it?" : "Awaiting approval..."} 
              />
              {iAmInquisitor && (
                <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
                  <button
                    onClick={handleApprove}
                    style={{ flex: 1.5, padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#68B88B,#5A9A7A)', border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Accept ✅
                  </button>
                  <button
                    onClick={handleReject}
                    style={{ flex: 1, padding: '16px', borderRadius: 100, background: 'rgba(176,96,96,0.1)', border: '1.5px solid rgba(176,96,96,0.3)', color: '#B06060', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Reject ❌
                  </button>
                </div>
              )}
              {iAmPerformer && (
                <p style={{ fontSize: 14, color: '#7A5C7A', fontStyle: 'italic', animation: 'pulse 2s infinite' }}>Waiting for {opponentName}'s verdict...</p>
              )}
            </>
          )}

        </div>

        {/* Bottom History Link */}
        <div style={{ padding: '0 20px 16px', textAlign: 'center' }}>
          <button onClick={() => setShowHistory(true)} style={{ fontSize: 12, color: '#7A5C7A', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            History ({game.history.length})
          </button>
        </div>

        {/* Game Code Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px 24px' }}>
          <span style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 13, letterSpacing: '0.12em', color: 'rgba(61,43,61,0.4)' }}>{gameId}</span>
          <button onClick={copyCode} style={{ fontSize: 11, color: 'rgba(122,92,122,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

      </GameScreen>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </>
  );
}

export default function TruthOrDarePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <TruthOrDareInner />
    </Suspense>
  );
}
