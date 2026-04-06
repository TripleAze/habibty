'use client';
// app/auth/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // check if paired
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().partnerId) {
          router.replace('/inbox');
        } else {
          router.replace('/pair');
        }
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const handleGoogle = async () => {
    if (!auth) return;
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create user doc if first time
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          partnerId: null,
          inviteCode,
          createdAt: Date.now(),
        });
      }
      // onAuthStateChanged above will redirect
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg.includes('popup-closed') ? '' : 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&display=swap');

        .auth-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #FAD0DC 0%, #EDD5F0 45%, #D5E2F8 100%);
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .auth-card {
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(232,160,160,0.25);
          border-radius: 28px;
          padding: 48px 40px;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          box-shadow: 0 8px 48px rgba(200,160,200,0.15);
          animation: fadeUp 0.7s ease both;
        }

        .auth-emoji {
          font-size: 36px;
          margin-bottom: 20px;
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        .auth-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 300;
          font-style: italic;
          color: #3D2B3D;
          text-align: center;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .auth-sub {
          font-size: 13px;
          color: rgba(122,92,122,0.7);
          text-align: center;
          margin-bottom: 36px;
          line-height: 1.5;
        }

        .auth-divider {
          width: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E8A0A0, transparent);
          margin-bottom: 36px;
        }

        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 15px 24px;
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(232,160,160,0.35);
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #3D2B3D;
          cursor: pointer;
          transition: all 0.25s ease;
          letter-spacing: 0.03em;
          box-shadow: 0 2px 12px rgba(200,160,200,0.15);
        }
        .btn-google:hover:not(:disabled) {
          background: #fff;
          box-shadow: 0 4px 20px rgba(200,160,200,0.25);
          transform: translateY(-1px);
        }
        .btn-google:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .auth-error {
          margin-top: 16px;
          font-size: 12px;
          color: #c0706a;
          text-align: center;
        }

        .auth-back {
          position: absolute;
          top: 28px;
          left: 24px;
          font-size: 13px;
          color: rgba(122,92,122,0.7);
          text-decoration: none;
          letter-spacing: 0.03em;
          transition: color 0.2s;
        }
        .auth-back:hover { color: #3D2B3D; }

        .auth-footer {
          margin-top: 24px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          font-style: italic;
          color: rgba(122,92,122,0.4);
          letter-spacing: 0.06em;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(122,92,122,0.2);
          border-top-color: #E8A0A0;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <a href="/" className="auth-back">← Back</a>

      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-emoji">💛</div>
          <h1 className="auth-title">Welcome back,<br />habibi</h1>
          <p className="auth-sub">Sign in to continue to your letters</p>
          <div className="auth-divider" />

          <button className="btn-google" onClick={handleGoogle} disabled={loading}>
            {loading ? (
              <div className="spinner" />
            ) : (
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && <p className="auth-error">{error}</p>}
        </div>

        <p className="auth-footer">your letters are waiting ♡</p>
      </div>
    </>
  );
}
