"use client";

const widths = [60, 65, 70, 75, 80, 85, 90, 95];

export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] bg-white/10 rounded-2xl mb-3" />
      <div className="h-4 bg-white/10 rounded w-3/4" />
    </div>
  );
}

export function SkeletonText({ lines = 1, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-white/10 rounded"
          style={{ width: `${widths[i % widths.length]}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, columns = 3 }) {
  return (
    <div className={`grid grid-cols-${columns} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="animate-pulse space-y-6 mb-12">
      <div className="h-[300px] md:h-[400px] bg-white/10 rounded-2xl" />
      <div className="space-y-3">
        <div className="h-8 bg-white/10 rounded w-1/2" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/10 rounded w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 bg-white/10 rounded-lg" />
      ))}
    </div>
  );
}
