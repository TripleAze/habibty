interface MediaSkeletonProps {
  type: 'audio' | 'video';
}

export default function MediaSkeleton({ type }: MediaSkeletonProps) {
  if (type === 'video') {
    return (
      <div className="media-skeleton video-skeleton">
        <div className="skeleton-video-preview" />
        <div className="skeleton-video-controls">
          <div className="skeleton-play-btn" />
          <div className="skeleton-progress-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="media-skeleton audio-skeleton">
      <div className="skeleton-audio-wave">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-wave-bar"
            style={{
              height: `${Math.random() * 24 + 8}px`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <div className="skeleton-audio-controls">
        <div className="skeleton-play-circle" />
        <div className="skeleton-progress-track" />
      </div>
    </div>
  );
}
