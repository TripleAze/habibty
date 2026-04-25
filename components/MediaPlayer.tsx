'use client';

import { useState, useRef, useEffect } from 'react';

interface MediaPlayerProps {
  src: string;
  type: 'audio' | 'video';
  autoPlay?: boolean;
  onLoaded?: () => void;
}

export default function MediaPlayer({ src, type, autoPlay = false, onLoaded }: MediaPlayerProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleLoaded = () => {
      setMediaLoaded(true);
      if (isFinite(media.duration) && media.duration > 0) {
        setDuration(media.duration);
      }
      onLoaded?.();
    };

    const handleMetadata = () => {
      if (isFinite(media.duration) && media.duration > 0) {
        setDuration(media.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      if (media.duration > 0) {
        setProgress((media.currentTime / media.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (media) media.currentTime = 0;
    };

    media.addEventListener('loadedmetadata', () => {
      if (isFinite(media.duration) && media.duration > 0) {
        setDuration(media.duration);
      }
    });
    media.addEventListener('loadeddata', handleLoaded); media.addEventListener('loadedmetadata', handleMetadata);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);

    if (autoPlay) media.play().catch(() => { });

    return () => {
      media.removeEventListener('loadeddata', handleLoaded);
      media.removeEventListener('loadedmetadata', handleMetadata);
      media.removeEventListener('timeupdate', handleTimeUpdate);
      media.removeEventListener('ended', handleEnded);
    };
  }, [autoPlay, onLoaded]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;
    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(() => { });
    }
    setIsPlaying(!isPlaying);
    flashControls();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    media.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
    setCurrentTime(newTime);
  };

  const flashControls = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ── VIDEO ─────────────────────────────────────────────
  if (type === 'video') {
    return (
      <>
        <style>{`
          .mp-video-wrap {
            position: relative;
            width: 100%;
            border-radius: 14px;
            overflow: hidden;
            background: transparent;
            cursor: pointer;
          }
          .mp-video-wrap video {
            width: 100%;
            height: auto;
            max-height: 70vh;
            display: block;
            object-fit: cover;
          }
          .mp-video-wrap video.hidden { opacity: 0; position: absolute; pointer-events: none; }
          .mp-video-skel {
            width: 100%;
            aspect-ratio: 16/9;
            background: linear-gradient(135deg, rgba(232,160,160,0.15), rgba(201,184,216,0.15));
            display: flex; align-items: center; justify-content: center;
          }
          .mp-video-skel-icon { font-size: 32px; opacity: 0.3; }
          .mp-video-overlay {
            position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.25);
            opacity: 0; transition: opacity 0.25s;
          }
          .mp-video-wrap:hover .mp-video-overlay,
          .mp-video-overlay.show { opacity: 1; }
          .mp-big-play {
            width: 56px; height: 56px; border-radius: 50%;
            background: rgba(255,255,255,0.92);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; border: none; cursor: pointer;
            transition: transform 0.2s;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          }
          .mp-big-play:hover { transform: scale(1.1); }
        `}</style>

        <div
          className="mp-video-wrap"
          onClick={togglePlay}
          onMouseEnter={flashControls}
          onMouseMove={flashControls}
        >
          {!mediaLoaded && (
            <div className="mp-video-skel">
              <span className="mp-video-skel-icon">🎬</span>
            </div>
          )}
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            className={mediaLoaded ? '' : 'hidden'}
            playsInline
            preload="metadata"
            loop
          />

          {/* Centre play/pause overlay */}
          {mediaLoaded && (
            <div className={`mp-video-overlay ${showControls || !isPlaying ? 'show' : ''}`}>
              <button type="button" className="mp-big-play" onClick={e => { e.stopPropagation(); togglePlay(); }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── AUDIO ─────────────────────────────────────────────
  const waveHeights = [14, 22, 10, 28, 18, 32, 14, 26, 12, 18, 24, 10, 28, 16, 22, 12, 30, 18, 10, 14];
  const playedBars = Math.floor((progress / 100) * waveHeights.length);

  return (
    <>
      <style>{`
        .mp-audio {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(232,160,160,0.2);
          border-radius: 14px;
          padding: 14px 16px;
          margin-top: 16px;
        }
        .mp-audio-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
        }
        .mp-play-circle {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #E8A0A0, #C9B8D8);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; color: white;
          transition: transform 0.2s;
          box-shadow: 0 3px 12px rgba(232,160,160,0.35);
          flex-shrink: 0;
        }
        .mp-play-circle:hover { transform: scale(1.08); }
        .mp-audio-meta { flex: 1; }
        .mp-audio-title { font-size: 12px; font-weight: 500; color: #3D2B3D; margin-bottom: 1px; }
        .mp-audio-dur {
          font-size: 11px; color: rgba(122,92,122,0.65);
          font-family: 'DM Sans', sans-serif;
        }
        .mp-wave {
          display: flex; align-items: center; gap: 2.5px; height: 36px; margin-bottom: 8px;
        }
        .mp-bar {
          width: 3px; border-radius: 2px; cursor: pointer;
          transition: background 0.15s;
        }
        .mp-bar.played { background: linear-gradient(to top, #E8A0A0, #C9B8D8); }
        .mp-bar.unplayed { background: rgba(201,184,216,0.4); }
        .mp-bar.playing { animation: waveAnim 1.1s ease-in-out infinite; }
        @keyframes waveAnim {
          0%,100% { transform: scaleY(0.6); }
          50%      { transform: scaleY(1); }
        }
        .mp-time-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 4px;
        }
        .mp-cur-time { font-size: 11px; color: rgba(122,92,122,0.6); font-family: 'DM Sans', sans-serif; }
        .mp-total-time { font-size: 11px; color: rgba(122,92,122,0.5); font-family: 'DM Sans', sans-serif; }
        .mp-audio-skel {
          height: 80px; border-radius: 14px;
          background: linear-gradient(90deg, rgba(232,160,160,0.1) 25%, rgba(232,160,160,0.2) 50%, rgba(232,160,160,0.1) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {!mediaLoaded && <div className="mp-audio-skel" />}

      <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={src} preload="metadata" />

      {mediaLoaded && (
        <div className="mp-audio">
          {/* Header: play button + title + duration */}
          <div className="mp-audio-header">
            <button type="button" className="mp-play-circle" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="mp-audio-meta">
              <div className="mp-audio-title">Voice note</div>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(122,92,122,0.55)', marginLeft: 'auto' }}>
              {duration > 0 ? formatTime(duration) : '—'}
            </span>
          </div>

          {/* Waveform bars — tappable to seek */}
          <div className="mp-wave">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className={`mp-bar ${i < playedBars ? 'played' : 'unplayed'} ${isPlaying && i >= playedBars ? 'playing' : ''}`}
                style={{
                  height: h,
                  animationDelay: `${i * 0.07}s`,
                }}
                onClick={() => {
                  const media = mediaRef.current;
                  if (!media || !duration) return;
                  const newProgress = (i / waveHeights.length) * 100;
                  const newTime = (newProgress / 100) * duration;
                  media.currentTime = newTime;
                  setProgress(newProgress);
                  setCurrentTime(newTime);
                }}
              />
            ))}
          </div>

          {/* Time row */}
          <div className="mp-time-row">
            <span className="mp-cur-time">{formatTime(currentTime)}</span>
            <span className="mp-total-time">{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </>
  );
}