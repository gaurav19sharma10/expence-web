import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ExpenseCard } from './ExpenseCard';
import { EmptyLedgerIllustration } from '../vector/Illustrations';
import { Spinner } from '../ui/Field';
import { useHousehold } from '../../contexts/HouseholdContext';
import { formatMoney } from '../../utils/format';

export interface FeedFilter {
  query: string;
  /** Restrict to expenses this person paid, or omit for everyone. */
  onlyPaidBy?: string | null;
}

/**
 * The ledger feed: pinned notes first, then everything else.
 *
 * Each section shows its own total, because a running figure per group is more
 * use than one number for the lot — and it is what the reference does.
 */
export function ExpenseFeed({ filter }: { filter: FeedFilter }) {
  const { expenses, categories, members, householdId, loading } = useHousehold();

  const rows = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    return expenses
      .filter((e: any) => !e.deletedAt)
      .filter((e: any) => !filter.onlyPaidBy || e.paidBy === filter.onlyPaidBy)
      .filter((e: any) => {
        if (!q) return true;
        const cat = categories.find((c: any) => c.id === e.categoryId);
        const payer = members.find((m: any) => m.uid === e.paidBy);
        return [e.description, e.merchant, e.notes, cat?.name, payer?.displayName]
          .filter(Boolean)
          .some((field: string) => field.toLowerCase().includes(q));
      });
  }, [expenses, categories, members, filter.query, filter.onlyPaidBy]);

  const pinned = rows.filter((e: any) => e.isPinned);
  const rest = rows.filter((e: any) => !e.isPinned);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Spinner className="size-10 border-[3px] border-brand/30 border-t-brand" />
        <p className="text-xs font-bold uppercase tracking-wider text-faint">
          Syncing from Firestore…
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <EmptyLedgerIllustration size={190} />
        <h3 className="mt-4 text-base font-bold text-body">
          {filter.query.trim() ? 'Nothing matches that search' : 'No expenses yet'}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted">
          {filter.query.trim()
            ? 'Try a merchant, a category, or a person.'
            : 'Everything is clean. Take an expense note above to log your first purchase — it appears on every family device straight away.'}
        </p>
      </div>
    );
  }

  const section = (title: string, list: any[], tone: 'brand' | 'neutral') => {
    if (list.length === 0) return null;
    const total = list.reduce((sum, e) => sum + (e.baseAmountMinor || 0), 0);
    const code = list[0]?.currency || 'INR';
    return (
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            {title}
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                tone === 'brand' ? 'bg-brand-light text-brand' : 'bg-surface-sunken text-body'
              }`}
            >
              {list.length}
            </span>
          </h2>
          <span className="text-xs font-bold text-body">{formatMoney(total, code)}</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                categories={categories}
                members={members}
                householdId={householdId}
              />
            ))}
          </AnimatePresence>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      {section('Pinned', pinned, 'brand')}
      {section(pinned.length ? 'Others' : 'Expenses', rest, 'neutral')}
    </div>
  );
}