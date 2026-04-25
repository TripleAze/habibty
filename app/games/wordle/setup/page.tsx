'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateGameId } from '@/lib/gameUtils';
import GameScreen from '@/components/games/GameScreen';
import ExitSheet from '@/components/games/ExitSheet';

// Valid 5-letter words (subset for validation - in production, use a full dictionary)
const VALID_WORD_PATTERN = /^[A-Z]{5}$/;

export default function WordleSetupPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [showExit, setShowExit] = useState(false);
  const [creating, setCreating] = useState(false);

  const [word, setWord] = useState('');
  const [category, setCategory] = useState('');
  const [textHint, setTextHint] = useState('');
  const [emojiHint, setEmojiHint] = useState('');
  const [revealLetters, setRevealLetters] = useState<number[]>([]);
  const [error, setError] = useState('');

  // Auth check
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) router.replace('/auth');
      else setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  const handleLetterToggle = (index: number) => {
    setRevealLetters(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleCreate = async () => {
    setError('');

    // Validation
    const upperWord = word.toUpperCase().trim();
    if (!VALID_WORD_PATTERN.test(upperWord)) {
      setError('Word must be exactly 5 letters (A-Z only)');
      return;
    }

    if (!category.trim()) {
      setError('Please enter a category');
      return;
    }

    if (!textHint.trim()) {
      setError('Please enter a text hint');
      return;
    }

    setCreating(true);

    try {
      const gameId = await generateGameId();
      const user = auth?.currentUser;

      await setDoc(doc(db, 'games', gameId), {
        type: 'wordle',
        creatorUid: uid,
        guesserUid: null,
        word: upperWord, // Stored server-side, never sent to guesser client directly
        hints: {
          text: textHint.trim(),
          emoji: emojiHint.trim(),
          category: category.trim(),
          revealLetters: revealLetters.length > 0 ? revealLetters : [0], // Default reveal first letter
        },
        attempts: [],
        currentGuess: '',
        tileStates: [],
        hintLevel: 0,
        status: 'waiting',
        players: [uid],
        playerNames: {
          [uid]: user?.displayName || 'Creator',
        },
        playerPhotos: user?.photoURL ? { [uid]: user.photoURL } : {},
        createdAt: serverTimestamp(),
      });

      router.replace(`/games/wordle?id=${gameId}`);
    } catch (err) {
      console.error('Create error:', err);
      setError('Failed to create game. Please try again.');
      setCreating(false);
    }
  };

  return (
    <>
      {showExit && <ExitSheet onResume={() => setShowExit(false)} onMessages={() => router.push('/inbox')} onLeave={() => router.push('/games')} />}
      <GameScreen title="Partner Wordle" onExit={() => setShowExit(true)}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px 40px', overflow: 'auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 24, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 8 }}>Create a Word Puzzle</p>
            <p style={{ fontSize: 13, color: 'rgba(122,92,122,0.6)' }}>Set a word and hints for your partner to guess</p>
          </div>

          {/* Secret Word */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7A5C7A', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Secret Word (5 letters)
            </label>
            <input
              type="text"
              maxLength={5}
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="HEART"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid rgba(201,184,216,0.4)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: 24,
                fontFamily: "var(--font-cormorant),serif",
                textAlign: 'center',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 6 }}>This word will be hidden from your partner</p>
          </div>

          {/* Category */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7A5C7A', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Love, Nature, Food"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid rgba(201,184,216,0.4)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 6 }}>Shown from the start to help them guess</p>
          </div>

          {/* Text Hint */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7A5C7A', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Text Hint
            </label>
            <textarea
              value={textHint}
              onChange={(e) => setTextHint(e.target.value)}
              placeholder="e.g., Something you feel when you're in love"
              rows={2}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid rgba(201,184,216,0.4)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: 14,
                outline: 'none',
                resize: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 6 }}>Revealed after 2 failed attempts</p>
          </div>

          {/* Emoji Hint */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7A5C7A', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Emoji Hint
            </label>
            <input
              type="text"
              value={emojiHint}
              onChange={(e) => setEmojiHint(e.target.value)}
              placeholder="e.g., 💕🌹💌"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1.5px solid rgba(201,184,216,0.4)',
                background: 'rgba(255,255,255,0.8)',
                fontSize: 20,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginTop: 6 }}>Revealed after 3 failed attempts</p>
          </div>

          {/* Letter Reveals */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#7A5C7A', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Letters to Reveal (optional)
            </label>
            <p style={{ fontSize: 11, color: 'rgba(122,92,122,0.5)', marginBottom: 12 }}>Tap positions to reveal after 4 failed attempts</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[0, 1, 2, 3, 4].map(i => (
                <button
                  key={i}
                  onClick={() => handleLetterToggle(i)}
                  style={{
                    width: 48,
                    height: 56,
                    borderRadius: 10,
                    background: revealLetters.includes(i)
                      ? 'linear-gradient(135deg,#E8A0A0,#C9B8D8)'
                      : 'rgba(255,255,255,0.6)',
                    border: revealLetters.includes(i) ? 'none' : '1.5px solid rgba(201,184,216,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontFamily: "var(--font-cormorant),serif",
                    color: revealLetters.includes(i) ? 'white' : '#7A5C7A',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {word[i] || '?'}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 13, color: '#B06060', textAlign: 'center', marginBottom: 16 }}>{error}</p>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '16px',
              borderRadius: 100,
              background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)',
              border: 'none',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              cursor: creating ? 'not-allowed' : 'pointer',
              fontFamily: "var(--font-dm-sans),sans-serif",
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </GameScreen>
    </>
  );
}
