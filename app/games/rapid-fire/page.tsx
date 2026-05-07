'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, writeBatch, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';
import WaitingLobby from '@/components/games/WaitingLobby';
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
  type: 'rapid-fire';
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
  rematchId?: string;
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
function ResultsScreen({ game, uid, router, onRematch, rematching }: { game: GameState; uid: string; router: any; onRematch: () => void; rematching: boolean }) {
  const opponentUid = game.players.find(p => p !== uid) || '';
  const myAnswers = game.answers[uid] || {};
  const opponentAnswers = game.answers[opponentUid] || {};

  const allQuestions = game.questions;
  const matches = allQuestions.filter((q) => {
    const myA = myAnswers[q.id]?.toLowerCase().trim();
    const oppA = opponentAnswers[q.id]?.toLowerCase().trim();
    return myA && oppA && myA === oppA;
  }).length;

  const matchPercent = allQuestions.length > 0 ? Math.round((matches / allQuestions.length) * 100) : 0;
  
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

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button onClick={() => router.push('/games')} style={{ flex: 1, padding: '18px', borderRadius: 100, background: 'none', border: '1.5px solid #eee', color: '#7A5C7A', fontWeight: 600, cursor: 'pointer' }}>Lobby</button>
        <button onClick={onRematch} disabled={rematching} style={{ flex: 1.5, padding: '18px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontWeight: 600, boxShadow: '0 4px 15px rgba(232,160,160,0.3)', cursor: 'pointer' }}>
          {rematching ? 'Starting…' : 'Rematch'}
        </button>
      </div>
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
  const [rematching, setRematching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

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

  // Rematch follow
  useEffect(() => {
    if (game?.rematchId) {
      router.replace(`/games/rapid-fire?id=${game.rematchId}`);
    }
  }, [game?.rematchId, router]);

  // Auto-join: if we have a gameId, the game is waiting, and we're not yet a player → join
  useEffect(() => {
    if (!uid || !game || !gameId) return;
    if (game.status === 'waiting' && !game.players.includes(uid)) {
      handleJoin();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, game?.status, game?.players, gameId]);

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

  // SELECTION LOGIC — Firebase-first strategy (similar to Would You Rather)
  const selectQuestions = async (count: number, usedIds: string[]): Promise<RapidFireQuestion[]> => {
    try {
      const questionsCol = collection(db, 'rapid_fire_questions');
      const snap = await getDocs(query(questionsCol, where('isActive', '==', true), limit(100)));
      
      let pool: RapidFireQuestion[] = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as any)).filter(q => !usedIds.includes(q.id));

      if (pool.length >= count) {
        return pool.sort(() => Math.random() - 0.5).slice(0, count);
      }
    } catch (err) {
      console.error("Failed to fetch Rapid Fire questions from Firebase:", err);
    }

    // Fallback to local pool
    const localPool: RapidFireQuestion[] = RAPID_FIRE_QUESTIONS.map(q => ({
      id: q.id,
      text: q.text,
      type: 'binary' as const,
      category: q.category,
    })).filter(q => !usedIds.includes(q.id));

    let finalPool = localPool;
    if (finalPool.length < count) {
      finalPool = RAPID_FIRE_QUESTIONS.map(q => ({
        id: q.id,
        text: q.text,
        type: 'binary' as const,
        category: q.category,
      }));
    }
    return finalPool.sort(() => Math.random() - 0.5).slice(0, count);
  };

  const handleCreate = async () => {
    const config = DIFFICULTY_CONFIG[selectedDifficulty];
    const initialQSet = await selectQuestions(config.preload, []);
    const newId = await generateGameId();
    const user = auth?.currentUser;

    await setDoc(doc(db, 'games', newId), {
      type: 'rapid-fire',
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

  const handleRematch = async () => {
    if (!game) return;
    setRematching(true);
    const config = DIFFICULTY_CONFIG[game.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.standard;
    const initialQSet = await selectQuestions(config.preload, game.usedQuestionIds || []);
    const newId = await generateGameId();
    
    const opponentUid = game.players.find(p => p !== uid);
    const players = [uid, opponentUid].filter(Boolean);

    await setDoc(doc(db, 'games', newId), {
      type: 'rapid-fire',
      creatorUid: uid,
      players,
      playerNames: game.playerNames,
      playerPhotos: game.playerPhotos,
      currentPlayer: uid,
      difficulty: game.difficulty,
      timerStartedAt: Date.now(), // Start immediately since they are both already here
      timerDuration: config.duration,
      currentQuestionIndex: 0,
      answers: {},
      roundsCompleted: 0,
      status: 'playing',
      questions: initialQSet,
      usedQuestionIds: [...(game.usedQuestionIds || []), ...initialQSet.map(q => q.id)],
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'games', gameId), { rematchId: newId });
    router.replace(`/games/rapid-fire?id=${newId}`);
  };

  const handleJoin = async () => {
    if (!gameId || !uid || joining) return;
    setJoining(true);
    try {
      const gameRef = doc(db, 'games', gameId);
      const snap = await getDoc(gameRef);
      if (!snap.exists()) { setJoining(false); return; }

      const data = snap.data();
      // Guard: don't join if game is full (already 2 players) or already started
      if (data.players?.length >= 2 && !data.players.includes(uid)) {
        setJoining(false);
        return;
      }
      // Guard: don't join if already a player
      if (data.players?.includes(uid)) {
        setJoining(false);
        return;
      }

      const user = auth?.currentUser;
      // Use arrayUnion for atomic player list update (safe against race conditions)
      await updateDoc(gameRef, {
        players: arrayUnion(uid),
        [`playerNames.${uid}`]: user?.displayName || 'You',
        ...(user?.photoURL ? { [`playerPhotos.${uid}`]: user.photoURL } : {}),
        status: 'playing',
        timerStartedAt: Date.now(),
      });
    } finally {
      setJoining(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!game || !isMyTurn || isAnswering) return;
    setIsAnswering(true);
    try {
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
    } finally {
      setIsAnswering(false);
    }
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
    try {
      const batch = writeBatch(db);
      const rfCol = collection(db, 'rapid_fire_questions');
      const wyrCol = collection(db, 'would_you_rather_questions');
      const todCol = collection(db, 'truth_or_dare_questions');
      
      // Get existing to prevent duplicates
      const existingRF = await getDocs(rfCol);
      const rfTexts = new Set(existingRF.docs.map(d => d.data().text?.toLowerCase().trim()));
      
      const existingWYR = await getDocs(wyrCol);
      const wyrTexts = new Set(existingWYR.docs.map(d => {
        const data = d.data();
        return `${data.optionA}|${data.optionB}`.toLowerCase().trim();
      }));

      const existingTOD = await getDocs(todCol);
      const todTexts = new Set(existingTOD.docs.map(d => d.data().text?.toLowerCase().trim()));

      const newRF = [
        // User provided JSON examples
        { text: "What’s your most used emoji?", category: "fun", options: ["😂", "❤️", "😭", "😒"] },
        { text: "What food could you eat forever?", category: "fun", options: ["Pizza 🍕", "Rice 🍚", "Fries 🍟", "Noodles 🍜"] },
        { text: "What’s your comfort movie genre?", category: "movies", options: ["Romance", "Comedy", "Action", "Anime"] },
        { text: "What instantly reminds you of me?", category: "relationship", options: ["Music 🎵", "Food 🍔", "Late nights 🌙", "Memes 😂"] },
        { text: "What’s your ideal date?", category: "relationship", options: ["Movie night 🎬", "Beach date 🌊", "Gaming together 🎮", "Road trip 🚗"] },
        { text: "What’s your biggest toxic trait?", category: "chaotic", options: ["Overthinking 😭", "Ignoring texts 😒", "Being stubborn 😤", "Sleeping too much 🛌"] },
        { text: "What type of weather matches your mood?", category: "personality", options: ["Rain 🌧️", "Sunny ☀️", "Cold ❄️", "Cloudy ☁️"] },
        { text: "What’s your gaming personality?", category: "gaming", options: ["Competitive 😤", "Casual 😌", "Chaotic 😂", "Supportive ❤️"] },
        { text: "What’s your favorite type of affection?", category: "flirty", options: ["Hugs 🤗", "Forehead kisses 😚", "Hand holding 🤝", "Cuddles 🥺"] },
        { text: "What keeps you going on hard days?", category: "deep", options: ["Loved ones ❤️", "Goals 🚀", "Faith 🙏", "Music 🎵"] },
        // More from the list
        { text: "Coffee or tea?", category: "fun" },
        { text: "Morning or night person?", category: "personality" },
        { text: "PC or console?", category: "gaming" },
        { text: "If animals could talk, which would be the rudest?", category: "chaotic" },
        { text: "What’s the dumbest thing you’ve cried over?", category: "emotional" },
        { text: "If you became famous, what would it be for?", category: "fun" },
        { text: "What’s your most embarrassing moment?", category: "fun" },
        { text: "What’s your love language?", category: "relationship" },
        { text: "What color reminds you of me?", category: "relationship" },
        { text: "What makes you feel safe?", category: "deep" },
      ];

      newRF.forEach(q => {
        if (!rfTexts.has(q.text.toLowerCase().trim())) {
          const d = doc(rfCol);
          batch.set(d, { 
            text: q.text, 
            type: q.options ? 'binary' : 'binary', 
            options: q.options || null,
            category: q.category || 'general', 
            isActive: true 
          });
          rfTexts.add(q.text.toLowerCase().trim());
        }
      });

      const newWYR = [
        { optionA: "Cuddle every night 🤗", optionB: "Go on dates every weekend 🌃", category: "relationship" },
        { optionA: "Long texts 💌", optionB: "Surprise calls 📞", category: "cute" },
        { optionA: "10 duck-sized horses 🐴", optionB: "1 horse-sized duck 🦆", category: "chaotic" },
        { optionA: "Unlimited money 💰", optionB: "Unlimited free time ⏳", category: "deep" },
        { optionA: "Win arguments 😤", optionB: "Keep peace ☮️", category: "deep" },
        { optionA: "Co-op 🎮", optionB: "Competitive ⚔️", category: "gaming" },
        { optionA: "Teleport ✨", optionB: "Time travel ⏰", category: "wildcard" },
        { optionA: "Publicly 😏", optionB: "Privately ❤️", category: "flirty" },
        { optionA: "Lose charger 🔋", optionB: "Lose headphones 🎧", category: "fun" },
        { optionA: "Relive favorite memory 🥺", optionB: "Create a new one ✨", category: "emotional" },
        { optionA: "Sneeze glitter ✨", optionB: "Cry confetti 🎉", category: "chaotic" },
        { optionA: "Always be 10 minutes late ⏰", optionB: "Always be 20 minutes early ⏳", category: "funny" },
        // Batch 2
        { optionA: "Like old photo 📸", optionB: "Send voice note 🎤", category: "chaotic" },
        { optionA: "Food delivery 🍔", optionB: "Game purchases 🎮", category: "fun" },
        { optionA: "Rain 🌧️", optionB: "Cold weather ❄️", category: "cute" },
        { optionA: "Replay memory 🥺", optionB: "Future memory 🔮", category: "deep" },
        { optionA: "Fast internet 📶", optionB: "Unlimited battery 🔋", category: "tech" },
        { optionA: "Night drive 🚗", optionB: "Food date 🍟", category: "relationship" },
        { optionA: "Win arguments 😤", optionB: "Get spoiled ❤️", category: "relationship" },
        { optionA: "Lose charger 🔌", optionB: "Lose headphones 🎧", category: "fun" },
        { optionA: "Travel world ✈️", optionB: "Dream home 🏡", category: "future" },
        { optionA: "Random kisses 😘", optionB: "Random hugs 🤗", category: "flirty" },
        { optionA: "No TikTok 📱", optionB: "No Instagram 📸", category: "social" },
        { optionA: "Noodles 🍜", optionB: "Bread 🍞", category: "food" },
        { optionA: "Matching pajamas 🛌", optionB: "Matching sneakers 👟", category: "cute" },
        { optionA: "Always sleepy 😴", optionB: "Always hungry 🍔", category: "chaotic" },
        { optionA: "Confidence 😌", optionB: "Charisma ✨", category: "deep" },
        { optionA: "Horror 😨", optionB: "Romance ❤️", category: "movies" },
        { optionA: "Caught singing 🎤", optionB: "Caught dancing 💃", category: "funny" },
        { optionA: "Gaming date 🎮", optionB: "Cooking date 🍳", category: "relationship" },
        { optionA: "Know lies 🤥", optionB: "Know feelings ❤️", category: "deep" },
        { optionA: "Post drafts 😭", optionB: "Post screenshots 💀", category: "chaotic" },
        { optionA: "Perfect hair 💇", optionB: "Perfect outfits 👕", category: "lifestyle" },
        { optionA: "Luxury hotel 🏨", optionB: "Cozy cabin 🌲", category: "travel" },
        { optionA: "Spicy 🌶️", optionB: "Sweet 🍫", category: "food" },
        { optionA: "Always early ⏰", optionB: "Fashionably late 😎", category: "fun" },
        { optionA: "Massages 💆", optionB: "Sleep 😴", category: "selfcare" },
        // Batch 3
        { optionA: "Cold pillows ❄️", optionB: "Warm blankets 🛌", category: "comfort" },
        { optionA: "Go ghost 👻", optionB: "Lose phone 📱", category: "chaotic" },
        { optionA: "Unlimited snacks 🍟", optionB: "Unlimited drinks 🥤", category: "food" },
        { optionA: "Sunsets 🌅", optionB: "Sunrises 🌄", category: "relationship" },
        { optionA: "Clingy 🥺", optionB: "Teasing 😂", category: "flirty" },
        { optionA: "No memes 🚫😂", optionB: "No GIFs 🚫🎞️", category: "social" },
        { optionA: "Multiplayer 🎮", optionB: "Story games 📖", category: "gaming" },
        { optionA: "Laugh 😂", optionB: "Cry 😭", category: "funny" },
        { optionA: "Know secrets 🤫", optionB: "Know feelings ❤️", category: "deep" },
        { optionA: "Fresh laundry 🧺", optionB: "Vanilla 🍦", category: "fun" },
        { optionA: "Beach 🌊", optionB: "Mountains ⛰️", category: "travel" },
        { optionA: "Text ex 😭", optionB: "Text boss 💀", category: "chaotic" },
        { optionA: "Sushi 🍣", optionB: "Burgers 🍔", category: "food" },
        { optionA: "Emojis 😂", optionB: "Voice notes 🎤", category: "communication" },
        { optionA: "Gifts 🎁", optionB: "Attention ❤️", category: "relationship" },
        { optionA: "Perfect skin ✨", optionB: "Perfect hair 💇", category: "lifestyle" },
        { optionA: "Offline 🌿", optionB: "Online 📱", category: "tech" },
        { optionA: "Breakfast 🍳", optionB: "Dinner 🍝", category: "food" },
        { optionA: "Teleportation ✨", optionB: "Invisibility 👻", category: "wildcard" },
        { optionA: "Dance battles 💃", optionB: "Karaoke battles 🎤", category: "funny" },
        { optionA: "Perfect memory 🧠", optionB: "Perfect intuition 🔮", category: "deep" },
        { optionA: "Sleep call 📞", optionB: "Text all day 💬", category: "cute" },
        { optionA: "Dark mode 🌑", optionB: "Light mode ☀️", category: "tech" },
        { optionA: "Relive school 🎒", optionB: "Retire rich 💰", category: "future" },
        { optionA: "Butterflies 🥺", optionB: "Feel calm 😌", category: "emotional" },
        { optionA: "Iced coffee 🧋", optionB: "Hot coffee ☕", category: "food" },
        { optionA: "Forehead kisses 😚", optionB: "Hand squeezes 🤝", category: "flirty" },
        { optionA: "Overdressed 👔", optionB: "Underdressed 😭", category: "lifestyle" },
        { optionA: "No music 🚫🎵", optionB: "No movies 🚫🎬", category: "entertainment" },
        { optionA: "Dream job 🚀", optionB: "Dream relationship ❤️", category: "deep" },
      ];

      newWYR.forEach(q => {
        const key = `${q.optionA}|${q.optionB}`.toLowerCase().trim();
        if (!wyrTexts.has(key)) {
          const d = doc(wyrCol);
          batch.set(d, { ...q, isActive: true, isCustom: false });
          wyrTexts.add(key);
        }
      });

      const newTOD = [
        { type: "truth", category: "cute", text: "What’s one thing you miss most about me today?" },
        { type: "truth", category: "relationship", text: "When did you realize you were getting attached to me?" },
        { type: "truth", category: "flirty", text: "What’s your favorite thing I do unintentionally?" },
        { type: "truth", category: "deep", text: "What’s something you wish we could experience together physically right now?" },
        { type: "truth", category: "cute", text: "What’s your favorite memory of us texting late at night?" },
        { type: "truth", category: "flirty", text: "What outfit do you think I’d look best in?" },
        { type: "truth", category: "emotional", text: "What’s one thing I do that makes you feel safe?" },
        { type: "truth", category: "chaotic", text: "Have you ever stalked my profile for way too long?" },
        { type: "truth", category: "cute", text: "What’s the cutest thing I’ve ever said to you?" },
        { type: "truth", category: "deep", text: "What scares you most about long distance?" },
        { type: "dare", category: "funny", text: "Send a voice note pretending to propose dramatically." },
        { type: "dare", category: "cute", text: "Send your cutest selfie right now." },
        { type: "dare", category: "flirty", text: "Describe me in three attractive words." },
        { type: "dare", category: "relationship", text: "Type the cheesiest pickup line you can think of." },
        { type: "dare", category: "chaotic", text: "Send the last meme in your gallery." },
        { type: "dare", category: "cute", text: "Change my contact name to something adorable for 10 minutes." },
        { type: "dare", category: "flirty", text: "Send a voice note saying what you’d do if I was beside you right now." },
        { type: "dare", category: "funny", text: "Text using only emojis for the next 5 minutes." },
        { type: "dare", category: "cute", text: "Send a screenshot of your favorite chat between us." },
        { type: "dare", category: "relationship", text: "Write a tiny love note in one sentence." },
        { type: "truth", category: "flirty", text: "What’s one thing you’ve imagined us doing together?" },
        { type: "truth", category: "cute", text: "What nickname would you secretly love me to call you?" },
        { type: "truth", category: "deep", text: "What’s one future moment with me you think about a lot?" },
        { type: "truth", category: "chaotic", text: "What’s the pettiest thing you’ve gotten jealous over?" },
        { type: "truth", category: "emotional", text: "What’s one thing I’ve done that made you emotional?" },
        { type: "truth", category: "cute", text: "What’s your favorite thing about hearing my voice?" },
        { type: "truth", category: "relationship", text: "What’s one thing you think makes us different from other couples?" },
        { type: "truth", category: "funny", text: "What’s your funniest memory involving me?" },
        { type: "truth", category: "deep", text: "What’s one insecurity you rarely talk about?" },
        { type: "truth", category: "cute", text: "What’s something small I do that instantly improves your mood?" },
        { type: "dare", category: "funny", text: "Send a selfie making the ugliest face possible." },
        { type: "dare", category: "cute", text: "Send me a random picture from your day." },
        { type: "dare", category: "relationship", text: "Describe our relationship like it’s a movie trailer." },
        { optionA: "Compliment me continuously for 30 seconds.", type: "dare", category: "flirty", text: "Compliment me continuously for 30 seconds." },
        { type: "dare", category: "chaotic", text: "Use only baby language for your next 3 messages." },
        { type: "dare", category: "cute", text: "Send a song that reminds you of me." },
        { type: "dare", category: "deep", text: "Tell me one thing you appreciate about us." },
        { type: "dare", category: "funny", text: "Record yourself saying a dramatic 'I miss you' speech." },
        { type: "dare", category: "flirty", text: "Send the last attractive photo of yourself." },
        { type: "dare", category: "cute", text: "Make a heart using random objects near you and send it." },
        { type: "truth", category: "deep", text: "What’s one thing you’re excited to do together in the future?" },
        { type: "truth", category: "relationship", text: "What moment made you feel closest to me?" },
        { type: "truth", category: "cute", text: "What’s your favorite type of affection from me?" },
        { type: "truth", category: "chaotic", text: "What’s the most embarrassing thing you’ve done because you liked someone?" },
        { type: "truth", category: "emotional", text: "What’s one thing you never want to lose about us?" },
        { type: "truth", category: "flirty", text: "What’s something I do that gives you butterflies?" },
        { type: "truth", category: "cute", text: "What’s your favorite thing we do together online?" },
        { type: "truth", category: "deep", text: "What’s one thing you wish I understood more about you?" },
        { type: "truth", category: "relationship", text: "How do you usually know when you truly trust someone?" },
        { type: "truth", category: "cute", text: "What’s your favorite message I’ve ever sent you?" },
      ];

      newTOD.forEach(q => {
        if (!todTexts.has(q.text.toLowerCase().trim())) {
          const d = doc(todCol);
          batch.set(d, { ...q, isActive: true, isCustom: false });
          todTexts.add(q.text.toLowerCase().trim());
        }
      });

      await batch.commit();
      alert("Database updated with new standardized questions! Duplicates were skipped.");
    } catch (err) {
      console.error("Seeding failed:", err);
      alert("Failed to seed database.");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!uid) return <Skeleton />;
  
  // No game ID in URL - show landing/create screen
  if (!gameId && !game) {
    return (
      <div className="game-lobby-screen">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 10px', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 500, marginBottom: 3 }}>Games</p>
            <h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontWeight: 300, color: '#3D2B3D' }}>Rapid Fire</h1>
          </div>
          <button onClick={() => router.push('/games')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#7A5C7A', backdropFilter: 'blur(8px)' }}>✕</button>
        </div>

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
          
          <button 
            onClick={handleSeedDB} 
            style={{ fontSize: 11, color: '#7A5C7A', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Update Global Question Bank
          </button>
        </div>
      </div>
    );
  }

  if (!game) return <Skeleton />;

  if (game.status === 'finished') {
    return (
      <GameScreen title="Results" onExit={() => router.push('/games')}>
        <ResultsScreen 
          game={game} 
          uid={uid} 
          router={router} 
          onRematch={handleRematch} 
          rematching={rematching} 
        />
      </GameScreen>
    );
  }

  if (game.status === 'waiting') {
    // If the current user is not the creator, they are the joiner — show joining state
    const isCreator = game.creatorUid === uid;
    if (!isCreator || joining) {
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(232,160,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>⚡</div>
          <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 28, fontStyle: 'italic', color: '#3D2B3D' }}>Joining game...</p>
          <p style={{ fontSize: 13, color: '#7A5C7A' }}>Hold tight, getting you in!</p>
        </div>
      );
    }
    // Creator sees the waiting lobby
    return (
      <WaitingLobby
        gameId={gameId}
        gameType="rapid-fire"
        myPhoto={game.playerPhotos?.[uid]}
        onCancel={() => router.push('/games')}
      />
    );
  }

  return (
    <RapidFirePlaying
      game={game}
      uid={uid}
      gameId={gameId}
      router={router}
      showExit={showExit}
      setShowExit={setShowExit}
      singleValue={singleValue}
      setSingleValue={setSingleValue}
      remaining={remaining}
      progress={progress}
      isMyTurn={isMyTurn}
      handleAnswer={handleAnswer}
      isAnswering={isAnswering}
    />
  );
}

// ────────────────────────────────────────────────────────────
// PLAYING COMPONENT (Normalized)
// ────────────────────────────────────────────────────────────
function RapidFirePlaying({
  game, uid, gameId, router, showExit, setShowExit, singleValue, setSingleValue, remaining, progress, isMyTurn, handleAnswer, isAnswering
}: {
  game: GameState; uid: string; gameId: string; router: any; showExit: boolean; setShowExit: (b: boolean) => void; singleValue: string; setSingleValue: (s: string) => void; remaining: number; progress: number; isMyTurn: boolean; handleAnswer: (a: string) => void; isAnswering: boolean;
}) {
  const currentQ = game.questions[game.currentQuestionIndex];
  const opponentName = game.playerNames[game.players.find(p => p !== uid) || 'Partner'];

  return (
    <div className="game-active-screen" style={{ background: 'linear-gradient(160deg,#FAD0DC 0%,#EDD5F0 55%,#D8E8F8 100%)', display: 'flex', flexDirection: 'column' }}>
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
            {!currentQ ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p>No questions found. Please exit and try again.</p>
              </div>
            ) : (
              <>
                <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)', borderRadius: 28, padding: 36, border: '1.5px solid rgba(255,255,255,0.9)', textAlign: 'center', boxShadow: '0 15px 35px rgba(122,92,122,0.06)' }}>
                  <p style={{ fontSize: 10, color: '#C9829A', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>Rapid Fire Question</p>
                  <h1 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 26, fontStyle: 'italic', color: '#3D2B3D', lineHeight: 1.3 }}>{currentQ.text}</h1>
                </div>

                {currentQ.type === 'binary' || currentQ.options?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(currentQ.options?.length ? currentQ.options : ['A', 'B']).map((opt, i) => {
                      const parts = currentQ.text.split(/ or /i);
                      const label = currentQ.options?.length ? opt : (i === 0 ? (parts[0] || 'Option A') : (parts[1] || 'Option B'));
                      return (
                        <button
                          key={i}
                          disabled={isAnswering}
                          onClick={() => handleAnswer(currentQ.options?.length ? opt : (i === 0 ? 'A' : 'B'))}
                          style={{ padding: '24px 20px', borderRadius: 22, background: 'white', border: '2px solid #f0f0f0', fontSize: 18, fontWeight: 700, color: i % 2 === 0 ? '#E8A0A0' : '#C9B8D8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'all 0.2s', opacity: isAnswering ? 0.7 : 1 }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <input
                      autoFocus
                      disabled={isAnswering}
                      placeholder="First word only..."
                      value={singleValue}
                      onChange={e => setSingleValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && singleValue && handleAnswer(singleValue)}
                      style={{ width: '100%', padding: '22px', borderRadius: 24, border: '2.5px solid #E8A0A0', fontSize: 20, textAlign: 'center', fontFamily: 'inherit', background: 'white', boxShadow: '0 8px 20px rgba(232,160,160,0.1)' }}
                    />
                    <button 
                      onClick={() => singleValue && handleAnswer(singleValue)} 
                      disabled={!singleValue || isAnswering}
                      style={{ padding: 20, borderRadius: 100, background: '#3D2B3D', color: 'white', border: 'none', fontWeight: 700, fontSize: 16, opacity: (singleValue && !isAnswering) ? 1 : 0.5, transition: 'all 0.3s' }}
                    >
                      Send Answer ⚡
                    </button>
                  </div>
                )}
              </>
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
    </div>
  );
}



export default function RapidFirePage() {
  return <Suspense fallback={<Skeleton />}><RapidFireInner /></Suspense>;
}
