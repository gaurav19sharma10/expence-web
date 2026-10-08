import React, { useMemo, useState } from 'react';
import { QuickAdd } from '../components/feed/QuickAdd';
import { ExpenseFeed } from '../components/feed/ExpenseFeed';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatMoney } from '../utils/format';

/**
 * The ledger: this month's headline figures, then every expense as a note.
 *
 * The summary strip is the only place totals appear above the fold; the sidebar
 * carries the live detail.
 */
export function HomeScreen({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  const { user } = useAuth();
  const { household, expenses, members, loading } = useHousehold();
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const currency = household?.baseCurrency || 'INR';

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
    );
    const live = expenses.filter((e: any) => !e.deletedAt);
    const month = live.filter((e: any) => (e.dateEpochDay || 0) >= monthStart);
    return {
      month: month.reduce((sum: number, e: any) => sum + (e.baseAmountMinor || 0), 0),
      all: live.reduce((sum: number, e: any) => sum + (e.baseAmountMinor || 0), 0),
      count: live.length,
    };
  }, [expenses]);

  return (
    <div>
      {/*
       * On a phone the header search is hidden; rendering it here keeps it
       * usable exactly where the cards sit. md+ hides this row because the
       * header search is in its place.
       */}
      <div className="mb-3 md:hidden">
        <div className="flex items-center rounded-xl border border-line bg-surface shadow-sm focus-within:border-brand/60">
          <span className="pl-3 pr-2 text-faint">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search expenses, merchants, notes…"
            aria-label="Search expenses"
            className="w-full bg-transparent py-2.5 pr-3 text-sm text-body outline-none placeholder:text-faint"
          />
        </div>
      </div>

      {/* Skeleton covers the same grid while Firestore is still delivering. */}
      {loading ? (
        <div className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-4">
              <div className="h-3 w-16 rounded bg-surface-sunken" />
              <div className="mt-2 h-6 w-20 rounded bg-surface-sunken" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="This month" value={formatMoney(stats.month, currency)} accent />
        <Stat label="All time" value={formatMoney(stats.all, currency)} />
        <Stat label="Expenses" value={String(stats.count)} />
        <Stat label="Members" value={String(members.length)} />
      </div>
      )}

      <QuickAdd />

      {members.length > 1 && (
        <div className="mx-auto mb-1 flex w-full max-w-3xl justify-end px-3">
          <div className="flex items-center gap-1 rounded-xl bg-surface-sunken p-1">
            {(['all', 'mine'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-colors ${
                  scope === key ? 'bg-surface text-brand shadow-xs' : 'text-muted'
                }`}
              >
                {key === 'all' ? 'Everyone' : 'My expenses'}
              </button>
            ))}
          </div>
        </div>
      )}

      <ExpenseFeed filter={{ query, onlyPaidBy: scope === 'mine' ? (user?.uid ?? null) : null }} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p
        className={`mt-0.5 text-base font-bold ${
          negative ? 'text-negative' : accent ? 'text-brand' : 'text-body'
        }`}
      >
        {value}
      </p>
    </div>
  );
}