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

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
      await createUserDocIfNeeded(result.user);
    } catch (err: any) {
      setError(err.message?.includes('popup-closed') ? '' : 'Google sign-in failed');
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
    if (typeof window !== "undefined") sessionStorage.setItem("trigger_burst", "true");
  };

  if (checking) return null;

  return (
    <div className="auth-root">
      <style jsx>{`
        .auth-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #FAD0DC 0%, #EDD5F0 55%, #D8E8F8 100%);
          padding: 24px;
          font-family: var(--font-dm-sans), sans-serif;
          position: relative;
        }

        .auth-card {
          width: 100%;
          max-width: 400px;
          text-align: center;
          animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-title {
          font-family: var(--font-cormorant), serif;
          font-size: 38px;
          color: #3D2B3D;
          margin-bottom: 8px;
        }

        .auth-sub {
          font-size: 15px;
          color: #7A5C7A;
          opacity: 0.8;
          margin-bottom: 40px;
        }

        .form-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .input-field {
          width: 100%;
          padding: 18px 24px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
          color: #3D2B3D;
        }

        .input-field:focus {
          border-color: #E8A0A0;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 20px rgba(232, 160, 160, 0.1);
        }

        .btn-primary {
          width: 100%;
          padding: 18px;
          border-radius: 100px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          color: white;
          border: none;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          margin-top: 10px;
          box-shadow: 0 10px 25px rgba(232, 160, 160, 0.3);
          transition: all 0.3s ease;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(232, 160, 160, 0.4);
        }

        .btn-google {
          width: 100%;
          padding: 16px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #3D2B3D;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 24px;
        }

        .btn-google:hover {
          background: white;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 15px;
          margin: 24px 0;
          color: #7A5C7A;
          font-size: 13px;
          opacity: 0.5;
        }

        .divider::before, .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: currentColor;
        }

        .toggle-text {
          margin-top: 24px;
          font-size: 14px;
          color: #7A5C7A;
        }

        .toggle-link {
          color: #E8A0A0;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          margin-left: 5px;
        }

        .error-msg {
          margin-top: 15px;
          color: #B06060;
          font-size: 13px;
          font-weight: 500;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-dots:after {
          content: ' .';
          animation: dots 1s steps(5, end) infinite;
        }
        @keyframes dots {
          0%, 20% { color: rgba(0,0,0,0); text-shadow: .5em 0 0 rgba(0,0,0,0), 1em 0 0 rgba(0,0,0,0); }
          40% { color: white; text-shadow: .5em 0 0 rgba(0,0,0,0), 1em 0 0 rgba(0,0,0,0); }
          60% { text-shadow: .5em 0 0 white, 1em 0 0 rgba(0,0,0,0); }
          80%, 100% { text-shadow: .5em 0 0 white, 1em 0 0 white; }
        }
      `}</style>

      <div className="auth-card">
        <h1 className="auth-title">{mode === 'signin' ? 'Welcome Back' : 'Join Habibty'}</h1>
        <p className="auth-sub">
          {mode === 'signin' ? 'Your love story continues here' : 'Start your private space for two'}
        </p>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="divider">or</div>

        <form className="form-container" onSubmit={handleEmailAuth}>
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

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="loading-dots">Please wait</span> : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {error && <p className="error-msg">{error}</p>}

        <p className="toggle-text">
          {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
          <span className="toggle-link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}
