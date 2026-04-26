import {
  doc, setDoc, updateDoc, onSnapshot, getDoc, arrayUnion, collection, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateGameId } from './games';

import {
  Suit, WhotCard, WhotGameState, PlayerHand, SpecialEffect,
} from '@/types';

export type {
  Suit, WhotCard, WhotGameState, PlayerHand, SpecialEffect,
};

// ─── DECK DEFINITION ─────────────────────────────────────

const SUIT_VALUES: Record<Exclude<Suit, 'whot'>, number[]> = {
  circle:   [1,2,3,4,5,7,8,10,11,12,13,14],
  triangle: [1,2,3,4,5,7,8,10,11,12,13,14],
  cross:    [1,2,3,4,5,7,8,10,11,12,13,14],
  square:   [1,2,3,4,5,7,8,10,11,12,13,14],
  star:     [1,2,3,4,5,7,8,10,11,12,13,14],
};

export function buildDeck(): WhotCard[] {
  const cards: WhotCard[] = [];
  let idx = 0;

  for (const [suit, values] of Object.entries(SUIT_VALUES) as [Exclude<Suit,'whot'>, number[]][]) {
    for (const value of values) {
      cards.push({ suit, value, id: `${suit}-${value}-${idx++}` });
    }
  }
  // 4 Whot cards
  for (let i = 0; i < 4; i++) {
    cards.push({ suit: 'whot', value: 20, id: `whot-20-${idx++}` });
  }
  return cards; // 64 cards total
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deal 5 cards each, ensure top card is not a special card
export function dealHands(players: string[]): {
  hands: Record<string, WhotCard[]>;
  deck: WhotCard[];
  topCard: WhotCard;
  discard: WhotCard[];
} {
  let deck = shuffle(buildDeck());
  const hands: Record<string, WhotCard[]> = {};
  for (const uid of players) {
    hands[uid] = deck.splice(0, 5);
  }

  // Find a safe non-special starting card
  let topCard: WhotCard | undefined;
  let topIdx = 0;
  for (let i = 0; i < deck.length; i++) {
    const c = deck[i];
    if (c.suit !== 'whot' && ![1,2,5,8,14].includes(c.value)) {
      topCard = c;
      topIdx = i;
      break;
    }
  }
  if (!topCard) {
    topCard = deck[0];
    topIdx = 0;
  }
  deck.splice(topIdx, 1);

  return { hands, deck, topCard, discard: [topCard] };
}

// ─── CARD RULES ──────────────────────────────────────────

export function getSpecialEffect(card: WhotCard): SpecialEffect {
  if (card.suit === 'whot') return 'market'; // caller picks suit, next draws 1 if can't play
  switch (card.value) {
    case 1:  return 'skip';
    case 8:  return 'skip';
    case 2:  return 'pick2';
    case 5:  return 'pick3';
    case 14: return 'general-market';
    default: return null;
  }
}

export function canPlay(
  card: WhotCard,
  topCard: WhotCard,
  calledSuit: Suit | null,
  pendingPickup: number
): boolean {
  // If there's a pending pickup, you can only counter with same pick card or play your own
  if (pendingPickup > 0) {
    const effect = getSpecialEffect(card);
    const topEffect = getSpecialEffect(topCard);
    // Can stack pick2 on pick2, pick3 on pick3
    if (topEffect === 'pick2' && effect === 'pick2') return true;
    if (topEffect === 'pick3' && effect === 'pick3') return true;
    return false;
  }

  if (card.suit === 'whot') return true;

  const activeSuit = calledSuit ?? topCard.suit;
  if (card.suit === activeSuit) return true;
  if (card.value === topCard.value) return true;

  return false;
}

export function checkWinner(hand: WhotCard[]): boolean {
  return hand.length === 0;
}

// ─── FIRESTORE GAME ACTIONS ──────────────────────────────

export async function createWhotGame(
  creatorUid: string,
  creatorName: string,
  creatorPhoto?: string
): Promise<string> {
  const gameId = generateGameId();
  const state: Omit<WhotGameState, 'id'> = {
    type: 'whot',
    players: [creatorUid],
    playerNames: { [creatorUid]: creatorName },
    playerPhotos: { [creatorUid]: creatorPhoto || '' },
    winner: null,
    lastCardUids: [],
    createdAt: Date.now(),
    deckCount: 0,
    nextDeckIndex: 0,
    discard: [],
    topCard: { suit: 'circle', value: 3, id: 'placeholder' },
    calledSuit: null,
    turn: creatorUid,
    pendingPickup: 0,
    pendingSkip: false,
    status: 'waiting',
    handCounts: {},
  };
  await setDoc(doc(db, 'games', gameId), state);
  return gameId;
}

export async function joinWhotGame(
  gameId: string,
  joinerUid: string,
  joinerName: string,
  joinerPhoto?: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, 'games', gameId.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Game not found.' };
  const data = snap.data() as WhotGameState;
  if (data.players.length >= 2) return { ok: false, error: 'Game is full.' };
  if (data.players.includes(joinerUid)) return { ok: true };
  if (data.status === 'finished') return { ok: false, error: 'Game has ended.' };

  const allPlayers = [...data.players, joinerUid];
  const { hands, deck, topCard, discard } = dealHands(allPlayers);

  const batch = writeBatch(db);

  // 1. Update main game document
  batch.update(ref, {
    players: allPlayers,
    [`playerNames.${joinerUid}`]: joinerName,
    [`playerPhotos.${joinerUid}`]: joinerPhoto || '',
    discard,
    topCard,
    turn: allPlayers[0],
    status: 'playing',
    deckCount: deck.length,
    nextDeckIndex: 0,
    handCounts: {
      [allPlayers[0]]: hands[allPlayers[0]].length,
      [allPlayers[1]]: hands[allPlayers[1]].length,
    },
  });

  // 2. Create private hands
  for (const pid of allPlayers) {
    const handRef = doc(db, 'games', gameId.toUpperCase(), 'hands', pid);
    batch.set(handRef, { cards: hands[pid] });
  }

  // 3. Create hidden deck
  deck.forEach((card, index) => {
    const cardRef = doc(db, 'games', gameId.toUpperCase(), 'deck', index.toString());
    batch.set(cardRef, card);
  });

  await batch.commit();
  return { ok: true };
}

export async function playCard(
  gameId: string,
  uid: string,
  card: WhotCard,
  calledSuit?: Suit  // required when playing a Whot card
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, 'games', gameId.toUpperCase());
  const handRef = doc(db, 'games', gameId.toUpperCase(), 'hands', uid);
  
  const [snap, handSnap] = await Promise.all([getDoc(ref), getDoc(handRef)]);
  
  if (!snap.exists()) return { ok: false, error: 'Game not found.' };
  if (!handSnap.exists()) return { ok: false, error: 'Hand not found.' };
  
  const g = snap.data() as WhotGameState;
  const myHand = (handSnap.data() as PlayerHand).cards;

  if (g.turn !== uid) return { ok: false, error: 'Not your turn.' };
  if (g.status !== 'playing') return { ok: false, error: 'Game not active.' };

  const cardIdx = myHand.findIndex(c => c.id === card.id);
  if (cardIdx === -1) return { ok: false, error: 'Card not in hand.' };

  if (!canPlay(card, g.topCard, g.calledSuit, g.pendingPickup)) {
    return { ok: false, error: 'Cannot play that card.' };
  }

  const newHand = myHand.filter((_, i) => i !== cardIdx);
  const opponent = g.players.find(p => p !== uid)!;

  const effect = getSpecialEffect(card);

  // Check winner
  if (newHand.length === 0) {
    const batch = writeBatch(db);
    batch.update(ref, {
      discard: [...g.discard, card],
      topCard: card,
      calledSuit: null,
      status: 'finished',
      winner: uid,
      lastCardUids: [],
      [`handCounts.${uid}`]: 0,
    });
    batch.update(handRef, { cards: newHand });
    await batch.commit();
    return { ok: true };
  }

  // Auto-detect last card
  const lastCardUids = newHand.length === 1
    ? [...new Set([...g.lastCardUids, uid])]
    : g.lastCardUids.filter(id => id !== uid);

  // Determine next state
  let nextTurn = opponent;
  let newPendingPickup = 0;
  let newPendingSkip = false;
  let newCalledSuit: Suit | null = card.suit === 'whot' ? (calledSuit ?? 'circle') : null;
  let newDeckCount = g.deckCount;
  let nextDeckIndex = g.nextDeckIndex;

  // Use existing public count as default — no need to read opponent's private hand
  let opponentHandCount = g.handCounts[opponent] ?? 0;

  const batch = writeBatch(db);

  if (effect === 'pick2') {
    newPendingPickup = g.pendingPickup + 2;
  } else if (effect === 'pick3') {
    newPendingPickup = g.pendingPickup + 3;
  } else if (effect === 'skip') {
    nextTurn = uid;
  } else if (effect === 'general-market' && newDeckCount > 0) {
    // We use arrayUnion for a 'blind write' so we don't have to read the opponent's hand doc
    const oppHandRef = doc(db, 'games', gameId.toUpperCase(), 'hands', opponent);
    const deckCardRef = doc(db, 'games', gameId.toUpperCase(), 'deck', nextDeckIndex.toString());
    const cardSnap = await getDoc(deckCardRef);
    if (cardSnap.exists()) {
      const drawnCard = cardSnap.data() as WhotCard;
      batch.update(oppHandRef, { cards: arrayUnion(drawnCard) });
      opponentHandCount = (g.handCounts[opponent] ?? 0) + 1;
      newDeckCount--;
      nextDeckIndex++;
    }
  }

  batch.update(ref, {
    discard: [...g.discard, card],
    topCard: card,
    calledSuit: newCalledSuit,
    turn: nextTurn,
    pendingPickup: newPendingPickup,
    pendingSkip: newPendingSkip,
    lastCardUids,
    deckCount: newDeckCount,
    nextDeckIndex: nextDeckIndex,
    [`handCounts.${uid}`]: newHand.length,
    [`handCounts.${opponent}`]: opponentHandCount,
  });
  
  batch.update(handRef, { cards: newHand });
  
  await batch.commit();
  return { ok: true };
}

