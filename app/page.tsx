'use client';
// app/page.tsx — Landing page

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already signed in, go straight to inbox
  useEffect(() => {
    if (!auth) { setChecking(false); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace('/inbox');
      else setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&display=swap');

        .land-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(160deg, #FAD0DC 0%, #EDD5F0 45%, #D5E2F8 100%);
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* floating petals */
        .petals { position: absolute; inset: 0; pointer-events: none; }
        .petal {
          position: absolute;
          border-radius: 50% 0 50% 0;
          opacity: 0;
          animation: riseUp 10s ease-in-out infinite;
        }
        @keyframes riseUp {
          0%   { transform: translateY(110vh) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.35; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-10vh) rotate(180deg); opacity: 0; }
        }

        /* subtle grain overlay */
        .land-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTools='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .land-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          text-align: center;
          padding: 0 32px;
        }

        .land-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(122, 92, 122, 0.7);
          margin-bottom: 18px;
          animation: fadeUp 0.8s ease both;
        }

        .land-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(62px, 16vw, 96px);
          font-weight: 300;
          font-style: italic;
          color: #3D2B3D;
          line-height: 1;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
          animation: fadeUp 0.9s 0.1s ease both;
        }

        .land-arabic {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-weight: 300;
          color: rgba(122, 92, 122, 0.6);
          letter-spacing: 0.08em;
          margin-bottom: 32px;
          animation: fadeUp 1s 0.2s ease both;
        }

        .land-divider {
          width: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #E8A0A0, transparent);
          margin-bottom: 28px;
          animation: fadeUp 1s 0.3s ease both;
        }

        .land-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 300;
          font-style: italic;
          color: #7A5C7A;
          line-height: 1.5;
          max-width: 280px;
          margin-bottom: 52px;
          animation: fadeUp 1s 0.4s ease both;
        }

        .land-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 40px;
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(232, 160, 160, 0.4);
          border-radius: 100px;
          color: #3D2B3D;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.06em;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s ease;
          animation: fadeUp 1s 0.55s ease both;
          box-shadow: 0 4px 24px rgba(232, 160, 160, 0.2);
        }
        .land-cta:hover {
          background: rgba(255,255,255,0.75);
          box-shadow: 0 8px 32px rgba(232, 160, 160, 0.35);
          transform: translateY(-2px);
        }
        .land-cta-arrow {
          font-size: 16px;
          transition: transform 0.3s ease;
        }
        .land-cta:hover .land-cta-arrow { transform: translateX(4px); }

        .land-footer {
          position: absolute;
          bottom: 28px;
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          font-style: italic;
          color: rgba(122, 92, 122, 0.45);
          letter-spacing: 0.08em;
          z-index: 1;
          animation: fadeUp 1s 0.8s ease both;
        }

        /* heart deco */
        .land-heart {
          position: absolute;
          font-size: 11px;
          opacity: 0;
          animation: heartFloat 6s ease-in-out infinite;
        }
        @keyframes heartFloat {
          0%,100% { transform: translateY(0) scale(1);   opacity: 0; }
          20%      { opacity: 0.5; }
          50%      { transform: translateY(-18px) scale(1.1); opacity: 0.3; }
          80%      { opacity: 0.1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="land-root">
        {/* Floating petals */}
        <div className="petals">
          {[
            { left: '10%',  color: '#F2C4CE', size: 10, delay: '0s',   dur: '9s'  },
            { left: '25%',  color: '#E8A0A0', size: 7,  delay: '2s',   dur: '11s' },
            { left: '42%',  color: '#C9B8D8', size: 12, delay: '4s',   dur: '8s'  },
            { left: '60%',  color: '#F2C4CE', size: 8,  delay: '1s',   dur: '13s' },
            { left: '75%',  color: '#E8A0A0', size: 6,  delay: '3s',   dur: '10s' },
            { left: '88%',  color: '#C9B8D8', size: 10, delay: '5.5s', dur: '9s'  },
            { left: '50%',  color: '#F7E8EE', size: 9,  delay: '7s',   dur: '12s' },
          ].map((p, i) => (
            <div key={i} className="petal" style={{
              left: p.left, bottom: '-20px',
              width: p.size, height: p.size,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }} />
          ))}
        </div>

        {/* Floating hearts */}
        {[
          { top: '18%', left: '12%', delay: '0s' },
          { top: '30%', left: '82%', delay: '2s' },
          { top: '65%', left: '8%',  delay: '4s' },
          { top: '72%', left: '88%', delay: '1s' },
        ].map((h, i) => (
          <span key={i} className="land-heart" style={{
            top: h.top, left: h.left,
            animationDelay: h.delay,
            animationDuration: `${5 + i}s`,
          }}>🤍</span>
        ))}

        <div className="land-content">
          <p className="land-eyebrow">a love letter app</p>
          <h1 className="land-logo">habibty</h1>
          <p className="land-arabic">حبيبتي</p>
          <div className="land-divider" />
          <p className="land-tagline">Letters for the one you love, delivered at just the right moment</p>
          <a href="/auth" className="land-cta">
            Begin
            <span className="land-cta-arrow">→</span>
          </a>
        </div>

        <p className="land-footer">made with love ♡</p>
      </div>
    </>
  );
}
