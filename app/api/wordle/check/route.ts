// Server-side word validation for Partner Wordle
// The word NEVER leaves the server - only tile states are returned

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { recordGameResult } from '@/lib/scoreboard';

type TileState = 'correct' | 'present' | 'absent';

interface CheckResponse {
  success: boolean;
  error?: string;
  tileStates?: TileState[][];
  won?: boolean;
  attemptsLeft?: number;
  hintLevel?: number;
}

// ────────────────────────────────────────────────────────────
// WORDLE LOGIC
// ────────────────────────────────────────────────────────────

/**
 * Calculate tile states for a guess against the target word
 * - correct (green): letter in correct position
 * - present (yellow): letter in word but wrong position
 * - absent (gray): letter not in word
 */
function calculateTileStates(guess: string, word: string): TileState[] {
  const states: TileState[] = new Array(5).fill('absent');
  const wordLetters = word.split('');
  const guessLetters = guess.split('');
  const letterCounts: Record<string, number> = {};

  // Count letter frequencies in target word
  for (const letter of wordLetters) {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  }

  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === wordLetters[i]) {
      states[i] = 'correct';
      letterCounts[guessLetters[i]]--;
    }
  }

  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (states[i] !== 'correct' && letterCounts[guessLetters[i]] > 0) {
      states[i] = 'present';
      letterCounts[guessLetters[i]]--;
    }
  }

  return states;
}

/**
 * Calculate hint level based on failed attempts
 * - Level 0: Category only
 * - Level 1: Text hint (after 2 failed attempts)
 * - Level 2: Emoji hint (after 3 failed attempts)
 * - Level 3: Letter reveal (after 4 failed attempts)
 */
function getHintLevel(tileStates: TileState[][]): 0 | 1 | 2 | 3 {
  const failedAttempts = tileStates.filter(
    (states) => states.some((state) => state !== 'correct')
  ).length;

  if (failedAttempts >= 4) return 3;
  if (failedAttempts >= 3) return 2;
  if (failedAttempts >= 2) return 1;
  return 0;
}

// ────────────────────────────────────────────────────────────
// API HANDLER
// ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, guess, guesserUid } = body;

    // Validation
    if (!gameId || !guess || !guesserUid) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (guess.length !== 5) {
      return NextResponse.json(
        { success: false, error: 'Guess must be 5 letters' },
        { status: 400 }
      );
    }

    // Get game from Firestore
    const gameRef = doc(db, 'games', gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = gameSnap.data();

    // Verify player
    if (!game.players?.includes(guesserUid)) {
      return NextResponse.json(
        { success: false, error: 'Not a player in this game' },
        { status: 403 }
      );
    }

    // Verify game type
    if (game.type !== 'wordle') {
      return NextResponse.json(
        { success: false, error: 'Not a wordle game' },
        { status: 400 }
      );
    }

    // Get the word (NEVER sent to client)
    const word = game.word?.toUpperCase();
    if (!word) {
      return NextResponse.json(
        { success: false, error: 'Game word not found' },
        { status: 500 }
      );
    }

    const normalizedGuess = guess.toUpperCase();

    // Calculate tile states
    const tileStates = calculateTileStates(normalizedGuess, word);

    // Check if won
    const won = tileStates.every((state) => state === 'correct');

    // Get all tile states including this guess
    const allTileStates = [...(game.tileStates || []), tileStates];
    const hintLevel = getHintLevel(allTileStates);

    // Determine which letters to reveal at hint level 3
    let revealLetters: number[] = game.hints?.revealLetters || [];
    if (hintLevel === 3 && revealLetters.length === 0) {
      // Reveal first letter that hasn't been guessed correctly
      for (let i = 0; i < word.length; i++) {
        const wasCorrect = allTileStates.some(
          (states) => states[i] === 'correct'
        );
        if (!wasCorrect) {
          revealLetters = [i];
          break;
        }
      }
    }

    // Update game state
    const attempts = [...(game.attempts || []), normalizedGuess];
    const attemptsLeft = 6 - attempts.length;

    const updates: Record<string, unknown> = {
      attempts,
      tileStates: allTileStates,
      hintLevel,
      currentGuess: '',
    };

    if (revealLetters.length > 0) {
      updates['hints.revealLetters'] = revealLetters;
    }

    if (won) {
      updates.status = 'won';
      updates.winner = guesserUid;
      // Record scoreboard
      recordGameResult(
        guesserUid, 
        game.creatorUid, 
        'wordle', 
        guesserUid, 
        game.playerNames[guesserUid] || 'Guesser'
      ).catch(e => console.error('Wordle scoreboard update failed:', e));
    } else if (attemptsLeft === 0) {
      updates.status = 'lost';
      updates.winner = game.creatorUid; // Creator wins if guesser loses
      // Record scoreboard
      recordGameResult(
        guesserUid, 
        game.creatorUid, 
        'wordle', 
        game.creatorUid, 
        game.playerNames[game.creatorUid] || 'Creator'
      ).catch(e => console.error('Wordle scoreboard update failed:', e));
    }

    await updateDoc(gameRef, updates);

    return NextResponse.json({
      success: true,
      tileStates: [tileStates],
      won,
      attemptsLeft,
      hintLevel,
      status: won ? 'won' : attemptsLeft === 0 ? 'lost' : 'playing',
    });

  } catch (error) {
    console.error('Wordle check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
