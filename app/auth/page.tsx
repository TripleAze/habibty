"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ChevronLeft } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().partnerId) {
            router.replace('/inbox');
          } else {
            router.replace('/pair');
          }
        } catch (e) {
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
      await createUserDocIfNeeded(result.user);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('blocked')) {
        setError('Network blocked. Please disable ad-blockers.');
      } else {
        setError(err.message?.includes('popup-closed') ? '' : 'Google sign-in failed');
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        if (!name) throw new Error('Name is required');
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        await createUserDocIfNeeded(res.user, name);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const createUserDocIfNeeded = async (user: any, manualName?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(userRef, {
          displayName: manualName || user.displayName || 'Habibi',
          email: user.email,
          photoURL: user.photoURL || null,
          partnerId: null,
          inviteCode,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn("Firestore blocked, skipping doc creation");
    }
    if (typeof window !== "undefined") sessionStorage.setItem("trigger_burst", "true");
  };

  if (checking) return null;

  return (
    <div className="auth-root">
      <div className="top-nav">
        <button className="back-button" onClick={() => router.back()}>
          <ChevronLeft size={20} color="#7A5C7A" />
        </button>
      </div>

      <div className="auth-container">
        <div className="header-section">
          <h1 className="title">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="subtitle">
            {mode === 'signin' ? 'Your love story continues here' : 'Start your journey together'}
          </p>
        </div>

        <button className="google-btn" onClick={handleGoogle} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" alt="G" />
          <span>Continue with Google</span>
        </button>

        <div className="divider">
          <div className="line"></div>
          <span>or</span>
          <div className="line"></div>
        </div>

        <form className="auth-form" onSubmit={handleEmailAuth}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email address"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        <div className="footer">
          <p>
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
            <button className="toggle-btn" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-root {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(180deg, #F5D3E0 0%, #D8DFF5 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          font-family: var(--font-dm-sans), sans-serif;
        }

        .top-nav {
          width: 100%;
          max-width: 400px;
          display: flex;
          justify-content: flex-start;
          padding-top: 20px;
          margin-bottom: 60px;
        }

        .back-button {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .auth-container {
          width: 100%;
          max-width: 360px;
          text-align: center;
        }

        .header-section {
          margin-bottom: 40px;
        }

        .title {
          font-family: var(--font-cormorant), serif;
          font-size: 32px;
          font-weight: 500;
          color: #3D2B3D;
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: 14px;
          color: #7A5C7A;
          opacity: 0.8;
        }

        .google-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #3D2B3D;
          cursor: pointer;
          margin-bottom: 30px;
          transition: all 0.2s;
        }

        .google-btn img {
          width: 18px;
          height: 18px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 30px;
        }

        .line {
          flex: 1;
          height: 1px;
          background: rgba(61, 43, 61, 0.1);
        }

        .divider span {
          font-size: 13px;
          color: #7A5C7A;
          opacity: 0.6;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-field {
          width: 100%;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          border-radius: 16px;
          padding: 18px 20px;
          font-size: 15px;
          color: #3D2B3D;
          outline: none;
          transition: all 0.2s;
        }

        .input-field::placeholder {
          color: rgba(122, 92, 122, 0.5);
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #F1A7A7 0%, #CBBED9 100%);
          border: none;
          border-radius: 16px;
          padding: 18px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 4px 15px rgba(232, 160, 160, 0.2);
          transition: all 0.2s;
        }

        .submit-btn:hover {
          filter: brightness(1.05);
        }

        .error-text {
          margin-top: 15px;
          color: #B06060;
          font-size: 13px;
        }

        .footer {
          margin-top: 30px;
          font-size: 14px;
          color: #7A5C7A;
          opacity: 0.8;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #F1A7A7;
          font-weight: 700;
          cursor: pointer;
          margin-left: 5px;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
