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
import { Heart, Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';

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
      {/* Decorative Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <Heart className="logo-heart" fill="#E8A0A0" />
            <Sparkles className="logo-sparkle" />
          </div>
          <h1 className="auth-title">
            {mode === 'signin' ? 'Welcome Back' : 'Create Space'}
          </h1>
          <p className="auth-sub">
            {mode === 'signin' 
              ? 'Your shared world is waiting for you.' 
              : 'Begin a private journey for just the two of you.'}
          </p>
        </div>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" alt="Google" className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <div className="divider">
          <span>or use email</span>
        </div>

        <form className="form-container" onSubmit={handleEmailAuth}>
          {mode === 'signup' && (
            <div className="input-wrap">
              <User className="input-icon" size={18} />
              <input
                type="text"
                placeholder="Your name"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="input-wrap">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              placeholder="Email address"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-wrap">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Please wait...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {mode === 'signin' ? 'Enter Space' : 'Create Account'}
                <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        {error && (
          <div className="error-box">
            <p className="error-msg">{error}</p>
          </div>
        )}

        <div className="auth-footer">
          <p className="toggle-text">
            {mode === 'signin' ? "New here?" : "Already paired?"}
            <button className="toggle-link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Create an account' : 'Sign in to your space'}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #FFF8F2;
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.5;
        }

        .orb-1 { width: 400px; height: 400px; background: #FAD0DC; top: -100px; left: -100px; animation: float 20s infinite alternate; }
        .orb-2 { width: 350px; height: 350px; background: #EDD5F0; bottom: -50px; right: -50px; animation: float 25s infinite alternate-reverse; }
        .orb-3 { width: 300px; height: 300px; background: #D8E8F8; top: 40%; left: 60%; animation: float 18s infinite alternate; }

        @keyframes float {
          from { transform: translate(0, 0); }
          to { transform: translate(40px, 60px); }
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 48px 32px;
          border-radius: 40px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow: 0 24px 60px rgba(61, 43, 61, 0.08);
          z-index: 10;
          animation: cardIn 1s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .auth-header { text-align: center; margin-bottom: 40px; }

        .logo-container {
          position: relative;
          display: inline-block;
          margin-bottom: 16px;
        }

        .logo-heart { width: 48px; height: 48px; filter: drop-shadow(0 4px 8px rgba(232, 160, 160, 0.3)); }
        
        .logo-sparkle {
          position: absolute;
          top: -8px;
          right: -8px;
          color: #FFD700;
          width: 20px;
          height: 20px;
          animation: sparkle 2s infinite;
        }

        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(45deg); opacity: 0.7; }
        }

        .auth-title {
          font-family: var(--font-cormorant), serif;
          font-size: 36px;
          font-weight: 600;
          color: #3D2B3D;
          margin-bottom: 8px;
        }

        .auth-sub { font-size: 14px; color: #7A5C7A; opacity: 0.7; line-height: 1.5; }

        .form-container { display: flex; flex-direction: column; gap: 14px; }

        .input-wrap { position: relative; }
        .input-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: #C0A0B0; transition: color 0.3s; }

        .input-field {
          width: 100%;
          padding: 16px 16px 16px 48px;
          border-radius: 18px;
          border: 1px solid rgba(232, 160, 160, 0.15);
          background: rgba(255, 255, 255, 0.6);
          font-size: 15px;
          color: #3D2B3D;
          transition: all 0.3s;
          outline: none;
        }

        .input-field:focus {
          border-color: #E8A0A0;
          background: white;
          box-shadow: 0 8px 24px rgba(232, 160, 160, 0.1);
        }

        .input-field:focus + .input-icon { color: #E8A0A0; }

        .btn-primary {
          width: 100%;
          padding: 18px;
          border-radius: 20px;
          background: linear-gradient(135deg, #FF9FB2 0%, #D4A9FF 100%);
          color: white;
          border: none;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 12px 28px rgba(255, 159, 178, 0.3);
          transition: all 0.3s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px rgba(255, 159, 178, 0.4);
        }

        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .btn-google {
          width: 100%;
          padding: 14px;
          border-radius: 20px;
          background: white;
          border: 1px solid rgba(61, 43, 61, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #3D2B3D;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 8px;
        }

        .btn-google:hover { background: #FAF9F9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
          color: #C0A0B0;
          font-size: 12px;
          font-weight: 500;
        }

        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: rgba(232, 160, 160, 0.2); }

        .error-box {
          margin-top: 20px;
          padding: 12px;
          background: rgba(176, 96, 96, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(176, 96, 96, 0.1);
        }

        .error-msg { color: #B06060; font-size: 13px; font-weight: 500; text-align: center; }

        .auth-footer { margin-top: 32px; text-align: center; }
        .toggle-text { font-size: 14px; color: #7A5C7A; }
        .toggle-link {
          background: none;
          border: none;
          color: #E8A0A0;
          font-weight: 700;
          cursor: pointer;
          margin-left: 6px;
          padding: 0;
        }
        .toggle-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
