"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, AlertCircle, Loader2, Lock, Key } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, updatePassword, GoogleAuthProvider } from "firebase/auth";
import { uploadMedia } from "@/lib/imagekit";
import Image from "next/image";

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [accentColor, setAccentColor] = useState("rose");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const colors = [
    { id: "rose", bg: "bg-rose-400" },
    { id: "lavender", bg: "bg-lavender-400" },
    { id: "blue", bg: "bg-sky-400" },
    { id: "gold", bg: "bg-amber-400" },
  ];

  const isEmailUser = user?.providerData.some(p => p.providerId === 'password');

  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setName(data.displayName || "");
        setNickname(data.relationshipNickname || "");
        setAccentColor(data.accentColor || "rose");
      }
    };
    fetchUser();
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Upload to ImageKit
      const result = await uploadMedia(file, `profile_${user.uid}`, 'little-letters');
      const photoURL = result.url;

      // 2. Update Firestore
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });

      // 3. Update Auth Profile
      await updateProfile(user, { photoURL });

      showToast("Photo updated ✨");
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Update Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: name.trim(),
        relationshipNickname: nickname.trim(),
        accentColor,
      }, { merge: true });

      // 2. Update Auth Profile
      await updateProfile(user, {
        displayName: name.trim(),
      });

      setSaved(true);
      showToast("Profile updated ✨");
      setTimeout(() => {
        setSaved(false);
        router.push("/profile");
      }, 1500);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setError("Update failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="font-serif text-2xl font-bold text-gray-800">Edit Profile</h1>
        <div className="w-10" />
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-rose-100 to-lavender-100 border-4 border-white shadow-xl relative">
            {user?.photoURL ? (
              <Image 
                src={user.photoURL} 
                alt="Profile" 
                fill 
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-serif italic text-rose-300">
                {name[0] || user?.email?.[0] || "Y"}
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </div>
          
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
            <Camera className="w-5 h-5" />
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*" 
        />
        <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-4 font-medium">Tap to change photo</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white/60 border border-white/40 focus:border-rose-300 focus:ring-0 transition-all outline-none text-gray-800"
            placeholder="Your name"
          />
        </div>

        {/* Relationship Nickname */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">How your partner sees you</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white/60 border border-white/40 focus:border-rose-300 focus:ring-0 transition-all outline-none text-gray-800 font-medium"
            placeholder={name || "Nickname"}
          />
        </div>

        {/* Appearance */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Your Color</label>
          <div className="flex items-center gap-4 ml-1">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => setAccentColor(c.id)}
                className={`w-8 h-8 rounded-full ${c.bg} transition-all ${accentColor === c.id ? 'ring-4 ring-white ring-offset-2 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 font-medium">This color will be used for your name and avatar ring on your partner's app.</p>
        </div>

        {/* Account Section */}
        <div className="pt-4">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Account</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Email Address</span>
              </div>
              <span className="text-sm font-medium text-gray-400">{user?.email}</span>
            </div>

            {isEmailUser && (
              <div className="p-4 rounded-2xl bg-white/60 border border-white/40">
                <button 
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="w-full flex items-center justify-between text-sm text-gray-700 font-medium"
                >
                  <div className="flex items-center gap-3 text-gray-600">
                    <Key className="w-4 h-4" />
                    <span>Change Password</span>
                  </div>
                  <ChevronLeft className={`w-4 h-4 text-gray-400 transition-transform ${showPasswordChange ? 'rotate-90' : '-rotate-90'}`} />
                </button>
                
                {showPasswordChange && (
                  <div className="mt-4 flex gap-2">
                    <input 
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 p-3 rounded-xl bg-white border border-gray-100 text-sm outline-none focus:border-rose-300"
                    />
                    <button 
                      onClick={async () => {
                        if (!user || !newPassword || newPassword.length < 6) {
                          showToast("Password must be at least 6 chars");
                          return;
                        }
                        setChangingPassword(true);
                        try {
                          await updatePassword(user, newPassword);
                          showToast("Password updated ✨");
                          setNewPassword("");
                          setShowPasswordChange(false);
                        } catch (e: any) {
                          console.error(e);
                          if (e.code === 'auth/requires-recent-login') {
                            setError("Please sign out and back in to change password.");
                          } else {
                            setError("Failed to change password.");
                          }
                        } finally {
                          setChangingPassword(false);
                        }
                      }}
                      disabled={changingPassword}
                      className="px-4 bg-gray-800 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {changingPassword ? "..." : "Update"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-500 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading || uploading || saved}
          className="w-full py-5 px-4 rounded-2xl bg-gradient-to-r from-rose-400 to-lavender-400 text-white font-bold shadow-lg shadow-rose-200/50 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>

      {toast && (
        <div className={`toast show`}>
          {toast}
        </div>
      )}
    </div>
  );
}
