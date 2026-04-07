'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace('/auth');
      } else {
        setUser(currentUser);
        // Fetch from Firestore to get custom name, otherwise use Auth name
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().displayName) {
            setDisplayName(userDoc.data().displayName);
          } else {
            setDisplayName(currentUser.displayName || '');
          }
        } catch (err) {
          console.error("Error fetching user document:", err);
          setDisplayName(currentUser.displayName || '');
        }
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, { displayName: displayName.trim() });
      
      // 2. Update Firestore Document
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim()
      }, { merge: true });

      showToast('Profile updated successfully ✨');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading profile... 🌸</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sched-header">
        <Link href="/" className="back-btn">← Back</Link>
        <p className="home-label">Your account</p>
        <h1 className="home-title" style={{ fontSize: '28px' }}>
          Profile <span>⚙️</span>
        </h1>
      </div>

      <form className="form-body" onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            className="form-input"
            type="text"
            placeholder="What should your partner call you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {error && <p style={{ color: '#c0706a', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

        <button
          type="submit"
          className="btn-send"
          disabled={saving}
          style={{ marginTop: 'auto' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      <BottomNav activeTab="inbox" />
    </div>
  );
}
