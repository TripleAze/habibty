"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Filter } from "lucide-react";
import MessageCard from "@/components/MessageCard";
import RevealModal from "@/components/RevealModal";
import NotificationBell from "@/components/NotificationBell";
import BottomNav from "@/components/BottomNav";
import { useMessages } from "@/lib/messages";
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useHeader } from "@/lib/HeaderContext";
import { Message } from "@/types";

const TABS = [
  { id: "all", label: "All Letters" },
  { id: "unread", label: "Unread" },
  { id: "surprise", label: "Surprises" },
  { id: "scheduled", label: "Scheduled" },
];

function InboxInternal() {
  useHeader({ hide: true });
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const { messages, loading } = useMessages();

  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && messages.length > 0) {
      const msg = messages.find(m => m.id === openId);
      if (msg) setSelectedMessage(msg);
    }
  }, [searchParams, messages]);

  const filteredMessages = messages.filter((msg) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return msg.status !== "opened";
    if (activeTab === "surprise") return msg.isSurprise;
    if (activeTab === "scheduled") return msg.scheduledFor && new Date(msg.scheduledFor) > new Date();
    return true;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Your Love Space</p>
          <h1 className="home-title">
            Love <em>Letters</em>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/create"
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-300 to-lavender-200 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages Grid */}
      <div className="messages-section">
        <p className="section-label">
          {activeTab === "all" ? "All Messages" : TABS.find(t => t.id === activeTab)?.label}
        </p>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading your letters...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">💌</span>
            <p className="empty-state-text">
              {activeTab === "all"
                ? "No letters yet. Write your first!"
                : "No letters in this category yet."}
            </p>
          </div>
        ) : (
          <div className="cards-grid">
            {filteredMessages.map((msg) => (
              <MessageCard 
                key={msg.id} 
                message={msg} 
                onClick={() => setSelectedMessage(msg)}
              />
            ))}
          </div>
        )}
      </div>

      <RevealModal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        message={selectedMessage}
      />
      <BottomNav activeTab="inbox" />
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="app-container">
        <div className="loading-state">
          <div className="loading-spinner" />
        </div>
      </div>
    }>
      <InboxInternal />
    </Suspense>
  );
}
