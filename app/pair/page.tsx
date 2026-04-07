'use client';
// app/pair/page.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function PairPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [myCode, setMyCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [tab, setTab] = useState<'show' | 'enter'>('show');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      setUid(user.uid);
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.partnerId) { router.replace('/inbox'); return; }
        setMyCode(data.inviteCode || '');
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const handlePair = async () => {
    if (!partnerCode.trim()) { setError('Please enter a code'); return; }
    const code = partnerCode.trim().toUpperCase();
    if (code === myCode) { setError("That's your own code 😄"); return; }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      // Find user with this invite code
      const q = query(collection(db, 'users'), where('inviteCode', '==', code));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Code not found. Double-check with your partner.');
        setLoading(false);
        return;
      }

      const partnerDoc = snap.docs[0];
      const partnerId = partnerDoc.id;
      const partnerData = partnerDoc.data();

      if (partnerData.partnerId && partnerData.partnerId !== uid) {
        setError('This person is already paired with someone else.');
        setLoading(false);
        return;
      }

      // Pair both users
      await updateDoc(doc(db, 'users', uid), { partnerId });
      await updateDoc(doc(db, 'users', partnerId), { partnerId: uid });

      setStatus('Paired! Taking you to your inbox 💌');
      setTimeout(() => router.replace('/inbox'), 1500);
    } catch (err: any) {
      console.error('Pair error:', err);
      // Show specific error for Firestore index issues
      if (err.code === 'failed-precondition' || (err.message && err.message.includes('index'))) {
        setError('Database index not ready. Please try again in a few seconds.');
      } else if (err.message && err.message.includes('permission-denied')) {
        setError('Permission denied. Make sure you are signed in.');
      } else {
        setError('Something went wrong. Try again.');
      }
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setStatus('Code copied!');
    setTimeout(() => setStatus(''), 2000);
  };

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        .pair-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #FAD0DC 0%, #EDD5F0 45%, #D5E2F8 100%);
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
        }

        .pair-card {
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(232,160,160,0.25);
          border-radius: 28px;
          padding: 44px 36px;
          width: 100%;
          max-width: 380px;
          box-shadow: 0 8px 48px rgba(200,160,200,0.15);
          animation: fadeUp 0.7s ease both;
        }

        .pair-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px;
          font-weight: 300;
          font-style: italic;
          color: #3D2B3D;
          text-align: center;
          margin-bottom: 6px;
        }
        .pair-sub {
          font-size: 12px;
          color: rgba(122,92,122,0.65);
          text-align: center;
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .pair-tabs {
          display: flex;
          gap: 0;
          background: rgba(240,234,245,0.6);
          border-radius: 100px;
          padding: 4px;
          margin-bottom: 32px;
        }
        .pair-tab {
          flex: 1;
          padding: 9px 0;
          border: none;
          border-radius: 100px;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: rgba(122,92,122,0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.04em;
        }
        .pair-tab.active {
          background: #fff;
          color: #3D2B3D;
          box-shadow: 0 2px 8px rgba(200,160,200,0.2);
        }

        /* Show code panel */
        .code-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .code-label {
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(122,92,122,0.55);
        }
        .code-box {
          font-family: 'Cormorant Garamond', serif;
          font-size: 44px;
          font-weight: 400;
          letter-spacing: 0.18em;
          color: #3D2B3D;
          background: rgba(247,232,238,0.5);
          border: 1px solid rgba(232,160,160,0.3);
          border-radius: 16px;
          padding: 16px 28px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: all;
        }
        .code-box:hover { background: rgba(247,232,238,0.8); }

        .code-hint {
          font-size: 12px;
          color: rgba(122,92,122,0.5);
          text-align: center;
          line-height: 1.6;
          max-width: 240px;
        }

        .btn-copy {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(232,160,160,0.5);
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #7A5C7A;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.04em;
        }
        .btn-copy:hover { background: rgba(232,160,160,0.1); }

        /* Enter code panel */
        .enter-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .enter-label {
          font-size: 12px;
          color: rgba(122,92,122,0.65);
          margin-bottom: 4px;
        }
        .code-input {
          width: 100%;
          padding: 16px 20px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(232,160,160,0.35);
          border-radius: 16px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: 0.2em;
          color: #3D2B3D;
          text-align: center;
          text-transform: uppercase;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .code-input::placeholder {
          color: rgba(122,92,122,0.25);
          letter-spacing: 0.15em;
          font-size: 22px;
        }
        .code-input:focus { border-color: #E8A0A0; }

        .btn-pair {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          border-radius: 100px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #fff;
          cursor: pointer;
          transition: all 0.25s ease;
          letter-spacing: 0.04em;
          box-shadow: 0 4px 16px rgba(232,160,160,0.35);
        }
        .btn-pair:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(232,160,160,0.5);
          transform: translateY(-1px);
        }
        .btn-pair:disabled { opacity: 0.6; cursor: not-allowed; }

        .pair-status {
          text-align: center;
          font-size: 13px;
          color: #7A9C7A;
          margin-top: 8px;
        }
        .pair-error {
          text-align: center;
          font-size: 12px;
          color: #c0706a;
          margin-top: 8px;
        }

        .pair-back {
          position: absolute;
          top: 28px;
          left: 24px;
          font-size: 13px;
          color: rgba(122,92,122,0.7);
          text-decoration: none;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <a href="/inbox" className="pair-back">← Back</a>

      <div className="pair-root">
        <div className="pair-card">
          <h1 className="pair-title">Connect with<br />your person 💌</h1>
          <p className="pair-sub">Share your code or enter theirs to pair your accounts</p>

          <div className="pair-tabs">
            <button className={`pair-tab ${tab === 'show' ? 'active' : ''}`} onClick={() => setTab('show')}>
              My code
            </button>
            <button className={`pair-tab ${tab === 'enter' ? 'active' : ''}`} onClick={() => setTab('enter')}>
              Enter code
            </button>
          </div>

          {tab === 'show' ? (
            <div className="code-display">
              <span className="code-label">Your invite code</span>
              <div className="code-box" onClick={copyCode}>{myCode}</div>
              <p className="code-hint">Share this with your partner so they can connect with you</p>
              <button className="btn-copy" onClick={copyCode}>Copy code</button>
              {status && <p className="pair-status">{status}</p>}
            </div>
          ) : (
            <div className="enter-panel">
              <p className="enter-label">Enter your partner's code</p>
              <input
                className="code-input"
                type="text"
                maxLength={6}
                placeholder="A3X9K2"
                value={partnerCode}
                onChange={e => { setPartnerCode(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePair()}
              />
              <button className="btn-pair" onClick={handlePair} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Connect 💛'}
              </button>
              {error && <p className="pair-error">{error}</p>}
              {status && <p className="pair-status">{status}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
