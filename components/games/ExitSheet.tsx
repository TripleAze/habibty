'use client';

interface ExitSheetProps {
  onResume: () => void;
  onMessages: () => void;
  onLeave: () => void;
}

export default function ExitSheet({ onResume, onMessages, onLeave }: ExitSheetProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(61,43,61,0.55)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, padding: '28px 24px 40px',
        animation: 'slideUp 0.3s ease',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(201,184,216,0.4)', margin: '0 auto 24px' }} />
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3D2B3D', textAlign: 'center', marginBottom: 6 }}>Leave game?</p>
        <p style={{ fontSize: 12, color: 'rgba(122,92,122,0.6)', textAlign: 'center', marginBottom: 24 }}>Your game is saved — you can come back anytime</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onResume} style={{ padding: '14px', borderRadius: 100, background: 'linear-gradient(135deg,#E8A0A0,#C9B8D8)', border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Resume game
          </button>
          <button onClick={onMessages} style={{ padding: '14px', borderRadius: 100, background: 'transparent', border: '1.5px solid rgba(232,160,160,0.35)', color: '#7A5C7A', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Open messages
          </button>
          <button onClick={onLeave} style={{ padding: '14px', borderRadius: 100, background: 'transparent', border: 'none', color: '#B06060', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Leave game
          </button>
        </div>
      </div>
    </div>
  );
}
