'use client';

export default function MessageCardSkeleton() {
  return (
    <div className="p-4 border rounded-xl space-y-3 skeleton bg-white/50 backdrop-blur-sm min-h-[160px]">
      
      {/* Sender name */}
      <div className="h-4 w-32 skeleton rounded" />

      {/* Message lines */}
      <div className="space-y-2">
        <div className="h-3 w-full skeleton rounded" />
        <div className="h-3 w-5/6 skeleton rounded" />
        <div className="h-3 w-2/3 skeleton rounded" />
      </div>

      {/* Media placeholder (optional) */}
      <div className="h-32 w-full skeleton rounded-lg" />

      {/* Date */}
      <div className="h-3 w-20 skeleton rounded" />
    </div>
  );
}
