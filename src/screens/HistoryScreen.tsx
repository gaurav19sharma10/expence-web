import React, { useMemo, useState } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { EmptyInsightsIllustration } from '../components/vector/Illustrations';
import { Button } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatMoney } from '../utils/format';
import { matches, parseQuery } from '../lib/search';

/**
 * History, grouped by day.
 *
 * A note feed is the wrong shape for history: a ledger you are reading back
 * through wants rows, not cards, and the day header carries the day's total.
 */
export function HistoryScreen({ query }: { query: string }) {
  const { expenses, categories, members, household } = useHousehold();
  const [payer, setPayer] = useState<string>('all');
  const currency = household?.baseCurrency || 'INR';

  const parsed = useMemo(() => parseQuery(query), [query]);

  const days = useMemo(() => {
    const rows = expenses
      .filter((e: any) => !e.deletedAt)
      .filter((e: any) => (payer === 'all' ? true : e.paidBy === payer))
      .filter((e: any) => {
        if (!query.trim()) return true;
        const cat = categories.find((c: any) => c.id === e.categoryId);
        return matches(
          {
            id: e.id,
            description: e.description,
            notes: e.notes,
            merchant: e.merchant,
            categoryName: cat?.name,
            payerName: members.find((m: any) => m.uid === e.paidBy)?.displayName,
            baseAmountMinor: e.baseAmountMinor,
            currency: e.currency,
            dateEpochDay: e.dateEpochDay,
          },
          parsed,
        ).matched;
      });

    const grouped = new Map<number, any[]>();
    rows.forEach((e: any) => {
      const day = e.dateEpochDay || 0;
      grouped.set(day, [...(grouped.get(day) || []), e]);
    });

    return [...grouped.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([day, list]) => ({
        day,
        list,
        total: list.reduce((sum, e) => sum + (e.baseAmountMinor || 0), 0),
      }));
  }, [expenses, categories, members, payer, query, parsed]);

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <EmptyInsightsIllustration size={170} />
        <h3 className="mt-4 text-base font-bold text-body">Nothing here yet</h3>
        <p className="mt-1 max-w-sm text-xs text-muted">
          Expenses show up here the moment anyone in the family logs one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        <FilterPill active={payer === 'all'} onClick={() => setPayer('all')}>
          Everyone
        </FilterPill>
        {members.map((m: any) => (
          <FilterPill key={m.uid} active={payer === m.uid} onClick={() => setPayer(m.uid)}>
            {m.displayName || m.email}
          </FilterPill>
        ))}
      </div>

      {days.map(({ day, list, total }) => (
        <section key={day}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {new Date(day * 86_400_000).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </h2>
            <span className="text-xs font-bold text-body">{formatMoney(total, currency)}</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {list.map((e: any, i: number) => {
              const cat = categories.find((c: any) => c.id === e.categoryId);
              const who = members.find((m: any) => m.uid === e.paidBy);
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${cat?.color || '#9CA3AF'}1f`, color: cat?.color }}
                  >
                    <VectorIcon name={cat?.icon || cat?.name || 'dots'} size={15} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-body">{e.description}</p>
                    <p className="truncate text-[11px] text-muted">
                      {who?.displayName || 'Someone'}
                      {e.merchant ? ` · ${e.merchant}` : ''}
                      {e.notes ? ` · ${e.notes}` : ''}
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-body">
                    {formatMoney(e.baseAmountMinor, e.currency || currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
        active
          ? 'border-brand/30 bg-brand-light text-brand'
          : 'border-line text-muted hover:bg-surface-sunken hover:text-body'
      }`}
    >
      {children}
    </button>
  );
}