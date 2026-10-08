import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VectorIcon } from '../vector/VectorIcons';
import { Banner, Button } from '../ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { formatMoney } from '../../utils/format';

/**
 * The allowance bar: what is left of your own wallet, and the one button that
 * changes it.
 *
 * It sits above everything on purpose. A wallet is a number people forget they
 * have until an expense is refused, and the two ways to change it are opposite in
 * kind — the head adds to their own, a member asks for it — so both have to be
 * reachable from the same place rather than one of them buried on a screen the
 * other role never opens.
 */
export function AllowanceBar() {
  const { user, profile } = useAuth();
  const {
    household,
    members,
    wallets,
    walletRequests,
    creditWallet,
    requestMoney,
    decideRequest,
  } = useHousehold();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const currency = household?.baseCurrency || 'INR';
  const isOwner = household?.ownerUid === user?.uid;
  const myUid = user?.uid || profile?.uid || '';
  const balance = Number(wallets.find((w: any) => w.uid === myUid)?.balanceMinor) || 0;

  const pending = walletRequests.filter((r: any) => r.status === 'PENDING');
  const mine = pending.filter((r: any) => r.requestedBy === myUid);

  const nameOf = (uid: string | null) => {
    const member = members.find((m: any) => m.uid === uid);
    return member?.displayName || member?.email || 'Someone';
  };

  const submit = async () => {
    const minor = Math.round(parseFloat(amount || '0') * 100);
    if (minor <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isOwner) {
        await creditWallet(myUid, minor, note.trim() || null);
        setDone('Added to your wallet.');
      } else {
        await requestMoney(minor, note.trim() || null);
        setDone('Request sent. Nothing moves until the head approves it.');
      }
      setOpen(false);
      setAmount('');
      setNote('');
    } catch (err: any) {
      setError(err?.message || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (requestId: string, approve: boolean) => {
    setDeciding(requestId);
    setError(null);
    try {
      await decideRequest(requestId, approve);
      setDone(approve ? 'Approved — the money has moved.' : 'Request declined.');
    } catch (err: any) {
      setError(err?.message || 'Could not answer that request.');
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:gap-4 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-faint">
            Your allowance
          </span>
          <span
            className={`text-lg font-bold tracking-tight ${
              balance < 0 ? 'text-negative' : 'text-body'
            }`}
          >
            {balance < 0 ? '−' : ''}
            {formatMoney(Math.abs(balance), currency)}
          </span>

          {pending.length > 0 && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>

        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <VectorIcon name="plus" size={13} />
          {isOwner ? 'Add money' : 'Request money'}
        </Button>
      </div>

      {(done || error) && (
        <div className="mx-auto max-w-7xl px-4 pb-2 md:px-8">
          {done && <Banner tone="info">{done}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      {/* The head answers requests here rather than hunting for them on another
          screen: the decision is one tap, and requests go stale when they are
          one tap deeper than that. */}
      {isOwner && pending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mx-auto max-w-7xl space-y-2 overflow-hidden px-4 pb-3 md:px-8"
        >
          {pending.map((r: any) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-body">
                  {nameOf(r.requestedBy)} asked for this
                </p>
                {r.note && <p className="truncate text-[11px] text-muted">{r.note}</p>}
              </div>

              <span className="shrink-0 text-sm font-bold text-body">
                {formatMoney(r.amountMinor, currency)}
              </span>

              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  busy={deciding === r.id}
                  onClick={() => void decide(r.id, true)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={deciding === r.id}
                  onClick={() => void decide(r.id, false)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {!isOwner && mine.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-2 md:px-8">
          {mine.map((r: any) => (
            <p key={r.id} className="text-[11px] font-medium text-muted">
              Waiting for the head of the family: {formatMoney(r.amountMinor, currency)}
              {r.note ? ` · ${r.note}` : ''}
            </p>
          ))}
        </div>
      )}

      {open && (
        <div className="mx-auto max-w-7xl px-4 pb-3 md:px-8">
          <div className="max-w-sm space-y-2 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            {!isOwner && (
              <p className="text-[11px] font-medium text-muted">
                This sends a request. Nothing moves until the head of the family approves it.
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                aria-label={`Amount (${currency})`}
                autoFocus
                className="w-28 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-sm font-semibold text-body outline-none focus:border-brand"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isOwner ? 'Note (optional)' : 'What is it for?'}
                aria-label="Note"
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-sunken px-3 py-2 text-sm text-body outline-none focus:border-brand"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" busy={busy} onClick={() => void submit()}>
                {isOwner ? 'Add money' : 'Send request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
