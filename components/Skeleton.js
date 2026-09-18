"use client";

const widths = [60, 65, 70, 75, 80, 85, 90, 95];

export function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/5 bg-white/[0.04]">
      <div className="aspect-[2/3] w-full animate-shimmer bg-gradient-to-b from-white/[0.06] to-white/[0.02]" />
      <div className="p-3.5 space-y-2">
        <div className="h-3.5 bg-white/10 rounded-full w-3/4 animate-pulse" />
        <div className="h-2.5 bg-white/5 rounded-full w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 1, className = "" }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 bg-white/10 rounded-full animate-pulse"
          style={{ width: `${widths[i % widths.length]}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, columns = 5 }) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  }[columns] || "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <div className={`grid ${colClass} gap-4 md:gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div className="relative h-[75vh] md:h-[90vh] w-full overflow-hidden bg-[#07080d] -mt-20 md:-mt-24 flex items-end pb-16 px-6 md:px-14">
      <div className="w-full max-w-2xl space-y-4">
        <div className="h-6 w-36 rounded-full bg-white/10 animate-pulse" />
        <div className="h-14 md:h-20 w-3/4 rounded-2xl bg-white/10 animate-pulse" />
        <div className="h-4 w-full rounded-full bg-white/5 animate-pulse" />
        <div className="h-4 w-2/3 rounded-full bg-white/5 animate-pulse" />
        <div className="flex gap-4 pt-3">
          <div className="h-12 w-36 rounded-full bg-white/15 animate-pulse" />
          <div className="h-12 w-36 rounded-full bg-white/10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-white/[0.05] border border-white/10 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
