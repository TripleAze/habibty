"use client";

import { useState, useEffect } from "react";
import { X, Download, Heart } from "lucide-react";

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 3 seconds
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also show if already installed but user might want to see it
    const timer = setTimeout(() => {
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        setShow(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-up">
      <div className="glass-strong rounded-2xl p-4 shadow-2xl max-w-md mx-auto flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-200 to-lavender-100 flex items-center justify-center text-2xl flex-shrink-0">
          <Heart className="w-6 h-6 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-gray-800 text-sm">
            Add Habibty to Home Screen
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Access your love space instantly, even offline
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="text-xs font-medium text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors flex items-center gap-1 flex-shrink-0"
        >
          <Download className="w-3 h-3" />
          Install
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
