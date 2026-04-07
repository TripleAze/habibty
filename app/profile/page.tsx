'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [checking, setChecking] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }
      setDisplayName(user.displayName || 'Your name');
      setEmail(user.email || '');

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setInviteCode(data.inviteCode || '');

        if (data.partnerId) {
          const partnerSnap = await getDoc(doc(db, 'users', data.partnerId));
          if (partnerSnap.exists()) {
            setPartnerName(partnerSnap.data().displayName || 'your partner');
          }
        }
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const handleSignOut = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.replace('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, [router]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(inviteCode);
  }, [inviteCode]);

  if (checking) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading profile... </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="home-header">
        <p className="home-label">Your profile</p>
        <h1 className="home-title">
          Hello, <span>{displayName}</span>
        </h1>
      </div>

      <div className="profile-content">
        {/* Partner Card */}
        <div className="profile-card">
          <div className="profile-section">
            <span className="profile-label">Connected with</span>
            <span className="profile-value">{partnerName || 'No one yet'}</span>
            {!partnerName && (
              <Link href="/pair" className="profile-action">
                Pair now →
              </Link>
            )}
          </div>
        </div>

        {/* Invite Code Card */}
        <div className="profile-card">
          <div className="profile-section">
            <span className="profile-label">Your invite code</span>
            <div className="code-display">
              <span className="code-text">{inviteCode || '---'}</span>
              <button className="code-copy" onClick={copyCode} type="button">
                Copy
              </button>
            </div>
            <span className="profile-hint">Share this with your partner</span>
          </div>
        </div>

        {/* Account Card */}
        <div className="profile-card">
          <div className="profile-section">
            <span className="profile-label">Account</span>
            <span className="profile-value">{email}</span>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="profile-card danger">
          <div className="profile-section">
            <span className="profile-label">Danger zone</span>
            {!showSignOutConfirm ? (
              <button
                className="btn-signout"
                onClick={() => setShowSignOutConfirm(true)}
                type="button"
              >
                Sign out
              </button>
            ) : (
              <div className="signout-confirm">
                <p>Are you sure?</p>
                <div className="signout-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowSignOutConfirm(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={handleSignOut}
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="profile-card">
          <div className="profile-section">
            <Link href="/" className="profile-action-link">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <BottomNav activeTab="profile" />

      <style>{`
        .profile-content {
          padding: 20px;
        }
        .profile-card {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          margin-bottom: 16px;
        }
        .profile-card.danger {
          border-color: rgba(232, 160, 160, 0.4);
        }
        .profile-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .profile-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(122, 92, 122, 0.55);
          font-weight: 500;
        }
        .profile-value {
          font-size: 15px;
          color: #3D2B3D;
          font-weight: 400;
        }
        .profile-action {
          font-size: 13px;
          color: #E8A0A0;
          text-decoration: none;
          font-weight: 500;
          margin-top: 4px;
        }
        .code-display {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }
        .code-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          letter-spacing: 0.1em;
          color: #3D2B3D;
          background: rgba(247, 232, 238, 0.5);
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid rgba(232, 160, 160, 0.2);
        }
        .code-copy {
          padding: 8px 16px;
          background: rgba(232, 160, 160, 0.15);
          border: 1px solid rgba(232, 160, 160, 0.3);
          border-radius: 10px;
          font-size: 12px;
          color: #7A5C7A;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
        }
        .code-copy:hover {
          background: rgba(232, 160, 160, 0.25);
        }
        .profile-hint {
          font-size: 11px;
          color: rgba(122, 92, 122, 0.5);
        }
        .btn-signout {
          padding: 12px 20px;
          background: transparent;
          border: 1.5px solid rgba(232, 160, 160, 0.4);
          border-radius: 12px;
          font-size: 13px;
          color: #B06060;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          margin-top: 8px;
        }
        .btn-signout:hover {
          background: rgba(232, 160, 160, 0.1);
        }
        .signout-confirm {
          margin-top: 8px;
        }
        .signout-confirm p {
          font-size: 13px;
          color: #3D2B3D;
          margin-bottom: 12px;
        }
        .signout-actions {
          display: flex;
          gap: 8px;
        }
        .btn-cancel {
          flex: 1;
          padding: 10px 16px;
          background: rgba(240, 234, 245, 0.6);
          border: 1px solid rgba(201, 184, 216, 0.3);
          border-radius: 10px;
          font-size: 13px;
          color: #7A5C7A;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: rgba(240, 234, 245, 0.8);
        }
        .btn-confirm {
          flex: 1;
          padding: 10px 16px;
          background: rgba(232, 160, 160, 0.2);
          border: 1.5px solid rgba(232, 160, 160, 0.4);
          border-radius: 10px;
          font-size: 13px;
          color: #B06060;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-confirm:hover {
          background: rgba(232, 160, 160, 0.3);
        }
        .profile-action-link {
          font-size: 13px;
          color: #7A5C7A;
          text-decoration: none;
          font-weight: 500;
        }
        .profile-action-link:hover {
          color: #3D2B3D;
        }
      `}</style>
    </div>
  );
}