export async function drawCard(
  gameId: string,
  uid: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, 'games', gameId.toUpperCase());
  const handRef = doc(db, 'games', gameId.toUpperCase(), 'hands', uid);
  
  const [snap, handSnap] = await Promise.all([getDoc(ref), getDoc(handRef)]);
  if (!snap.exists()) return { ok: false, error: 'Game not found.' };
  if (!handSnap.exists()) return { ok: false, error: 'Hand not found.' };

  const g = snap.data() as WhotGameState;
  const myHand = (handSnap.data() as PlayerHand).cards;

  if (g.turn !== uid) return { ok: false, error: 'Not your turn.' };
  if (g.status !== 'playing') return { ok: false, error: 'Game not active.' };

  const opponent = g.players.find(p => p !== uid)!;
  let newDeckCount = g.deckCount;
  let nextDeckIndex = g.nextDeckIndex;
  let updatedHand = [...myHand];

  const count = g.pendingPickup > 0 ? g.pendingPickup : 1;
  const drawPromises = [];

  for (let i = 0; i < count; i++) {
    if (newDeckCount > 0) {
      const cardRef = doc(db, 'games', gameId.toUpperCase(), 'deck', (nextDeckIndex + i).toString());
      drawPromises.push(getDoc(cardRef));
    }
  }

  const drawnSnaps = await Promise.all(drawPromises);
  drawnSnaps.forEach(s => {
    if (s.exists()) {
      updatedHand.push(s.data() as WhotCard);
      newDeckCount--;
      nextDeckIndex++;
    }
  });

  const lastCardUids = updatedHand.length === 1
    ? [...new Set([...g.lastCardUids, uid])]
    : g.lastCardUids.filter(id => id !== uid);

  const batch = writeBatch(db);
  batch.update(ref, {
    deckCount: newDeckCount,
    nextDeckIndex: nextDeckIndex,
    pendingPickup: 0,
    pendingSkip: false,
    turn: opponent,
    lastCardUids,
    [`handCounts.${uid}`]: updatedHand.length,
  });
  batch.update(handRef, { cards: updatedHand });

  await batch.commit();
  return { ok: true };
}

