import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

export function checkWinner(board: string[]): string | null {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

export function getWinningCells(board: string[]): number[] {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return [a,b,c];
  }
  return [];
}

export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export interface GameState {
  id: string;
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  symbols: Record<string, string>;
  board: string[];
  turn: string;
  winner: string | null;
  winnerSymbol: string | null;
  isDraw: boolean;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export async function createGame(
  creatorUid: string,
  creatorName: string,
  creatorPhoto?: string
): Promise<string> {
  const gameId = generateGameId();
  const gameData: Omit<GameState, 'id'> = {
    players: [creatorUid],
    playerNames: { [creatorUid]: creatorName },
    playerPhotos: { [creatorUid]: creatorPhoto || '' },
    symbols: { [creatorUid]: 'X' },
    board: Array(9).fill(''),
    turn: creatorUid,
    winner: null,
    winnerSymbol: null,
    isDraw: false,
    status: 'waiting',
    createdAt: Date.now(),
  };
  await setDoc(doc(db, 'games', gameId), gameData);
  return gameId;
}

export async function joinGame(
  gameId: string,
  joinerUid: string,
  joinerName: string,
  joinerPhoto?: string
): Promise<{ ok: boolean; error?: string }> {
  const ref = doc(db, 'games', gameId.toUpperCase());
  const snap = await getDoc(ref);

  if (!snap.exists()) return { ok: false, error: 'Game not found. Check the code.' };
  const data = snap.data() as GameState;
  if (data.players.includes(joinerUid)) return { ok: true };
  if (data.players.length >= 2) return { ok: false, error: 'This game is already full.' };
  if (data.status === 'finished') return { ok: false, error: 'This game has ended.' };

  await updateDoc(ref, {
    players: [...data.players, joinerUid],
    [`playerNames.${joinerUid}`]: joinerName,
    [`playerPhotos.${joinerUid}`]: joinerPhoto || '',
    [`symbols.${joinerUid}`]: 'O',
    status: 'playing',
  });
  return { ok: true };
}

export async function makeMove(
  gameId: string,
  uid: string,
  index: number
): Promise<void> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as GameState;

  if (data.turn !== uid) return;
  if (data.board[index] !== '') return;
  if (data.status !== 'playing') return;

  const newBoard = [...data.board];
  newBoard[index] = data.symbols[uid];

  const winSymbol = checkWinner(newBoard);
  const isDraw = !winSymbol && newBoard.every(c => c !== '');
  const nextTurn = data.players.find(p => p !== uid) ?? uid;

  await updateDoc(ref, {
    board: newBoard,
    turn: winSymbol || isDraw ? data.turn : nextTurn,
    winner: winSymbol ? uid : null,
    winnerSymbol: winSymbol ?? null,
    isDraw,
    status: winSymbol || isDraw ? 'finished' : 'playing',
  });
}

export async function rematch(gameId: string, initiatorUid: string): Promise<string> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return gameId;
  const data = snap.data() as GameState;

  const newGameId = generateGameId();
  const [p1, p2] = data.players;
  const flippedSymbols: Record<string, string> = {};
  data.players.forEach(uid => {
    flippedSymbols[uid] = data.symbols[uid] === 'X' ? 'O' : 'X';
  });
  const firstTurn = data.players.find(uid => flippedSymbols[uid] === 'X') ?? p1;

  await setDoc(doc(db, 'games', newGameId), {
    players: data.players,
    playerNames: data.playerNames,
    playerPhotos: data.playerPhotos,
    symbols: flippedSymbols,
    board: Array(9).fill(''),
    turn: firstTurn,
    winner: null,
    winnerSymbol: null,
    isDraw: false,
    status: 'playing',
    createdAt: Date.now(),
  });
  return newGameId;
}

export function subscribeToGame(
  gameId: string,
  cb: (data: GameState) => void
): () => void {
  return onSnapshot(doc(db, 'games', gameId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as GameState);
  });
}