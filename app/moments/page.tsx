'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { subscribeToMoments, Moment } from '@/lib/moments';
import BottomNav from '@/components/BottomNav';
import ListSkeleton from '@/components/skeleton/ListSkeleton';

export default function MomentsPage() {
  const router = useRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');

  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth');
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.partnerId) {
            setPartnerId(userData.partnerId);
            const partnerSnap = await getDoc(doc(db, 'users', userData.partnerId));
            if (partnerSnap.exists()) {
              setPartnerName(partnerSnap.data().displayName || 'Partner');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user/partner:', err);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, [router]);

  useEffect(() => {
    if (!partnerId) return;

    const unsubMoments = subscribeToMoments(partnerId, (fetchedMoments) => {
      setMoments(fetchedMoments);
    });

    return () => unsubMoments();
  }, [partnerId]);

  const formatMomentDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="home-header">
          <div className="home-header-left">
            <p className="home-label">Memories</p>
            <h1 className="home-title">Our <em>journey</em></h1>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <ListSkeleton variant="list" count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="home-header">
        <div className="home-header-left">
          <p className="home-label">Our Journey</p>
          <h1 className="home-title">Shared <em>memories</em></h1>
        </div>
      </div>

      <div className="moments-timeline">
        {moments.length === 0 ? (
          <div className="empty-moments">
            <div className="empty-moments-icon">✨</div>
            <h3 className="empty-moments-title">No memories yet</h3>
            <p className="empty-moments-text">
              Every message you send and game you play with <strong>{partnerName}</strong> will be remembered here.
            </p>
            <button className="empty-moments-btn" onClick={() => router.push('/create')}>
              Send a letter
            </button>
          </div>
        ) : (
          <div className="timeline-container">
            {moments.map((moment, idx) => (
              <div key={moment.id} className="moment-item animation-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="moment-line" />
                <div className="moment-dot">
                  {moment.emoji || '✨'}
                </div>
                <div className="moment-card">
                  <div className="moment-header">
                    <span className="moment-type">
                      {moment.type.replace('_', ' ')}
                    </span>
                    <span className="moment-date">
                      {formatMomentDate(moment.createdAt)}
                    </span>
                  </div>
                  <h4 className="moment-title">{moment.title}</h4>
                  {moment.description && (
                    <p className="moment-desc">{moment.description}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="timeline-start">
              <span className="timeline-start-label">The beginning of something beautiful</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .moments-timeline {
          padding: 20px 24px 100px;
        }
        .timeline-container {
          position: relative;
          padding-left: 32px;
        }
        .moment-item {
          position: relative;
          margin-bottom: 24px;
        }
        .moment-line {
          position: absolute;
          left: -21px;
          top: 24px;
          bottom: -24px;
          width: 2px;
          background: linear-gradient(to bottom, rgba(232, 160, 160, 0.4), rgba(201, 184, 216, 0.2));
        }
        .moment-item:last-child .moment-line {
          display: none;
        }
        .moment-dot {
          position: absolute;
          left: -32px;
          top: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #E8A0A0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          z-index: 2;
          box-shadow: 0 2px 8px rgba(232, 160, 160, 0.2);
        }
        .moment-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(232, 160, 160, 0.15);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 4px 15px rgba(201, 184, 216, 0.1);
          transition: transform 0.2s ease;
        }
        .moment-card:hover {
          transform: translateY(-2px);
          border-color: rgba(232, 160, 160, 0.3);
        }
        .moment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .moment-type {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #E8A0A0;
          font-weight: 700;
        }
        .moment-date {
          font-size: 10px;
          color: #C9B8D8;
          font-style: italic;
        }
        .moment-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px;
          font-weight: 600;
          color: #3D2B3D;
          margin-bottom: 4px;
        }
        .moment-desc {
          font-size: 12px;
          color: #7A5C7A;
          line-height: 1.5;
        }
        .timeline-start {
          margin-top: 40px;
          padding: 20px;
          text-align: center;
          border-top: 1px dashed rgba(232, 160, 160, 0.3);
        }
        .timeline-start-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-style: italic;
          color: #C9B8D8;
        }
        .empty-moments {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 40px;
          text-align: center;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 32px;
          border: 1px dashed rgba(232, 160, 160, 0.3);
        }
        .empty-moments-icon {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.8;
        }
        .empty-moments-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 24px;
          margin-bottom: 12px;
          color: #3D2B3D;
        }
        .empty-moments-text {
          font-size: 14px;
          color: #7A5C7A;
          margin-bottom: 24px;
          line-height: 1.6;
        }
        .empty-moments-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          color: #fff;
          border: none;
          border-radius: 100px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(232, 160, 160, 0.3);
        }
      `}</style>

      <BottomNav activeTab="moments" />
    </div>
  );
}