export async function rematchWhot(gameId: string): Promise<string> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return gameId;
  const g = snap.data() as WhotGameState;

  const newId = generateGameId();
  const { hands, deck, topCard, discard } = dealHands(g.players);
  const secondPlayer = g.players[1] ?? g.players[0];

  const batch = writeBatch(db);

  batch.set(doc(db, 'games', newId), {
    type: 'whot',
    players: g.players,
    playerNames: g.playerNames,
    playerPhotos: g.playerPhotos,
    discard,
    topCard,
    calledSuit: null,
    turn: secondPlayer, // loser goes first
    pendingPickup: 0,
    pendingSkip: false,
    status: 'playing',
    winner: null,
    lastCardUids: [],
    createdAt: Date.now(),
    deckCount: deck.length,
    nextDeckIndex: 0,
    handCounts: {
      [g.players[0]]: hands[g.players[0]].length,
      [g.players[1]]: hands[g.players[1]].length,
    },
  });

  for (const pid of g.players) {
    batch.set(doc(db, 'games', newId, 'hands', pid), { cards: hands[pid] });
  }

  deck.forEach((card, index) => {
    batch.set(doc(db, 'games', newId, 'deck', index.toString()), card);
  });

  await batch.commit();
  return newId;
}

export function subscribeToWhotGame(
  gameId: string,
  cb: (state: WhotGameState) => void
): () => void {
  return onSnapshot(doc(db, 'games', gameId.toUpperCase()), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as WhotGameState);
  });
}

