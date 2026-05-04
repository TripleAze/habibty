"use client";

import { useState, useEffect } from "react";
import { X, Smartphone, CheckCircle2, AlertCircle, Download } from "lucide-react";

interface PWASettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PWASettingsModal({ isOpen, onClose }: PWASettingsModalProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm glass-strong rounded-[32px] p-8 shadow-2xl animate-scale-in border border-white/40">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mb-6">
            <Smartphone className="w-8 h-8 text-sky-400" />
          </div>
          
          <h2 className="font-serif text-2xl font-bold text-gray-800 mb-2">PWA Settings</h2>
          <p className="text-sm text-gray-500 mb-8">Manage how Habibty feels on your device</p>

          <div className="w-full space-y-4">
            {/* Status Card */}
            <div className="p-4 rounded-2xl bg-white/50 border border-white/60 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</p>
                  <p className="font-medium text-gray-700">
                    {isStandalone ? "Installed as App" : "Running in Browser"}
                  </p>
                </div>
                {isStandalone ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                )}
              </div>
            </div>

            {/* Actions */}
            {!isStandalone && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full p-4 rounded-2xl bg-sky-400 text-white font-bold shadow-lg shadow-sky-200/50 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install Habibty
              </button>
            )}

            <div className="p-4 rounded-2xl bg-white/30 text-left">
              <p className="text-xs text-gray-500 leading-relaxed">
                Installing Habibty adds it to your home screen for a full-screen, app-like experience and faster loading.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
