"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}: ConfirmModalProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      document.body.style.overflow = "auto";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/50 transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0" : "scale-90 translate-y-4"}`}>
        <div className={`w-14 h-14 rounded-2xl ${isDanger ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"} flex items-center justify-center mb-6 mx-auto`}>
          <AlertCircle size={30} />
        </div>

        <h3 className="text-xl font-serif font-bold text-gray-800 text-center mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95 ${isDanger ? "bg-gradient-to-r from-red-400 to-rose-400 shadow-lg shadow-red-200" : "bg-gradient-to-r from-blue-400 to-sky-400 shadow-lg shadow-blue-200"}`}
          >
            {confirmText}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
