"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { uploadMedia } from "@/lib/imagekit";
import Image from "next/image";

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setName(snap.data().displayName || "");
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
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white/60 border border-white/40 focus:border-rose-300 focus:ring-0 transition-all outline-none text-gray-800"
            placeholder="Your name"
          />
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
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-400 to-lavender-400 text-white font-bold shadow-lg shadow-rose-200/50 flex items-center justify-center gap-2 disabled:opacity-70 transition-all active:scale-[0.98]"
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
