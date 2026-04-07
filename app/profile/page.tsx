'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { upload as ikUpload } from '@imagekit/javascript';
import { auth, db } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [checking, setChecking] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }
      
      setEmail(user.email || '');
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setInviteCode(data.inviteCode || '');
        if (data.displayName) setDisplayName(data.displayName);
        if (data.photoURL) setPhotoURL(data.photoURL);

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleSave = async () => {
    if (!auth?.currentUser) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL
      });

      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: displayName.trim(),
        photoURL: photoURL
      }, { merge: true });

      showToast('Profile updated! ✨');
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save changes 😢');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.currentUser) return;

    setUploading(true);
    try {
      // 1. Get Auth Signature from our API
      const authResponse = await fetch('/api/imagekit-auth');
      const authData = await authResponse.json();

      if (authData.error) throw new Error(authData.error);

      // 2. Perform Upload using v5 SDK
      const response = await ikUpload({
        file,
        fileName: `profile_${auth.currentUser.uid}`,
        folder: '/profiles',
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
        signature: authData.signature,
        token: authData.token,
        expire: authData.expire,
      });
      
      setPhotoURL(response.url);
      showToast('Photo uploaded! 📸');
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Upload failed 😢');
    } finally {
      setUploading(false);
    }
  };

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
    showToast('Code copied! 📋');
  }, [inviteCode, showToast]);

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
        <p className="home-label">Settings</p>
        <h1 className="home-title">Your Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-avatar-section">
          <div className="avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
            {photoURL ? (
              <img src={photoURL} alt="Avatar" className="profile-img" />
            ) : (
              <div className="avatar-placeholder">
                <span>{displayName?.charAt(0) || 'H'}</span>
              </div>
            )}
            <div className="avatar-edit-overlay">
              <span>{uploading ? '...' : 'Edit'}</span>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            accept="image/*"
          />
        </div>

        <div className="profile-card">
          <div className="profile-section">
            <label className="profile-label">What should your partner call you?</label>
            <input 
              type="text"
              className="profile-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
            <button 
              className="btn-save" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-section">
            <span className="profile-label">Partner connection</span>
            <div className="partner-status">
              <span className="profile-value">
                {partnerName ? `Paired with ${partnerName} 💖` : 'Searching for love...'}
              </span>
              {!partnerName && (
                <Link href="/pair" className="profile-action">
                  Pair now →
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-section">
            <span className="profile-label">Your invite code</span>
            <div className="code-display">
              <span className="code-text">{inviteCode || '---'}</span>
              <button className="code-copy" onClick={copyCode} type="button">
                Copy
              </button>
            </div>
            <span className="profile-hint">Tap code to copy and send to your partner</span>
          </div>
        </div>

        <div className="profile-card transparent">
          <div className="profile-section">
            <span className="profile-label">Account email</span>
            <span className="profile-value small">{email}</span>
          </div>
        </div>

        <div className="profile-card logout-card">
          <div className="profile-section">
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
                <p>Are you sure you want to sign out?</p>
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
      </div>

      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      <BottomNav activeTab="profile" />

      <style>{`
        .profile-content {
          padding: 0 20px 100px;
        }
        
        .profile-avatar-section {
          display: flex;
          justify-content: center;
          margin: 10px 0 30px;
        }
        
        .avatar-wrapper {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 8px 24px rgba(232, 160, 160, 0.2);
          border: 3px solid #fff;
        }
        
        .profile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%);
          font-size: 32px;
          color: #fff;
          font-weight: bold;
        }
        
        .avatar-edit-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 30%;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          backdrop-filter: blur(4px);
        }

        .profile-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 24px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          margin-bottom: 20px;
        }
        
        .profile-card.transparent {
          background: transparent;
          border: none;
          padding: 10px 24px;
        }

        .profile-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .profile-label {
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7A5C7A;
          font-weight: 600;
          opacity: 0.6;
        }

        .profile-input {
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(232, 160, 160, 0.2);
          border-radius: 14px;
          padding: 14px 18px;
          font-size: 16px;
          color: #3D2B3D;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .profile-input:focus {
          border-color: #E8A0A0;
        }

        .btn-save {
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(232, 160, 160, 0.3);
        }
        
        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(232, 160, 160, 0.4);
        }
        
        .btn-save:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .profile-value {
          font-size: 16px;
          color: #3D2B3D;
          font-weight: 500;
        }
        
        .profile-value.small {
          font-size: 14px;
          opacity: 0.8;
        }

        .partner-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .code-display {
          display: flex;
          align-items: center;
          gap: 12px;
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
          padding: 10px 18px;
          background: rgba(232, 160, 160, 0.1);
          border: 1px solid rgba(232, 160, 160, 0.2);
          border-radius: 12px;
          font-size: 13px;
          color: #7A5C7A;
          cursor: pointer;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
        }

        .btn-signout {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1.5px solid rgba(232, 160, 160, 0.3);
          border-radius: 16px;
          color: #B06060;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-signout:hover {
          background: rgba(232, 160, 160, 0.05);
          border-color: rgba(232, 160, 160, 0.5);
        }

        .signout-confirm p {
          font-size: 14px;
          color: #3D2B3D;
          text-align: center;
          margin-bottom: 16px;
        }
        .signout-actions {
          display: flex;
          gap: 12px;
        }
        .btn-cancel, .btn-confirm {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-cancel {
          background: #eee;
          border: none;
          color: #666;
        }
        .btn-confirm {
          background: #FAD0DC;
          border: none;
          color: #B06060;
        }

        .toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 14px;
          opacity: 0;
          transition: all 0.3s;
          pointer-events: none;
          z-index: 1000;
        }
        .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </div>
  );
}
