'use client';

import { useState, useRef, useEffect } from 'react';
import { MediaSkeleton } from './skeleton';

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
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleLoaded = () => {
      setMediaLoaded(true);
      setDuration(media.duration);
      onLoaded?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      setProgress((media.currentTime / media.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    media.addEventListener('loadeddata', handleLoaded);
    media.addEventListener('timeupdate', handleTimeUpdate);
    media.addEventListener('ended', handleEnded);

    if (autoPlay) {
      media.play().catch(() => {
        // Auto-play may be blocked by browser
      });
    }

    return () => {
      media.removeEventListener('loadeddata', handleLoaded);
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
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    media.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (type === 'video') {
    return (
      <div className="media-player video-player">
        {!mediaLoaded && <MediaSkeleton type="video" />}
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          className={`video-element ${mediaLoaded ? 'loaded' : 'hidden'}`}
          onClick={togglePlay}
          playsInline
          preload="metadata"
        />
        {mediaLoaded && (
          <div className="video-controls">
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <input
              type="range"
              className="progress-slider"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
            />
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="media-player audio-player">
      {!mediaLoaded && <MediaSkeleton type="audio" />}
      <audio
        ref={mediaRef as React.RefObject<HTMLAudioElement>}
        src={src}
        preload="metadata"
      />
      {mediaLoaded && (
        <div className="audio-controls">
          <div className="audio-wave">
            {[14, 22, 10, 28, 18, 32, 14, 26, 12, 18, 24, 10, 28, 16, 22, 12, 30, 18, 10, 14].map((height, i) => (
              <div
                key={i}
                className={`wave-bar ${isPlaying ? 'playing' : ''}`}
                style={{
                  height: `${height}px`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
          <div className="audio-controls-bar">
            <button className="play-circle" onClick={togglePlay}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <input
              type="range"
              className="progress-slider"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
            />
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
