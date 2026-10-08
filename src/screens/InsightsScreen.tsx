import React, { useMemo } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { AllSettledIllustration } from '../components/vector/Illustrations';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { SkeletonBars, SkeletonMemberRows } from '../components/ui/Skeleton';
import { computeBalances } from '../lib/balance';
import { formatMoney } from '../utils/format';

/**
 * Per-person positions for the whole family.
 *
 * The sidebar answers "who owes whom right now"; this answers "where does each
 * person stand", which needs the full history rather than the pending transfers.
 */
export function InsightsScreen() {
  const { user } = useAuth();
  const { members, expenses, settlements, household, categories, loading } = useHousehold();
  const currency = household?.baseCurrency || 'INR';

  const balances = useMemo(
    () =>
      computeBalances(
        members.map((m: any) => m.uid),
        expenses as any,
        settlements as any,
      ),
    [members, expenses, settlements],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number; count: number }>();
    expenses
      .filter((e: any) => !e.deletedAt)
      .forEach((e: any) => {
        const cat = categories.find((c: any) => c.id === e.categoryId);
        const name = cat?.name || 'Uncategorised';
        const row = map.get(name) || { name, color: cat?.color || '#9CA3AF', total: 0, count: 0 };
        row.total += e.baseAmountMinor || 0;
        row.count += 1;
        map.set(name, row);
      });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [expenses, categories]);

  const top = byCategory.slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
          Balances
        </span>

        {loading && members.length === 0 ? (
          <div className="mt-3">
            <SkeletonMemberRows count={3} />
          </div>
        ) : members.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No family members yet.</p>
        ) : balances.transfers.length === 0 ? (
          <div className="mt-4 flex items-center gap-4">
            <AllSettledIllustration size={96} />
            <div>
              <p className="text-sm font-bold text-body">All square</p>
              <p className="text-xs text-muted">
                Every expense is settled. Nobody owes anybody.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {members.map((m: any) => {
              const net = balances.net[m.uid] || 0;
              const tone = net > 0 ? 'text-positive' : net < 0 ? 'text-negative' : 'text-muted';
              return (
                <div
                  key={m.uid}
                  className="flex items-center justify-between rounded-2xl border border-line bg-surface-sunken px-4 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                      {(m.displayName || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-semibold text-body">
                      {m.displayName || m.email}
                      {m.uid === user?.uid && (
                        <span className="ml-1.5 text-[10px] font-bold text-faint">YOU</span>
                      )}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-bold ${tone}`}>
                    {/* `formatMoney` prints the absolute value -- it is used for
                        totals, where a sign would be wrong -- so a net position
                        has to carry its own sign or a member who owes money is
                        shown as if the household owes them. */}
                    {net > 0 ? '+' : net < 0 ? '−' : ''}
                    {formatMoney(Math.abs(net), currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
          All-time spending by category
        </span>

        {loading && top.length === 0 ? (
          <SkeletonBars count={5} />
        ) : top.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing has been logged yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {top.map((cat) => {
              const share = balances.totalSpend > 0 ? (cat.total / balances.totalSpend) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-body">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: cat.color }}
                      />
                      {cat.name}
                      <span className="font-normal text-faint">· {cat.count}</span>
                    </span>
                    <span className="font-bold text-body">
                      {formatMoney(cat.total, currency)}
                      <span className="ml-1.5 font-normal text-faint">{Math.round(share)}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${share}%`, background: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Figure
          icon="trending"
          label="Total spent"
          value={formatMoney(balances.totalSpend, currency)}
        />
        <Figure
          icon="scale"
          label="Settled"
          value={formatMoney(balances.totalSettled, currency)}
        />
        <Figure
          icon="alert"
          label="Still in dispute"
          value={formatMoney(balances.outstanding, currency)}
        />
        <Figure icon="receipt" label="Expenses" value={String(balances.totalSpend > 0 ? expenses.filter((e: any) => !e.deletedAt).length : 0)} />
      </section>
    </div>
  );
}

function Figure({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
        <VectorIcon name={icon} size={13} />
        {label}
      </span>
      <p className="mt-1 text-base font-bold text-body">{value}</p>
    </div>
  );
}