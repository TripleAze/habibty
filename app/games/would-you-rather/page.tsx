'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, increment, serverTimestamp, collection, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
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
// CUSTOM QUESTION MODAL
// ────────────────────────────────────────────────────────────
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
            <button 
              disabled={!optA || !optB}
              onClick={() => onSubmit({ optionA: optA, optionB: optB })} 
              style={{ flex: 2, padding: '14px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', color: 'white', fontWeight: 600, cursor: optA && optB ? 'pointer' : 'default', opacity: optA && optB ? 1 : 0.5 }}
            >
              Add to Game
            </button>
          </div>
        </div>
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
  const [showCreateQ, setShowCreateQ] = useState(false);
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

  // SELECTION LOGIC
  const selectNextQuestion = async (usedIds: string[], lastCat: string | null): Promise<WouldYouRatherQuestion> => {
    const questionsCol = collection(db, 'would_you_rather_questions');
    
    // Priority 1: Custom questions not yet used
    const customQ = await getDocs(query(questionsCol, where('isCustom', '==', true), where('isActive', '==', true), limit(30)));
    const customPool = customQ.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreQuestion)).filter(q => !usedIds.includes(q.id));
    
    if (customPool.length > 0) {
      return customPool[Math.floor(Math.random() * customPool.length)];
    }

    // Priority 2: Standard questions from Firestore
    const standardQ = await getDocs(query(questionsCol, where('isCustom', '==', false), where('isActive', '==', true), limit(100)));
    let standardPool = standardQ.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreQuestion)).filter(q => !usedIds.includes(q.id));

    // Reset if exhausted
    if (standardPool.length === 0) {
      console.log("Resetting question pool!");
      const fallback = WOULD_YOU_RATHER_QUESTIONS[Math.floor(Math.random() * WOULD_YOU_RATHER_QUESTIONS.length)];
      return { ...fallback, id: fallback.id };
    }

    // Try to avoid repeating category
    const filteredByCat = standardPool.filter(q => q.category !== lastCat);
    const finalPool = filteredByCat.length > 0 ? filteredByCat : standardPool;
    
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  };

  const handleCreate = async () => {
    const newId = await generateGameId();
    const user = auth?.currentUser;
    const initialQ = await selectNextQuestion([], null);

    await setDoc(doc(db, 'games', newId), {
      type: 'wouldyourather',
      creatorUid: uid,
      players: [uid],
      playerNames: { [uid]: user?.displayName || 'You' },
      playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
      currentQuestion: initialQ,
      usedQuestionIds: [initialQ.id],
      lastCategory: initialQ.category,
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
    if (!!game?.responses[uid] || !game) return;
    setSelected(choice);
    const gameRef = doc(db, 'games', gameId);
    const updatedResponses = { ...game.responses, [uid]: choice };
    const bothAnsweredNow = Object.keys(updatedResponses).length === 2;
    
    await updateDoc(gameRef, {
      responses: updatedResponses,
      revealed: bothAnsweredNow,
    });
  };

  const handleReadyForNext = async () => {
    if (!game || game.readyForNext?.includes(uid)) return;
    const gameRef = doc(db, 'games', gameId);
    const newReady = [...(game.readyForNext || []), uid];

    if (newReady.length === 2) {
      const isMatch = game.responses[game.players[0]] === game.responses[game.players[1]];
      const totalPlayed = game.score.total + 1;

      if (totalPlayed >= QUESTIONS_PER_GAME) {
        await updateDoc(gameRef, {
          readyForNext: [],
          status: 'finished',
          [`score.matches`]: game.score.matches + (isMatch ? 1 : 0),
          [`score.total`]: totalPlayed,
        });
      } else {
        const nextQ = await selectNextQuestion(game.usedQuestionIds, game.lastCategory);
        await updateDoc(gameRef, {
          currentQuestion: nextQ,
          usedQuestionIds: [...game.usedQuestionIds, nextQ.id],
          lastCategory: nextQ.category,
          responses: {},
          revealed: false,
          readyForNext: [],
          [`score.matches`]: game.score.matches + (isMatch ? 1 : 0),
          [`score.total`]: totalPlayed,
        });
      }
    } else {
      await updateDoc(gameRef, { readyForNext: newReady });
    }
  };

  const handleAddCustomQuestion = async (q: Partial<WouldYouRatherQuestion>) => {
    const questionsCol = collection(db, 'would_you_rather_questions');
    const newDoc = doc(questionsCol);
    await setDoc(newDoc, {
      ...q,
      id: newDoc.id,
      category: 'random',
      isActive: true,
      isCustom: true,
      createdBy: uid,
      createdAt: serverTimestamp()
    });
    setShowCreateQ(false);
  };

  const handleSeedDB = async () => {
    const batch = writeBatch(db);
    const col = collection(db, 'would_you_rather_questions');
    
    const ROMANTIC = [
      "Relive your first date OR skip to your wedding day", "Get a handwritten letter OR a surprise visit",
      "Talk all night OR cuddle silently", "Watch a movie OR take a late-night walk together",
      "Receive flowers OR a heartfelt message", "Be surprised often OR plan everything together",
      "Long-distance with deep love OR nearby but less connection", "Celebrate anniversaries big OR small but meaningful",
      "Share everything OR keep a little mystery", "Go on adventures OR stay in cozy together",
      "Have matching outfits OR matching playlists", "Spend a day offline together OR texting all day",
      "Get random compliments OR deep emotional talks", "Recreate your first meeting OR create a new memory",
      "Love letters OR voice notes", "Be clingy OR be independent", "Hug for 10 minutes OR kiss for 1 minute",
      "Watch sunrise OR sunset together", "Cook together OR order food and chill", "Travel abroad OR explore your city",
      "Surprise date OR planned date", "Slow dancing OR late-night talking", "Deep conversations OR playful teasing",
      "Text all day OR call at night", "Spend holidays together OR birthdays together", "Get jealous easily OR not at all",
      "Be best friends first OR lovers first", "Share passwords OR keep privacy", "Romantic gestures OR consistent effort",
      "Meet family early OR later", "Take cute pictures OR make memories without phones",
      "Say “I love you” often OR show it through actions", "Be emotional OR logical in love",
      "Stay up late talking OR wake up early together", "Laugh together OR cry together", "Be spontaneous OR structured",
      "Love deeply OR love safely", "Be each other’s first OR last", "Plan future together OR live in the moment",
      "Have similar personalities OR opposite", "Be public OR private about relationship", "Surprise gifts OR meaningful words",
      "Spend money on dates OR save together", "Love intensely OR steadily", "Be dramatic OR calm",
      "Apologize first OR wait it out", "Express feelings immediately OR take time", "Be playful OR serious",
      "Go out often OR stay home", "Be inseparable OR balanced"
    ];
    const FUNNY = [
      "Have no internet OR no music", "Always shout OR always whisper", "Walk everywhere OR crawl everywhere",
      "Have a clown laugh OR a duck voice", "Eat only spicy food OR only bland food",
      "Wear winter clothes in heat OR summer clothes in cold", "Have 1 giant foot OR 1 tiny foot",
      "Always be late OR always too early", "Only eat with hands OR only eat with chopsticks",
      "Sleep standing OR sit while sleeping", "Talk to animals OR speak every language",
      "Be invisible randomly OR glow in the dark", "Only watch cartoons OR only watch documentaries",
      "Dance every time you hear music OR sing", "Laugh at everything OR never laugh", "Have a tail OR horns",
      "Only drink water OR only juice", "Wear one outfit forever OR change every hour",
      "Always trip OR always bump into things", "Have super strength OR super clumsiness",
      "Eat dessert before meals OR never eat dessert", "Be stuck in a meme OR create memes",
      "Only use emojis OR only voice notes", "Always smell good OR always look good", "Have no eyebrows OR no hair",
      "Be famous for something silly OR unknown for something great", "Live in a cartoon OR a game",
      "Always be itchy OR always sweaty", "Speak only in questions OR only in answers", "Lose your phone OR lose your wallet",
      "Be chased by ducks OR bees", "Always sneeze loudly OR hiccup forever", "Be super tall OR super short",
      "Eat cold food OR burnt food", "Be stuck laughing OR crying", "Have no WiFi OR no battery",
      "Be a meme OR go viral accidentally", "Always forget names OR faces", "Be awkward forever OR too confident",
      "Only wear slippers OR boots", "Eat same meal forever OR random meals daily", "Be stuck in traffic OR stuck in elevator",
      "Lose your voice OR lose your hearing temporarily", "Always be sleepy OR never sleep", "Be a villain OR sidekick",
      "Be dramatic OR emotionless", "Always overdress OR underdress", "Live without mirrors OR cameras",
      "Have slow internet OR no internet", "Always laugh at wrong time OR cry"
    ];
    const DEEP = [
      "Know your future OR change your past", "Be loved OR understood", "Live long OR live fully",
      "Always tell truth OR protect feelings", "Lose memories OR never make new ones", "Be alone OR surrounded but lonely",
      "Be respected OR loved", "Forgive everything OR forget everything", "Follow heart OR logic",
      "Be rich and empty OR poor and fulfilled", "Have purpose OR happiness", "Be remembered OR be happy now",
      "Change yourself OR change the world", "Trust easily OR never trust", "Live without fear OR without regret",
      "Be vulnerable OR guarded", "Know everything OR feel everything", "Be honest always OR kind always",
      "Have control OR freedom", "Live in past OR future", "Be powerful OR peaceful", "Be needed OR wanted",
      "Feel deeply OR not at all", "Be perfect OR real", "Love once deeply OR many times lightly",
      "Be understood late OR misunderstood forever", "Give everything OR protect yourself", "Be right OR be happy",
      "Experience pain OR numbness", "Be remembered for good OR great", "Be a leader OR follower",
      "Be admired OR trusted", "Lose love OR never find it", "Be strong OR soft", "Choose fate OR choice",
      "Be hopeful OR realistic", "Have answers OR questions", "Change one moment OR accept all",
      "Be forgiven OR forgive", "Be seen OR heard", "Have certainty OR possibilities", "Be independent OR dependent",
      "Love yourself OR be loved by others", "Be bold OR safe", "Be patient OR persistent",
      "Feel everything OR control emotions", "Be logical OR emotional", "Be content OR ambitious",
      "Have clarity OR mystery", "Be honest OR peaceful"
    ];
    const SPICY = [
      "Kiss in public OR private", "Flirty texts OR voice notes", "Be teased OR tease",
      "Late-night calls OR late-night visits", "Be dominant OR submissive", "Slow romance OR intense passion",
      "Eye contact OR touch", "Surprise kiss OR planned", "Be chased OR do the chasing", "Be mysterious OR expressive",
      "Physical touch OR words", "Whisper OR bold talk", "Be playful OR serious", "Be romantic OR seductive",
      "Deep talk OR tension", "First move OR wait", "Be unpredictable OR consistent", "Bold flirting OR subtle hints",
      "Slow burn OR instant spark", "Be admired OR desired", "Be shy OR confident", "Intense eye contact OR silence",
      "Emotional connection OR physical chemistry", "Be secretive OR open", "Stay up together OR sneak out",
      "Be surprised OR in control", "Tease all day OR ignore then surprise", "Hold hands OR pull closer",
      "Be soft OR intense", "Text first OR wait", "Compliments OR actions", "Close distance OR keep tension",
      "Be bold OR subtle", "Make first move OR respond", "Flirt in public OR private", "Be playful jealous OR calm",
      "Be affectionate OR reserved", "Take risks OR play safe", "Be expressive OR mysterious", "Quick moments OR long tension",
      "Be spontaneous OR planned", "Make them laugh OR blush", "Be sweet OR daring", "Stay calm OR react",
      "Be confident OR shy", "Hold gaze OR look away", "Whisper secrets OR say aloud", "Be unpredictable OR reliable",
      "Lead or follow", "Be unforgettable OR irresistible"
    ];

    let total = 0;
    const processList = (list: string[], cat: string) => {
      list.forEach((line, i) => {
        const [a, b] = line.split(' OR ');
        if (a && b) {
          const id = `${cat}_${i}`;
          batch.set(doc(col, id), { 
            optionA: a.trim(), 
            optionB: b.trim(), 
            category: cat, 
            isActive: true, 
            isCustom: false,
            createdAt: Date.now() 
          });
          total++;
        }
      });
    };

    processList(ROMANTIC, 'romantic');
    processList(FUNNY, 'funny');
    processList(DEEP, 'deep');
    processList(SPICY, 'spicy');

    try {
      await batch.commit();
      alert(`Success! Seeded ${total} questions.`);
    } catch (err) {
      console.error(err);
      alert('Failed to seed. Check console.');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (game?.status === 'waiting') {
    return (
      <GameScreen title="Would You Rather" onExit={() => setShowExit(true)}>
        {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 20px' }}>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic', color: '#7A5C7A', textAlign: 'center' }}>Invite your partner</p>
          <div onClick={copyCode} style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 36, letterSpacing: '0.2em', color: '#3D2B3D', cursor: 'pointer', padding: '16px 32px', background: 'rgba(255,255,255,0.5)', borderRadius: 16 }}>{gameId}</div>
          <p style={{ fontSize: 12, color: '#B06060' }}>{copied ? 'Copied!' : 'Tap to copy code'}</p>
          <button onClick={handleJoin} style={{ marginTop: 24, padding: '14px 32px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Join Game</button>
          
          {uid === game.creatorUid && (
            <button onClick={handleSeedDB} style={{ marginTop: 40, background: 'none', border: '1px dashed #ccc', color: '#ccc', padding: '8px 16px', borderRadius: 8, fontSize: 10 }}>[ADMIN] Seed 200 Questions</button>
          )}
        </div>
      </GameScreen>
    );
  }

  if (game?.status === 'finished') {
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

  if (!game || !game.currentQuestion) return <Skeleton />;

  const opponentUid = game.players.find(p => p !== uid) || '';
  const opponentName = game.playerNames[opponentUid] || 'Partner';
  const myPhoto = game.playerPhotos[uid];
  const oppPhoto = game.playerPhotos[opponentUid];
  const hasAnswered = !!game.responses[uid];
  const bothAnswered = Object.keys(game.responses).length === 2;
  const currentQuestion = game.currentQuestion;

  return (
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
        <button
          onClick={() => handleSelect('A')}
          disabled={hasAnswered}
          style={{ flex: 1, background: game.revealed && game.responses[uid] === 'A' ? 'rgba(232,160,160,0.15)' : 'white', border: selected === 'A' ? '2px solid #E8A0A0' : '1.5px solid #eee', borderRadius: 24, padding: 32, cursor: hasAnswered ? 'default' : 'pointer' }}
        >
          <p style={{ fontSize: 12, color: '#E8A0A0', fontWeight: 800, marginBottom: 8 }}>OPTION A</p>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic' }}>{currentQuestion.optionA}</p>
        </button>

        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#7A5C7A', fontWeight: 700, padding: '4px 12px', background: 'white', borderRadius: 100, border: '1px solid #eee' }}>OR</span>
        </div>

        <button
          onClick={() => handleSelect('B')}
          disabled={hasAnswered}
          style={{ flex: 1, background: game.revealed && game.responses[uid] === 'B' ? 'rgba(201,184,216,0.15)' : 'white', border: selected === 'B' ? '2px solid #C9B8D8' : '1.5px solid #eee', borderRadius: 24, padding: 32, cursor: hasAnswered ? 'default' : 'pointer' }}
        >
          <p style={{ fontSize: 12, color: '#C9B8D8', fontWeight: 800, marginBottom: 8 }}>OPTION B</p>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 20, fontStyle: 'italic' }}>{currentQuestion.optionB}</p>
        </button>
      </div>

      {bothAnswered && (
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          {!game.readyForNext?.includes(uid) ? (
            <button
              onClick={handleReadyForNext}
              style={{ width: '100%', padding: '16px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
            >
              {game.responses[uid] === game.responses[opponentUid] ? "A Great Match! 🎉" : "Interesting... 🤔"} Next Question
            </button>
          ) : (
            <p style={{ color: '#7A5C7A', fontSize: 13, fontStyle: 'italic' }}>Waiting for {opponentName}...</p>
          )}
        </div>
      )}

      <div style={{ padding: '0 20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setShowCreateQ(true)} style={{ fontSize: 12, color: '#7A5C7A', background: 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', borderRadius: 100, cursor: 'pointer' }}>+ Suggest dilemma</button>
        <span style={{ fontSize: 12, color: 'rgba(122,92,122,0.4)' }}>Game ID: {gameId}</span>
      </div>
    </GameScreen>
  );
}

export default function WouldYouRatherPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <WouldYouRatherInner />
    </Suspense>
  );
}
