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
export function HomeScreen({ query }: { query: string }) {
  const { user } = useAuth();
  const { household, expenses, members, wallets } = useHousehold();
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
      allowance: members.reduce(
        (sum: number, m: any) =>
          sum + (Number(wallets.find((w: any) => w.uid === m.uid)?.balanceMinor) || 0),
        0,
      ),
    };
  }, [expenses, members, wallets]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="This month" value={formatMoney(stats.month, currency)} accent />
        <Stat label="All time" value={formatMoney(stats.all, currency)} />
        <Stat label="Expenses" value={String(stats.count)} />
        <Stat label="Members" value={String(members.length)} />
        <Stat
          label="Allowance left"
          value={formatMoney(stats.allowance, currency)}
          accent={stats.allowance < 0}
        />
      </div>

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