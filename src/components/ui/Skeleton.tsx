/**
 * Skeleton placeholders, shown while Firestore is still delivering.
 *
 * A spinner reads as "waiting" -- a blank kind of time. The outline of where
 * the content will sit tells you the answer is already being prepared, and
 * because each skeleton matches the shape of what replaces it, nothing jumps
 * when the real rows land. Every screen that fetches shows these instead of
 * its empty state until its own data arrives, so "still loading" and
 * "genuinely empty" never look the same.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <div className="h-4 w-2/5 rounded bg-surface-sunken" />
          <div className="mt-2 h-3 w-1/4 rounded bg-surface-sunken" />
          <div className="mt-3 h-3 w-3/5 rounded bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/**
 * One titled ledger block, for screens that group rows under a heading
 * (wallet groups, history days). Same header treatment as the real groups
 * so the title does not pop in late.
 */
export function SkeletonGroup({ title, count = 3 }: { title: string; count?: number }) {
  return (
    <section
      className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
      aria-hidden="true"
    >
      <div className="border-b border-line px-5 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">{title}</span>
      </div>
      <div className="animate-pulse space-y-2.5 px-5 py-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="h-3.5 flex-1 rounded bg-surface-sunken" />
            <div className="h-3.5 w-16 shrink-0 rounded bg-surface-sunken" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Avatar rows, shaped like the member list they stand in for. */
export function SkeletonMemberRows({ count = 3 }: { count?: number }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <div className="size-9 shrink-0 rounded-full bg-surface-sunken" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-2/5 rounded bg-surface-sunken" />
            <div className="mt-1.5 h-3 w-3/5 rounded bg-surface-sunken" />
          </div>
          <div className="h-6 w-14 shrink-0 rounded-full bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}

/** Category progress bars, shaped like the insights rows they stand in for. */
export function SkeletonBars({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-4 animate-pulse space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between">
            <div className="h-3 w-1/4 rounded bg-surface-sunken" />
            <div className="h-3 w-12 rounded bg-surface-sunken" />
          </div>
          <div className="h-2 rounded-full bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}
