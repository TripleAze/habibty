"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name.trim(),
      });

      // 2. Update Auth Profile (so it reflects in useAuth immediately)
      await updateProfile(user, {
        displayName: name.trim(),
      });

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push("/profile");
      }, 1500);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      setError("Update blocked or failed. Please check your ad-blocker or connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center">
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="font-serif text-2xl font-bold text-gray-800">Edit Profile</h1>
        <div className="w-10" />
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          {user?.photoURL ? (
            <img src={user.photoURL} className="w-24 h-24 rounded-3xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-100 to-lavender-100 flex items-center justify-center text-3xl">
              {name[0] || "Y"}
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-rose-400">
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white/60 border border-white/40 focus:border-rose-300 focus:ring-0 transition-all outline-none"
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
          disabled={loading || saved}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-400 to-lavender-400 text-white font-bold shadow-lg shadow-rose-200/50 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
