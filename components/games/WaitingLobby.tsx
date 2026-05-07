'use client';

import { useState, useEffect } from 'react';
import { Copy, Share, User } from 'lucide-react';
import Image from 'next/image';

interface WaitingLobbyProps {
  gameId: string;
  gameType: 'tictactoe' | 'whot' | 'wordle' | 'truth-or-dare' | 'rapid-fire' | 'would-you-rather';
  myPhoto?: string;
  onCancel: () => void;
}

export default function WaitingLobby({ gameId, gameType, myPhoto, onCancel }: WaitingLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [dots, setDots] = useState('');

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getGameInfo = () => {
    switch (gameType) {
      case 'whot':
        return {
          title: 'Naija Whot',
          desc: 'The legendary Nigerian card game.',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, color: 'white', fontFamily: "var(--font-cormorant),serif", fontStyle: 'italic', boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              W
            </div>
          )
        };
      case 'tictactoe':
        return {
          title: 'Tic Tac Toe',
          desc: 'Classic 3×3 strategy.',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%', aspectRatio: '1' }}>
                {Array(9).fill(0).map((_, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          )
        };
      case 'wordle':
        return {
          title: 'Partner Wordle',
          desc: 'Couples edition word puzzle.',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#68B88B,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, boxShadow: '0 12px 24px rgba(104,184,139,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              📝
            </div>
          )
        };
      case 'truth-or-dare':
        return {
          title: 'Truth or Dare',
          desc: 'Intimate questions for two.',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              🔥
            </div>
          )
        };
      case 'rapid-fire':
        return {
          title: 'Rapid Fire',
          desc: 'Quick answers, no thinking!',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              ⚡
            </div>
          )
        };
      case 'would-you-rather':
        return {
          title: 'Would You Rather',
          desc: 'Find out where you both stand.',
          hero: (
            <div style={{ width: 120, height: 160, borderRadius: 20, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, boxShadow: '0 12px 24px rgba(232,160,160,0.25)', border: '2px solid rgba(255,255,255,0.6)' }}>
              🤔
            </div>
          )
        };
      default:
        return { title: 'Game', desc: 'Waiting for partner.', hero: <div /> };
    }
  };

  const info = getGameInfo();

  const handleCopy = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: info.title,
          text: `Join my ${info.title} game! Code: ${gameId}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="game-lobby-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* 1. Game hero section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4vh', marginBottom: 32 }}>
        {info.hero}
        <h2 style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 32, fontStyle: 'italic', color: '#3D2B3D', marginTop: 24, marginBottom: 8 }}>
          {info.title}
        </h2>
        <p style={{ fontSize: 14, color: '#7A5C7A' }}>{info.desc}</p>
      </div>

      {/* 2. Game code section */}
      <div style={{
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: '24px 20px',
        width: '100%',
        maxWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 32,
        boxShadow: '0 8px 32px rgba(232,160,160,0.1)',
        border: '1px solid rgba(255,255,255,0.8)'
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9829A', fontWeight: 600, marginBottom: 12 }}>
          Your Game Code
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 36, letterSpacing: '0.25em', fontWeight: 600, color: '#3D2B3D', fontFamily: "var(--font-cormorant),serif", marginLeft: '0.25em' }}>
            {gameId}
          </span>
          <button 
            onClick={handleCopy}
            style={{ 
              background: copied ? 'rgba(104,184,139,0.15)' : 'rgba(232,160,160,0.15)',
              color: copied ? '#4A8A5A' : '#E8A0A0',
              border: 'none',
              borderRadius: 100,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <span style={{ fontSize: 12, fontWeight: 500 }}>Copied!</span> : <Copy size={16} />}
          </button>
        </div>
        
        <p style={{ fontSize: 11, fontStyle: 'italic', color: '#7A5C7A', opacity: 0.8 }}>
          Share with your partner to let them join
        </p>
      </div>

      {/* 3. Waiting indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          
          {/* You */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', background: '#F2C4CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {myPhoto ? (
                <img src={myPhoto} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                <User size={24} color="white" />
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#3D2B3D' }}>You</span>
          </div>

          <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg, rgba(232,160,160,0.2) 0%, rgba(232,160,160,0.8) 50%, rgba(232,160,160,0.2) 100%)' }} />

          {/* Partner (Waiting) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', border: '2px dashed rgba(201,184,216,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.4)' }}>
              <div style={{
                position: 'absolute',
                inset: -6,
                border: '2px solid rgba(201,184,216,0.4)',
                borderRadius: '50%',
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
              <User size={20} color="rgba(201,184,216,0.8)" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#7A5C7A' }}>Waiting...</span>
          </div>

        </div>
        <p style={{ fontSize: 12, color: '#7A5C7A', opacity: 0.8 }}>
          Waiting for your partner to join{dots}
        </p>
      </div>

      {/* 4. Action buttons */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
        <button 
          onClick={handleShare}
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: 100, 
            background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', 
            border: 'none', 
            color: 'white', 
            fontSize: 15, 
            fontWeight: 600, 
            cursor: 'pointer', 
            boxShadow: '0 8px 24px rgba(232,160,160,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: "var(--font-dm-sans),sans-serif"
          }}
        >
          <Share size={18} />
          Share Code
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: 'transparent', 
            border: 'none', 
            color: '#7A5C7A', 
            fontSize: 14, 
            cursor: 'pointer',
            fontFamily: "var(--font-dm-sans),sans-serif"
          }}
        >
          Cancel
        </button>
      </div>

    </div>
  );
}
