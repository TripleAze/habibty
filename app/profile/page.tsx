'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  or, 
  and 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { uploadMedia } from '@/lib/imagekit';
import { unpairPartner } from '@/lib/pair';
import BottomNav from '@/components/BottomNav';
import { useHeader } from '@/lib/HeaderContext';

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
  useHeader({ hide: true });
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
  const [messageCount, setMessageCount] = useState(0);
  const [gameCount, setGameCount] = useState(0);
  const [pairedAt, setPairedAt] = useState<number | null>(null);
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
            setPairedAt(d.pairedAt || null);
            const ps = await getDoc(doc(db, 'users', d.partnerId));
            if (ps.exists()) setPartnerName(ps.data().displayName || 'your partner');

            // Fetch Stats
            const { collection, query, where, getCountFromServer, or, and } = await import('firebase/firestore');
            
            // Message Count
            const msgQ = query(
              collection(db, 'messages'),
              or(
                and(where('senderId', '==', user.uid), where('receiverId', '==', d.partnerId)),
                and(where('senderId', '==', d.partnerId), where('receiverId', '==', user.uid))
              )
            );
            const msgCountSnap = await getCountFromServer(msgQ);
            setMessageCount(msgCountSnap.data().count);

            // Game Count
            const gameQ = query(
              collection(db, 'games'),
              where('players', 'array-contains', user.uid)
            );
            // We fetch and filter in JS if complex, but simple version:
            const gameSnap = await getDocs(gameQ);
            const sharedGames = gameSnap.docs.filter((doc: any) => doc.data().players?.includes(d.partnerId)).length;
            setGameCount(sharedGames);

          } else {
            setPartnerId(''); setPartnerName(''); setPairedAt(null);
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
    <div className="app-container">
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Settings</p>
          <h1 className="home-title">Your <em>profile</em></h1>
        </div>
      </div>

      <div className="profile-section">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-10 animation-fade-in">
          <div 
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-[#E8A0A0] to-[#C9B8D8] shadow-lg transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-white relative">
                {photoURL ? (
                  <Image src={photoURL} fill className="object-cover" alt="avatar" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-3xl font-serif">
                    {displayName?.[0]?.toUpperCase() || 'H'}
                  </div>
                )}
              </div>
            </div>
            <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${uploading ? 'opacity-100' : ''}`}>
              <span className="text-white text-xs font-medium tracking-widest uppercase">
                {uploading ? 'Uploading...' : 'Change'}
              </span>
            </div>
            {/* Edit Icon Badge */}
            <div className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md border border-gray-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#E8A0A0]">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

        {/* Account Group */}
        <div className="profile-card-group">
          <div className="pf-section-label px-1">Account Info</div>
          <div className="profile-card">
            {isEditingName ? (
              <div className="p-4 bg-white/40 animate-slide-down">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white/60 border border-[#E8A0A0]/30 rounded-xl px-4 py-2 outline-none focus:border-[#E8A0A0] transition-colors font-medium text-sm"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    placeholder="Display name"
                    autoFocus
                  />
                  <button type="button" className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700" onClick={() => setIsEditingName(false)}>Cancel</button>
                  <button 
                    type="button" 
                    className="px-6 py-2 rounded-full bg-gradient-to-r from-[#E8A0A0] to-[#C9B8D8] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50" 
                    onClick={handleSaveName} 
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save ✨'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-row">
                <div className="profile-row-content">
                  <span className="profile-row-label">Your Name</span>
                  <span className="profile-row-value">{displayName || 'Anonymous Player'}</span>
                </div>
                <button className="text-xs font-bold text-[#E8A0A0] px-4 py-2 rounded-full bg-[#E8A0A0]/10 hover:bg-[#E8A0A0]/20 transition-colors" onClick={() => { setEditName(displayName); setIsEditingName(true); }}>Edit</button>
              </div>
            )}
            <div className="profile-row">
              <div className="profile-row-content">
                <span className="profile-row-label">Email Address</span>
                <span className="profile-row-value text-gray-400 font-normal">{email}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          </div>
        </div>

        {/* Partnership Group */}
        <div className="profile-card-group" style={{ animationDelay: '0.1s' }}>
          <div className="pf-section-label px-1">Partnership</div>
          <div className="profile-card">
            <div className="profile-row">
              <div className="profile-row-content">
                <span className="profile-row-label">Paired With</span>
                <span className="profile-row-value">{partnerName || 'Waiting for love...'}</span>
              </div>
              {partnerName ? (
                <button className="text-xs font-bold text-red-400 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 transition-colors" onClick={() => setShowUnpairConfirm(true)}>Unpair</button>
              ) : (
                <Link href="/pair" className="text-xs font-bold text-[#E8A0A0] px-4 py-2 rounded-full bg-[#E8A0A0]/10 hover:bg-[#E8A0A0]/20 transition-all">Pair Now</Link>
              )}
            </div>
            
            {showUnpairConfirm && (
              <div className="p-6 bg-red-50/50 border-y border-red-100 animate-slide-down">
                <p className="text-xs text-red-900/60 text-center mb-4 leading-relaxed">
                  Are you sure you want to disconnect from <strong>{partnerName}</strong>? <br/>This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-xl bg-red-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform disabled:opacity-50" onClick={handleUnpair} disabled={unpairing}>
                    {unpairing ? 'Disconnecting...' : 'Yes, Unpair'}
                  </button>
                  <button className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-500 text-xs font-medium active:scale-95 transition-transform" onClick={() => setShowUnpairConfirm(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="profile-row cursor-pointer" onClick={() => setShowInviteCode(p => !p)}>
              <div className="profile-row-content">
                <span className="profile-row-label">Invite Code</span>
                <span className="profile-row-value font-mono tracking-wider">
                  {showInviteCode ? inviteCode : '••••••'}
                </span>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1.5 rounded-lg border border-gray-100">{showInviteCode ? 'Hide' : 'Show'}</button>
            </div>

            {showInviteCode && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 animate-slide-down">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <span className="flex-1 font-serif text-2xl tracking-[0.2em] text-center">{inviteCode}</span>
                  <button className="px-4 py-2 rounded-lg bg-[#E8A0A0]/10 text-[#E8A0A0] text-xs font-bold hover:bg-[#E8A0A0]/20 transition-colors" onClick={copyCode}>Copy</button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-3 italic font-serif">Share this code with your partner to connect your souls</p>
              </div>
            )}
          </div>
        </div>

        {/* Relationship Stats */}
        {partnerId && (
          <div className="profile-card-group" style={{ animationDelay: '0.15s' }}>
            <div className="pf-section-label px-1">Our Journey</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-[#E8A0A0]/20 flex flex-col items-center justify-center">
                <span className="text-2xl font-serif text-[#3D2B3D]">{messageCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 font-medium">Letters Sent</span>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-[#C9B8D8]/20 flex flex-col items-center justify-center">
                <span className="text-2xl font-serif text-[#3D2B3D]">{gameCount}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1 font-medium">Games Played</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#FAD0DC]/30 to-[#EDD5F0]/30 rounded-2xl p-5 border border-white/40 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center text-xl shadow-sm">
                  🗓️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#3D2B3D]">
                    {pairedAt ? `${Math.floor((Date.now() - pairedAt) / (1000 * 60 * 60 * 24))} Days Together` : 'Starting Our Journey'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {pairedAt ? `Connected since ${new Date(pairedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Your future awaits...'}
                  </p>
                </div>
              </div>
            </div>

            <Link href="/moments" className="block w-full py-3 rounded-2xl bg-white border border-[#E8A0A0]/20 text-center shadow-sm hover:shadow-md transition-all mt-4 mb-8">
              <span className="text-sm font-bold text-[#E8A0A0]">View Our Memories ✨</span>
            </Link>
          </div>
        )}

        {/* Security & System */}
        <div className="profile-card-group" style={{ animationDelay: '0.2s' }}>
          <div className="pf-section-label px-1">System</div>
          <div className="profile-card">
            {!showSignOutConfirm ? (
              <button className="w-full flex items-center justify-center gap-2 p-5 text-red-400 hover:bg-red-50 transition-colors" onClick={() => setShowSignOutConfirm(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span className="text-sm font-semibold">Sign Out</span>
              </button>
            ) : (
              <div className="p-6 bg-gray-50/50 animate-slide-down">
                <p className="text-sm text-gray-500 text-center mb-4">Are you leaving us for now?</p>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform" onClick={handleSignOut}>Sign Out</button>
                  <button className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-400 text-xs font-medium active:scale-95 transition-transform" onClick={() => setShowSignOutConfirm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}
      <BottomNav activeTab="profile" />
    </div>
  );
}