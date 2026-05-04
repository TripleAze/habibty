"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (!auth) return;
    try {
      // 1. Clear local user state for immediate response
      setUser(null);
      
      // 2. Attempt to sign out from Firebase server
      await firebaseSignOut(auth);
      
      // 3. Force redirect to auth to clear any lingering context
      window.location.href = "/auth";
    } catch (err) {
      console.error("Sign out error:", err);
      // Even if network is blocked, we force a logout in the UI
      setUser(null);
      window.location.href = "/auth";
    }
  };

  return { user, signOut };
}
