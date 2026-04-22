// Shared game utilities for all games
import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ────────────────────────────────────────────────────────────
// GAME ID GENERATION
// 6-character uppercase alphanumeric codes
// ────────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 (confusing)

export function generateGameId(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

// Ensure unique game ID
export async function generateUniqueGameId(): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    const id = generateGameId();
    const docRef = doc(db, 'games', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return id;
    }
    attempts++;
  }
  // If we can't find a unique ID after 5 attempts, add timestamp
  return generateGameId() + Date.now().toString().slice(-2);
}

// ────────────────────────────────────────────────────────────
// BASE GAME CREATION
// Creates a game document with shared fields
// ────────────────────────────────────────────────────────────
interface BaseGameOptions {
  type: string;
  creatorUid: string;
  creatorName: string;
  creatorPhoto?: string;
  partnerName?: string;
  partnerPhoto?: string;
}

export async function createBaseGame(options: BaseGameOptions): Promise<string> {
  const gameId = await generateUniqueGameId();
  const gameRef = doc(db, 'games', gameId);

  await setDoc(gameRef, {
    type: options.type,
    creatorUid: options.creatorUid,
    players: [options.creatorUid],
    playerNames: {
      [options.creatorUid]: options.creatorName,
    },
    playerPhotos: options.creatorPhoto ? {
      [options.creatorUid]: options.creatorPhoto,
    } : {},
    status: 'waiting',
    createdAt: serverTimestamp(),
  });

  return gameId;
}

// ────────────────────────────────────────────────────────────
// JOIN GAME
// Adds a player to an existing game
// ────────────────────────────────────────────────────────────
interface JoinGameResult {
  success: boolean;
  error?: string;
  gameType?: string;
}

export async function joinGame(
  gameId: string,
  playerUid: string,
  playerName: string,
  playerPhoto?: string
): Promise<JoinGameResult> {
  const gameRef = doc(db, 'games', gameId);
  const snap = await getDoc(gameRef);

  if (!snap.exists()) {
    return { success: false, error: 'Game not found' };
  }

  const data = snap.data();

  if (data.players?.includes(playerUid)) {
    return { success: true, gameType: data.type }; // Already joined
  }

  if (data.players?.length >= 2) {
    return { success: false, error: 'Game is full' };
  }

  // Add player
  const updates: Record<string, unknown> = {
    players: [...(data.players || []), playerUid],
    [`playerNames.${playerUid}`]: playerName,
    status: 'active',
  };

  if (playerPhoto) {
    updates[`playerPhotos.${playerUid}`] = playerPhoto;
  }

  await updateDoc(gameRef, updates);

  return { success: true, gameType: data.type };
}

// ────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ────────────────────────────────────────────────────────────

// Format timer display (MM:SS or SS)
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return secs.toString();
}

// Get elapsed time from server timestamp
export function getElapsedTime(startTime: number | null): number {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

// Shuffle array (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ────────────────────────────────────────────────────────────
// GAME SHARING
// ────────────────────────────────────────────────────────────

export function getShareUrl(gameId: string, baseUrl: string): string {
  return `${baseUrl}/games?id=${gameId}`;
}

export async function copyGameCode(gameId: string): Promise<void> {
  await navigator.clipboard.writeText(gameId);
}

// ────────────────────────────────────────────────────────────
// PLAYER UTILS
// ────────────────────────────────────────────────────────────

export function getOpponentUid(players: string[], myUid: string): string {
  return players.find(p => p !== myUid) || '';
}

export function isMyTurn(gameTurn: string | undefined, myUid: string): boolean {
  return gameTurn === myUid;
}
