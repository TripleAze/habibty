'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { uploadMedia } from '@/lib/imagekit';
import { unpairPartner } from '@/lib/pair';
import BottomNav from '@/components/BottomNav';

function SkeletonRow() {
  return (
    <div style={{
      height: 16, borderRadius: 8,
      background: 'linear-gradient(90deg, rgba(232,160,160,0.12) 25%, rgba(232,160,160,0.22) 50%, rgba(232,160,160,0.12) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      marginBottom: 8,
    }} />
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editName, setEditName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerId, setPartnerId] = useState('');

  const [isEditingName, setIsEditingName] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [checking, setChecking] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [unpairing, setUnpairing] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/auth'); return; }
      setUid(user.uid);
      setEmail(user.email || '');
      if (!hasLoadedRef.current) {
        setDisplayName(user.displayName || '');
        setPhotoURL(user.photoURL || '');
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setInviteCode(d.inviteCode || '');
          if (!hasLoadedRef.current) {
            if (d.displayName) setDisplayName(d.displayName);
            if (d.photoURL) setPhotoURL(d.photoURL);
            hasLoadedRef.current = true;
          }
          if (d.partnerId) {
            setPartnerId(d.partnerId);
            const ps = await getDoc(doc(db, 'users', d.partnerId));
            if (ps.exists()) setPartnerName(ps.data().displayName || 'your partner');
          } else {
            setPartnerId(''); setPartnerName('');
          }
        } else { hasLoadedRef.current = true; }
      } catch (err) { console.error(err); }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleSaveName = async () => {
    if (!auth?.currentUser || !editName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editName.trim() });
      await setDoc(doc(db, 'users', auth.currentUser.uid), { displayName: editName.trim() }, { merge: true });
      setDisplayName(editName.trim());
      setIsEditingName(false);
      showToast('Name updated ✨');
    } catch { showToast('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth?.currentUser) return;
    setUploading(true);
    try {
      const res = await uploadMedia(file, `profile_${auth.currentUser.uid}`, 'little-letters');
      if (res.url) {
        const url = `${res.url}?tr=w-200,h-200,fo-auto&v=${Date.now()}`;
        await updateProfile(auth.currentUser, { photoURL: url });
        await setDoc(doc(db, 'users', auth.currentUser.uid), { photoURL: url }, { merge: true });
        setPhotoURL(url);
        showToast('Photo updated 📸');
      }
    } catch { showToast('Upload failed 😢'); }
    finally { setUploading(false); }
  };

  const handleUnpair = async () => {
    if (!auth?.currentUser || !partnerId) return;
    setUnpairing(true);
    try {
      const res = await unpairPartner(auth.currentUser.uid, partnerId);
      if (res.ok) {
        setPartnerId(''); setPartnerName(''); setShowUnpairConfirm(false);
        showToast('Unpaired 💔');
      } else showToast(res.error || 'Failed to unpair');
    } catch { showToast('Something went wrong'); }
    finally { setUnpairing(false); }
  };

  const handleSignOut = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    router.replace('/');
  }, [router]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(inviteCode);
    showToast('Code copied 📋');
  }, [inviteCode, showToast]);

  // ── SKELETON ──────────────────────────────────────────
  if (checking) return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="app-container">
        <div style={{ padding: '52px 24px 20px' }}>
          <div style={{ height: 10, width: 60, borderRadius: 6, background: 'rgba(232,160,160,0.2)', marginBottom: 10 }} />
          <div style={{ height: 28, width: 160, borderRadius: 8, background: 'rgba(232,160,160,0.15)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(232,160,160,0.15)' }} />
        </div>
        <div style={{ padding: '0 20px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: '16px 20px', marginBottom: 10 }}>
              <SkeletonRow />
              <div style={{ height: 12, width: '60%', borderRadius: 6, background: 'rgba(232,160,160,0.1)' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pf-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(255,255,255,0.68);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.8);
          margin-bottom: 8px;
        }
        .pf-row-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .pf-row-lbl { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(122,92,122,0.5); font-weight: 500; }
        .pf-row-val { font-size: 15px; color: #3D2B3D; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .pf-row-action { font-size: 12px; font-weight: 500; color: #E8A0A0; cursor: pointer; background: none; border: none; padding: 4px 10px; border-radius: 100px; background: rgba(232,160,160,0.12); flex-shrink: 0; font-family: 'DM Sans', sans-serif; transition: background 0.2s; }
        .pf-row-action:hover { background: rgba(232,160,160,0.22); }
        .pf-row-action.danger { color: #B06060; background: rgba(176,96,96,0.08); }
        .pf-row-action.danger:hover { background: rgba(176,96,96,0.15); }

        .pf-edit-panel {
          margin-bottom: 8px;
          animation: slideDown 0.2s ease;
        }
        .pf-edit-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.8);
          border-radius: 16px;
          border: 1.5px solid rgba(232,160,160,0.3);
        }
        .pf-edit-input {
          flex: 1;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #3D2B3D;
          outline: none;
        }
        .pf-save-btn {
          padding: 8px 16px;
          border-radius: 100px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none;
          color: white;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .pf-save-btn:disabled { opacity: 0.6; }
        .pf-cancel-btn {
          padding: 8px 12px;
          border-radius: 100px;
          background: transparent;
          border: none;
          color: rgba(122,92,122,0.6);
          font-size: 12px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }

        .pf-code-panel {
          margin-bottom: 8px;
          animation: slideDown 0.2s ease;
        }
        .pf-code-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(247,232,238,0.5);
          border-radius: 14px;
          border: 1px solid rgba(232,160,160,0.25);
        }
        .pf-code-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          letter-spacing: 0.18em;
          color: #3D2B3D;
          flex: 1;
        }
        .pf-code-copy {
          padding: 6px 14px;
          border-radius: 100px;
          background: rgba(232,160,160,0.15);
          border: 1px solid rgba(232,160,160,0.3);
          font-size: 11px;
          color: #B06060;
          cursor: pointer;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
        }
        .pf-hint { font-size: 10px; color: rgba(122,92,122,0.4); margin: 4px 0 0 4px; font-style: italic; font-family: 'Cormorant Garamond', serif; }

        .pf-section-gap { height: 8px; }
        .pf-section-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(122,92,122,0.4); font-weight: 500; padding: 0 4px; margin-bottom: 6px; }

        .pf-signout {
          width: 100%;
          padding: 14px;
          border-radius: 100px;
          background: transparent;
          border: 1.5px solid rgba(232,160,160,0.3);
          color: #B06060;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          margin-top: 4px;
        }
        .pf-signout:hover { background: rgba(232,160,160,0.06); }

        .pf-confirm-row { display: flex; gap: 8px; margin-top: 8px; }
        .pf-confirm-yes { flex: 1; padding: 12px; border-radius: 100px; background: rgba(176,96,96,0.1); border: 1px solid rgba(176,96,96,0.25); color: #B06060; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .pf-confirm-no  { flex: 1; padding: 12px; border-radius: 100px; background: rgba(255,255,255,0.6); border: 1px solid rgba(201,184,216,0.3); color: #7A5C7A; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }

        .avatar-wrap { position: relative; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; overflow: hidden; border: 2.5px solid white; box-shadow: 0 4px 16px rgba(232,160,160,0.25); }
        .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .avatar-fb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#F2C4CE,#C9B8D8); font-family: 'Cormorant Garamond',serif; font-size: 28px; color: #3D2B3D; }
        .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .avatar-wrap:hover .avatar-overlay { opacity: 1; }
        .avatar-overlay span { font-size: 10px; color: white; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; font-family: 'DM Sans', sans-serif; }
        .avatar-uploading { opacity: 1 !important; background: rgba(0,0,0,0.5) !important; }
      `}</style>

      <div className="app-container">
        <div className="home-header">
          <div className="home-header-left">
            <p className="home-label">Settings</p>
            <h1 className="home-title">Your <em>profile</em></h1>
          </div>
        </div>

        <div style={{ padding: '0 20px 100px' }}>

          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 24px' }}>
            <div className="avatar-wrap" onClick={() => fileInputRef.current?.click()}>
              {photoURL
                ? <img src={photoURL} className="avatar-img" alt="avatar" referrerPolicy="no-referrer" />
                : <div className="avatar-fb">{displayName?.[0]?.toUpperCase() || 'H'}</div>}
              <div className={`avatar-overlay ${uploading ? 'avatar-uploading' : ''}`}>
                <span>{uploading ? 'Uploading…' : 'Edit'}</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
          </div>

          {/* Name */}
          <div className="pf-section-label">Account</div>

          {isEditingName ? (
            <div className="pf-edit-panel">
              <div className="pf-edit-row">
                <input
                  className="pf-edit-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  placeholder="Display name"
                  autoFocus
                />
                <button className="pf-cancel-btn" onClick={() => setIsEditingName(false)}>Cancel</button>
                <button className="pf-save-btn" onClick={handleSaveName} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pf-row">
              <div className="pf-row-left">
                <span className="pf-row-lbl">Display name</span>
                <span className="pf-row-val">{displayName || '—'}</span>
              </div>
              <button className="pf-row-action" onClick={() => { setEditName(displayName); setIsEditingName(true); }}>Edit</button>
            </div>
          )}

          <div className="pf-row">
            <div className="pf-row-left">
              <span className="pf-row-lbl">Email</span>
              <span className="pf-row-val" style={{ fontSize: 13, opacity: 0.7 }}>{email}</span>
            </div>
          </div>

          <div className="pf-section-gap" />

          {/* Partner */}
          <div className="pf-section-label">Partner</div>

          <div className="pf-row">
            <div className="pf-row-left">
              <span className="pf-row-lbl">Paired with</span>
              <span className="pf-row-val">{partnerName || 'No partner yet'}</span>
            </div>
            {partnerName
              ? <button className="pf-row-action danger" onClick={() => setShowUnpairConfirm(true)}>Unpair</button>
              : <Link href="/pair" className="pf-row-action" style={{ textDecoration: 'none' }}>Pair now</Link>}
          </div>

          {showUnpairConfirm && (
            <div style={{ animation: 'slideDown 0.2s ease', marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.7)', textAlign: 'center', marginBottom: 6 }}>
                This will disconnect you from {partnerName}. Are you sure?
              </p>
              <div className="pf-confirm-row">
                <button className="pf-confirm-yes" onClick={handleUnpair} disabled={unpairing}>
                  {unpairing ? 'Unpairing…' : 'Yes, unpair'}
                </button>
                <button className="pf-confirm-no" onClick={() => setShowUnpairConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Invite code */}
          <div className="pf-row" style={{ cursor: 'pointer' }} onClick={() => setShowInviteCode(p => !p)}>
            <div className="pf-row-left">
              <span className="pf-row-lbl">Invite code</span>
              <span className="pf-row-val" style={{ fontSize: 13 }}>
                {showInviteCode ? inviteCode : '• • • • • •'}
              </span>
            </div>
            <button className="pf-row-action">{showInviteCode ? 'Hide' : 'Show'}</button>
          </div>

          {showInviteCode && (
            <div className="pf-code-panel">
              <div className="pf-code-inner">
                <span className="pf-code-val">{inviteCode}</span>
                <button className="pf-code-copy" onClick={copyCode}>Copy</button>
              </div>
              <p className="pf-hint">Share this with your partner to connect</p>
            </div>
          )}

          <div className="pf-section-gap" />

          {/* Sign out */}
          <div className="pf-section-label">Account</div>

          {!showSignOutConfirm ? (
            <button className="pf-signout" onClick={() => setShowSignOutConfirm(true)}>Sign out</button>
          ) : (
            <div style={{ animation: 'slideDown 0.2s ease' }}>
              <p style={{ fontSize: 13, color: '#7A5C7A', textAlign: 'center', marginBottom: 8 }}>
                Sign out of habibty?
              </p>
              <div className="pf-confirm-row">
                <button className="pf-confirm-yes" onClick={handleSignOut}>Sign out</button>
                <button className="pf-confirm-no" onClick={() => setShowSignOutConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}

        </div>

        {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}
        <BottomNav activeTab="profile" />
      </div>
    </>
  );
}