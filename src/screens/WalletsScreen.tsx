import React, { useState } from 'react';
import { VectorIcon } from '../components/vector/VectorIcons';
import { Modal } from '../components/ui/Modal';
import { Banner, Button, Field, SelectInput, TextInput } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { formatMoney } from '../utils/format';

/**
 * Per-member spending allowances.
 *
 * Replaces the single shared pot. The difference is the question each one
 * answers: a pot says "what is left in common", a wallet says "who is out of
 * pocket" — which is the question a family actually asks.
 *
 * A negative balance is not an error state to be hidden. It means somebody spent
 * more than they were given, the expense was still recorded because it really
 * happened, and whoever runs the family needs to see it. So it is shown in red,
 * and repeated as a banner at the top of the screen rather than left to be
 * discovered by scrolling.
 */
/**
 * One titled block of the ledger.
 *
 * Kept as a component so the four groups are built identically — a group that
 * looks slightly different from its neighbours reads as a different kind of fact,
 * and the point of splitting them is that each answers one question.
 */
function LedgerGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-5 py-3.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint">{title}</span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function LedgerRow({
  first,
  children,
}: {
  first: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-2.5 ${
        first ? '' : 'border-t border-line'
      }`}
    >
      {children}
    </div>
  );
}

export function WalletsScreen() {
  const { user } = useAuth();
  const {
    household,
    members,
    wallets,
    walletTxns,
    walletRequests,
    creditWallet,
    transferWallet,
  } = useHousehold();

  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [fromUid, setFromUid] = useState('');
  const [toUid, setToUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const currency = household?.baseCurrency || 'INR';
  const isOwner = household?.ownerUid === user?.uid;

  const balanceOf = (uid: string) =>
    Number(wallets.find((w: any) => w.uid === uid)?.balanceMinor) || 0;

  const overdrawn = members.filter((m: any) => balanceOf(m.uid) < 0);
  const total = members.reduce((sum: number, m: any) => sum + balanceOf(m.uid), 0);

  const nameFor = (uid: string | null) =>
    members.find((m: any) => m.uid === uid)?.displayName || 'Someone';
  const nameOf = nameFor;

  /*
   * The ledger is split by kind instead of merged into one list.
   *
   * A single "recent activity" list reads as complete but is not: it hid every
   * spend, so the screen answered "who did you pay?" with silence, and the head
   * — who is the one person who can be asked — had no way to reconstruct it.
   * Three groups, each answering one question:
   *   money in   — what the family was given
   *   transfers  — a deliberate move between wallets
   *   spending   — debits taken by expenses
   * Plus the requests the head answered, which are decisions rather than movements
   * and are the record of *whom they approved and whom they turned down*.
   */
  const moneyIn = walletTxns.filter((t: any) => t.kind === 'CREDIT');
  const transfers = walletTxns.filter((t: any) => t.kind === 'TRANSFER');
  const spending = walletTxns.filter((t: any) => t.kind === 'SPEND');
  const decided = walletRequests.filter((r: any) => r.status !== 'PENDING');

  const close = () => {
    setCreditFor(null);
    setTransferOpen(false);
    setAmount('');
    setNote('');
    setError(null);
  };

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setDone(success);
      setAmount('');
      setNote('');
      close();
    } catch (err: any) {
      setError(err?.message || 'Could not move that money.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {overdrawn.length > 0 && (
        <div className="rounded-2xl border border-negative/30 bg-negative/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-negative">
            <VectorIcon name="alert" size={16} color="var(--color-negative)" />
            Over allowance
          </p>
          <p className="mt-1 text-xs leading-relaxed text-negative">
            {overdrawn.map((m: any) => `${m.displayName || m.email} (${formatMoney(balanceOf(m.uid), currency)})`).join(', ')}{' '}
            {overdrawn.length === 1 ? 'is' : 'are'} below zero. Top them up to clear it.
          </p>
        </div>
      )}

      {done && (
        <div className="rounded-2xl border border-positive/25 bg-positive/10 px-4 py-3 text-xs font-semibold text-positive">
          {done}
        </div>
      )}

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Wallets
            </span>
            <h3 className="mt-0.5 text-2xl font-bold tracking-tight text-body">
              {formatMoney(total, currency)}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-muted">
              Allowance left across {members.length} {members.length === 1 ? 'person' : 'people'}
            </p>
          </div>
          {isOwner && members.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => setTransferOpen(true)}>
              <VectorIcon name="arrowLeftRight" size={13} />
              Transfer
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {members.map((m: any) => {
          const balance = balanceOf(m.uid);
          const negative = balance < 0;
          const mine = m.uid === user?.uid;
          return (
            <div
              key={m.uid}
              className={`rounded-2xl border p-4 shadow-sm ${
                negative ? 'border-negative/35 bg-negative/5' : 'border-line bg-surface'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                    negative ? 'bg-negative' : 'bg-brand'
                  }`}
                >
                  {(m.displayName || m.email || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-body">
                    {m.displayName || m.email}
                    {mine && <span className="ml-1.5 text-[10px] font-bold text-faint">YOU</span>}
                  </p>
                  <p className="text-[11px] text-muted">
                    {String(m.role).toUpperCase() === 'OWNER' ? 'Head of family' : 'Member'}
                  </p>
                </div>
              </div>

              <p
                className={`mt-3 text-lg font-bold tracking-tight ${
                  negative ? 'text-negative' : 'text-body'
                }`}
              >
                {negative ? '−' : ''}
                {formatMoney(Math.abs(balance), currency)}
              </p>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setCreditFor(m.uid)}
                  className="mt-2 w-full rounded-xl border border-line bg-surface-sunken py-1.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand-light"
                >
                  Add money
                </button>
              )}
            </div>
          );
        })}
      </div>

      {decided.length > 0 && (
        <LedgerGroup title="Requests you answered">
          {decided.map((r: any, i: number) => (
            <LedgerRow key={r.id} first={i === 0}>
              <span className="min-w-0 truncate text-xs text-body">
                {nameOf(r.requestedBy)} asked for {formatMoney(r.amountMinor, currency)}
                {r.note ? ` · ${r.note}` : ''}
              </span>
              <span
                className={`shrink-0 text-xs font-bold ${
                  r.status === 'APPROVED' ? 'text-positive' : 'text-negative'
                }`}
              >
                {r.status === 'APPROVED' ? 'Approved' : 'Declined'}
              </span>
            </LedgerRow>
          ))}
        </LedgerGroup>
      )}

      {moneyIn.length > 0 && (
        <LedgerGroup title="Money in">
          {moneyIn.map((t: any, i: number) => (
            <LedgerRow key={t.id} first={i === 0}>
              <span className="min-w-0 truncate text-xs text-body">
                {t.note ? `Topped up ${nameOf(t.toUid)} · ${t.note}` : `Topped up ${nameOf(t.toUid)}`}
              </span>
              <span className="shrink-0 text-xs font-bold text-positive">
                +{formatMoney(t.amountMinor, currency)}
              </span>
            </LedgerRow>
          ))}
        </LedgerGroup>
      )}

      {transfers.length > 0 && (
        <LedgerGroup title="Transfers">
          {transfers.map((t: any, i: number) => (
            <LedgerRow key={t.id} first={i === 0}>
              <span className="min-w-0 truncate text-xs text-body">
                {nameOf(t.fromUid)} → {nameOf(t.toUid)}
                {t.note ? ` · ${t.note}` : ''}
              </span>
              <span className="shrink-0 text-xs font-bold text-body">
                {formatMoney(t.amountMinor, currency)}
              </span>
            </LedgerRow>
          ))}
        </LedgerGroup>
      )}

      {spending.length > 0 && (
        <LedgerGroup title="Spending">
          {spending.map((t: any, i: number) => (
            <LedgerRow key={t.id} first={i === 0}>
              <span className="min-w-0 truncate text-xs text-body">
                {t.description || 'Expense'}
                <span className="text-faint"> · {nameOf(t.actorUid)}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-negative">
                −{formatMoney(Math.abs(Number(t.amountMinor) || 0), currency)}
              </span>
            </LedgerRow>
          ))}
        </LedgerGroup>
      )}

      {moneyIn.length === 0 && transfers.length === 0 && spending.length === 0 && (
        <section className="rounded-3xl border border-line bg-surface px-5 py-6 text-center shadow-sm">
          <p className="text-xs font-semibold text-body">Nothing has moved yet</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Money you add, requests you approve, and expenses logged by the family all appear
            here, each naming who was on either side.
          </p>
        </section>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-faint">
        Spending is never blocked. If a note takes somebody below zero, the balance turns red
        here and the head of the family is told straight away.
      </p>

      <Modal
        open={creditFor !== null}
        onClose={close}
        title={`Add money to ${nameOf(creditFor)}`}
      >
        <div className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <Field label={`Amount (${currency})`} icon="wallet">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </Field>
          <Field label="Note (optional)" icon="edit">
            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pocket money for the week"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              busy={busy}
              onClick={() =>
                void run(
                  () => creditWallet(creditFor!, Math.round(parseFloat(amount || '0') * 100), note),
                  `Added to ${nameOf(creditFor)}'s wallet.`,
                )
              }
            >
              Add money
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={transferOpen} onClose={close} title="Move money between wallets">
        <div className="space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <Field label="From">
            <SelectInput value={fromUid} onChange={(e) => setFromUid(e.target.value)}>
              <option value="">Choose a wallet</option>
              {members.map((m: any) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName || m.email} — {formatMoney(balanceOf(m.uid), currency)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="To">
            <SelectInput value={toUid} onChange={(e) => setToUid(e.target.value)}>
              <option value="">Choose a wallet</option>
              {members
                .filter((m: any) => m.uid !== fromUid)
                .map((m: any) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName || m.email} — {formatMoney(balanceOf(m.uid), currency)}
                  </option>
                ))}
            </SelectInput>
          </Field>
          <Field label={`Amount (${currency})`} icon="arrowLeftRight">
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Note (optional)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              busy={busy}
              disabled={!fromUid || !toUid}
              onClick={() =>
                void run(
                  () => transferWallet(fromUid, toUid, Math.round(parseFloat(amount || '0') * 100), note),
                  'Money moved.',
                )
              }
            >
              Move money
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}