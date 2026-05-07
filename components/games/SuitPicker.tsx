'use client';

import { Suit } from '@/types';
import { SUIT_SYMBOL, SUIT_COLOR, SUIT_BG } from '@/lib/whot';

export default function SuitPicker({ onPick }: { onPick: (s: Suit) => void }) {
  const suits: Exclude<Suit, 'whot'>[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 350,
      background: 'rgba(61,43,61,0.6)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.96)', borderRadius: 24,
        padding: '28px 20px', width: '100%', maxWidth: 340, textAlign: 'center',
      }}>
        <p style={{ fontFamily: "var(--font-cormorant),serif", fontSize: 22, fontStyle: 'italic', color: '#3D2B3D', marginBottom: 4 }}>
          Call a suit
        </p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.55)', marginBottom: 20 }}>
          Your partner must match this suit
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {suits.map(s => (
            <button
              key={s}
              onClick={() => onPick(s as Suit)}
              style={{
                width: 58, height: 76, borderRadius: 12,
                background: SUIT_BG[s as Suit], border: `2px solid ${SUIT_COLOR[s as Suit]}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                cursor: 'pointer', transition: 'transform 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{ fontSize: 24, color: SUIT_COLOR[s as Suit] }}>{SUIT_SYMBOL[s as Suit]}</span>
              <span style={{ fontSize: 9, color: SUIT_COLOR[s as Suit], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
