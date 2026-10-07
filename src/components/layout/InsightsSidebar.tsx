import React, { useMemo, useState } from 'react';
import { VectorIcon } from '../vector/VectorIcons';
import { WalletIllustration } from '../vector/WalletIllustration';
import { Modal } from '../ui/Modal';
import { Banner, Button, Field, TextInput } from '../ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { computeBalances } from '../../lib/balance';
import { formatMoney } from '../../utils/format';

const MONTH_BUDGET_FALLBACK = 200000;

/**
 * The live right-hand panel: the shared pot, the month's budget, who owes whom,
 * and the category breakdown.
 *
 * Everything here is derived from the household collections the provider is
 * already subscribed to, so it updates as people log expenses on their own
 * devices. There is no separate fetch and no polling.
 */
export function InsightsSidebar({
  onNavigate,
}: {
  onNavigate: (screen: 'wallets' | 'members' | 'history') => void;
}) {
  const { user } = useAuth();
  const {
    household,
    members,
    expenses,
    settlements,
    wallets,
    categories,
    creditWallet,
    addSettlement,
  } = useHousehold();

  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = household?.baseCurrency || 'INR';
  const memberIds = useMemo(() => members.map((m: any) => m.uid), [members]);
  const nameOf = (uid: string) =>
    members.find((m: any) => m.uid === uid)?.displayName || 'Someone';

  // Allowance left across the family. A wallet that has gone negative is
  // reported separately rather than folded in here, because "total allowance" and
  // "somebody is over" are different facts.
  const { walletTotal, overdrawn } = useMemo(() => {
    const balanceOf = (uid: string) =>
      Number(wallets.find((w: any) => w.uid === uid)?.balanceMinor) || 0;
    const rows = members.map((m: any) => ({ uid: m.uid, name: m.displayName || m.email, balance: balanceOf(m.uid) }));
    return {
      walletTotal: rows.reduce((sum, row) => sum + row.balance, 0),
      overdrawn: rows.filter((row) => row.balance < 0),
    };
  }, [wallets, members]);

  const live = useMemo(
    () => (row: any) => !row.deletedAt || row.deletedAt === null,
    [],
  );

  const monthStart = useMemo(() => {
    const now = new Date();
    return Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000,
    );
  }, []);

  const monthExpenses = useMemo(
    () => expenses.filter((e: any) => live(e) && (e.dateEpochDay || 0) >= monthStart),
    [expenses, live, monthStart],
  );

  const monthSpend = monthExpenses.reduce(
    (sum: number, e: any) => sum + (e.baseAmountMinor || 0),
    0,
  );

  const budget = household?.monthlyBudgetMinor || MONTH_BUDGET_FALLBACK;
  const percent = budget > 0 ? Math.min(100, Math.round((monthSpend / budget) * 100)) : 0;
  const over = budget > 0 && monthSpend > budget;

  const balances = useMemo(
    () => computeBalances(memberIds, expenses as any, settlements as any),
    [memberIds, expenses, settlements],
  );

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    monthExpenses.forEach((e: any) => {
      const cat = categories.find((c: any) => c.id === e.categoryId);
      const name = cat?.name || 'Uncategorised';
      const color = cat?.color || '#9CA3AF';
      const row = map.get(name) || { name, color, total: 0 };
      row.total += e.baseAmountMinor || 0;
      map.set(name, row);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [monthExpenses, categories]);

  const categorySpend = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  const slices = useMemo(() => {
    let offset = 0;
    return categoryTotals.map((cat) => {
      const share = categorySpend > 0 ? (cat.total / categorySpend) * 100 : 0;
      const slice = {
        ...cat,
        share: Math.round(share),
        dash: `${(share / 100) * 283} 283`,
        offset: -((offset / 100) * 283),
      };
      offset += share;
      return slice;
    });
  }, [categoryTotals, categorySpend]);

  const isOwner = household?.ownerUid === user?.uid;

  const submitCredit = async () => {
    const minor = Math.round(parseFloat(creditAmount) * 100);
    if (!user || minor <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await creditWallet(user.uid, minor, 'Topped up from Expence');
      setCreditOpen(false);
      setCreditAmount('');
    } catch (err: any) {
      setError(err?.message || 'Could not top up the wallet.');
    } finally {
      setBusy(false);
    }
  };

  const settle = async (fromUid: string, toUid: string, amountMinor: number) => {
    if (!user) return;
    setBusy(true);
    try {
      await addSettlement({
        fromUid,
        toUid,
        baseAmountMinor: amountMinor,
        currency,
        method: 'UPI',
        note: 'Settled in Expence',
        dateEpochDay: Math.floor(Date.now() / 86_400_000),
      });
    } catch (err: any) {
      setError(err?.message || 'Could not record the settlement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-96 lg:shrink-0">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Wallets
            </span>
            <h3 className={`mt-1 text-2xl font-bold tracking-tight ${walletTotal < 0 ? 'text-negative' : 'text-body'}`}>
              {formatMoney(Math.abs(walletTotal), currency)}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted">Allowance left in the family</p>
          </div>
          <div className="-mr-1 -mt-1 size-14 shrink-0">
            <WalletIllustration size={56} />
          </div>
        </div>

        {overdrawn.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-negative/25 bg-negative/10 p-3">
            <VectorIcon name="alert" size={15} color="var(--color-negative)" className="mt-0.5" />
            <p className="text-[11px] leading-snug text-negative">
              <strong className="font-bold">{overdrawn.map((o) => o.name).join(', ')}</strong>{' '}
              {overdrawn.length === 1 ? 'is' : 'are'} over their allowance.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <button
            type="button"
            onClick={() => onNavigate('wallets')}
            className="text-xs font-bold text-brand hover:underline"
          >
            Manage wallets
          </button>
          {isOwner && (
            <Button size="sm" onClick={() => setCreditOpen(true)}>
              <VectorIcon name="plus" size={13} />
              Top up mine
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
            This month
          </span>
          <span className="text-xs font-semibold text-muted">
            {formatMoney(monthSpend, currency)} of {formatMoney(budget, currency)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            style={{ width: `${percent}%` }}
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-negative' : 'bg-brand'}`}
          />
        </div>
        {over && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-negative/30 bg-negative/10 p-3 text-xs text-negative">
            <VectorIcon name="alert" size={16} color="var(--color-negative)" className="mt-0.5" />
            <p className="leading-snug">
              <strong className="font-bold">Over budget.</strong>{' '}
              {formatMoney(monthSpend - budget, currency)} past the limit.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
          Settle up
        </span>

        {balances.transfers.length === 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-positive/25 bg-positive/10 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-positive text-white">
              <VectorIcon name="check" size={16} strokeWidth={3} />
            </span>
            <div>
              <p className="text-xs font-bold text-body">All square</p>
              <p className="text-[11px] font-medium text-muted">Nobody owes anybody.</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {balances.transfers.map((transfer, i) => (
              <div
                key={`${transfer.fromUid}-${transfer.toUid}-${i}`}
                className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface-sunken p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-body">
                    <strong>{nameOf(transfer.fromUid)}</strong> owes{' '}
                    <strong>{nameOf(transfer.toUid)}</strong>
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-brand">
                    {formatMoney(transfer.amountMinor, currency)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="subtle"
                  busy={busy}
                  onClick={() => void settle(transfer.fromUid, transfer.toUid, transfer.amountMinor)}
                >
                  Settle
                </Button>
              </div>
            ))}
          </div>
        )}

        {members.length > 1 && (
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className="mt-3 w-full text-xs font-bold text-brand hover:underline"
          >
            Manage family
          </button>
        )}
      </section>

      {categoryTotals.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              By category
            </span>
            <span className="text-xs font-semibold text-muted">
              {categoryTotals.length} used
            </span>
          </div>

          <div className="relative flex items-center justify-center py-3">
            <svg width="140" height="140" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-sunken)" strokeWidth="10" />
              {slices.map((slice, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="10"
                  strokeDasharray={slice.dash}
                  strokeDashoffset={slice.offset}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase text-faint">Total</span>
              <span className="text-sm font-bold text-body">{formatMoney(categorySpend, currency)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {slices.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                  <span className="truncate font-medium text-body">{cat.name}</span>
                </span>
                <span className="ml-2 shrink-0 font-bold text-body">
                  {formatMoney(cat.total, currency)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="mt-3 w-full text-xs font-bold text-brand hover:underline"
          >
            See all expenses
          </button>
        </section>
      )}

      <Modal open={creditOpen} onClose={() => setCreditOpen(false)} title="Top up your wallet">
        <div className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <Field label={`Amount (${currency})`} icon="wallet">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreditOpen(false)}>
              Cancel
            </Button>
            <Button busy={busy} onClick={() => void submitCredit()}>
              Add money
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}