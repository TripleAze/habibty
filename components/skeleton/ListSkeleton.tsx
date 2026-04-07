import MessageCardSkeleton from './MessageCardSkeleton';

interface ListSkeletonProps {
  count?: number;
  variant?: 'grid' | 'list';
}

export default function ListSkeleton({ count = 4, variant = 'grid' }: ListSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="timeline-item-skeleton">
            <div className="timeline-line-skeleton">
              <div className="skeleton-dot" />
              <div className="skeleton-connector" />
            </div>
            <div className="timeline-content-skeleton">
              <div className="skeleton-line title-skeleton" />
              <div className="skeleton-line meta-skeleton" />
              <div className="skeleton-line badge-skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          style={{ 
            animation: 'cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: `${i * 0.1}s` 
          }}
        >
          <MessageCardSkeleton />
        </div>
      ))}
    </div>
  );
}