export function subscribeToWhotHand(
  gameId: string,
  uid: string,
  cb: (cards: WhotCard[]) => void
): () => void {
  return onSnapshot(doc(db, 'games', gameId.toUpperCase(), 'hands', uid), snap => {
    if (snap.exists()) {
      const data = snap.data() as PlayerHand;
      cb(data.cards);
    }
  });
}

// ─── DISPLAY HELPERS ─────────────────────────────────────

export const SUIT_SYMBOL: Record<Suit, string> = {
  circle:   '●',
  triangle: '▲',
  cross:    '✚',
  square:   '■',
  star:     '★',
  whot:     'W',
};

export const SUIT_COLOR: Record<Suit, string> = {
  circle:   '#E8A0A0',  // rose
  triangle: '#C9B8D8',  // lavender
  cross:    '#A0C8E8',  // blue
  square:   '#A0D8B0',  // green
  star:     '#E8CFA0',  // gold
  whot:     '#3D2B3D',  // ink
};

export const SUIT_BG: Record<Suit, string> = {
  circle:   'rgba(232,160,160,0.15)',
  triangle: 'rgba(201,184,216,0.15)',
  cross:    'rgba(160,200,232,0.15)',
  square:   'rgba(160,216,176,0.15)',
  star:     'rgba(232,207,160,0.15)',
  whot:     'rgba(61,43,61,0.08)',
};

export function cardLabel(card: WhotCard): string {
  if (card.suit === 'whot') return 'WHOT';
  return `${card.value}`;
}

export function getEffectLabel(card: WhotCard): string | null {
  const effect = getSpecialEffect(card);
  if (!effect) return null;
  switch (effect) {
    case 'pick2':          return 'Pick 2';
    case 'pick3':          return 'Pick 3';
    case 'skip':           return card.value === 1 ? 'Hold On' : 'Suspension';
    case 'market':         return 'Whot!';
    case 'general-market': return 'General Market';
    default:               return null;
  }
}