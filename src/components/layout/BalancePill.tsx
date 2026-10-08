import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VectorIcon } from '../vector/VectorIcons';
import { Banner, Button } from '../ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { formatMoney } from '../../utils/format';

/** Same amber the Android pill uses, so the two clients do not disagree. */
const AMBER = '#F59E0B';

/**
 * Your allowance, as a pill beside your avatar.
 *
 * ### Why this replaced the bar
 *
 * The bar that sat above the app was sized like a headline for a number you
 * glance at once a day, and it pushed the ledger — the reason you opened the app —
 * below the fold. So the number moved next to the thing that identifies you, sized
 * like a badge, and the screen below it starts with your expenses.
 *
 * The `+` is still the whole affordance: for the head it adds to their own wallet,
 * for a member it sends a request. The two roles share one button on purpose,
 * because the button is where you already expect your balance to live.
 *
 * The circle around the `+` is the indicator, and it is the only thing on this
 * component that changes colour:
 *
 *   * **blue** — nothing waiting
 *   * **amber** — a request is waiting on you, with the count on the badge
 *   * **green** — you just approved one; it fades after a few seconds so you can
 *     see that the tap landed without it becoming permanent decoration
 */
export function BalancePill() {
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
  const [queue, setQueue] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  /** Set when a decision succeeds, cleared after the green confirmation fades. */
  const [approved, setApproved] = useState(false);

  const currency = household?.baseCurrency || 'INR';
  const isOwner = household?.ownerUid === user?.uid;
  const myUid = user?.uid || profile?.uid || '';
  const balance = Number(wallets.find((w: any) => w.uid === myUid)?.balanceMinor) || 0;
  const pending = walletRequests.filter((r: any) => r.status === 'PENDING');
  const mine = pending.filter((r: any) => r.requestedBy === myUid);

  const indicator = approved ? 'bg-positive' : pending.length > 0 ? '' : 'bg-brand';

  const nameOf = (uid: string | null) => {
    const member = members.find((m: any) => m.uid === uid);
    return member?.displayName || member?.email || 'Someone';
  };

  const flash = (message: string) => {
    setDone(message);
    setApproved(true);
    setTimeout(() => setApproved(false), 6000);
    setTimeout(() => setDone(null), 6000);
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
        flash('Added to your wallet.');
      } else {
        await requestMoney(minor, note.trim() || null);
        flash('Request sent. Nothing moves until the head approves it.');
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
      if (approve) flash('Approved — the money has moved.');
      else setDone('Request declined.');
    } catch (err: any) {
      setError(err?.message || 'Could not answer that request.');
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Confirmation lives beside the pill, not in a banner across the page. */}
      <AnimatePresence>
        {(done || error) && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="absolute right-0 top-full z-50 mt-2 w-64"
          >
            {done && <Banner tone="info">{done}</Banner>}
            {error && <Banner tone="error">{error}</Banner>}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          isOwner ? 'Add money to your allowance' : 'Ask for money from the head of the family'
        }
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-sm shadow-sm transition-colors hover:bg-surface-sunken"
      >
        <span
          className={`font-bold tabular-nums tracking-tight ${
            balance < 0 ? 'text-negative' : 'text-body'
          }`}
        >
          {balance < 0 ? '−' : ''}
          {formatMoney(Math.abs(balance), currency)}
        </span>

        {/* The indicator. A ring around the + rather than a colour swap, so the
            button stays identifiable as the same button in all three states. */}
        <span
          style={pending.length > 0 && !approved ? { backgroundColor: AMBER } : undefined}
          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-white transition-colors ${indicator}`}
        >
          <VectorIcon name="plus" size={13} />
        </span>
      </button>

      {/* A member waiting on an answer gets a quiet count. The head gets the same
          count in amber, because a request that is waiting on you is the one thing
          on this screen that needs you. */}
      {(isOwner ? pending.length > 0 : mine.length > 0) && (
        <button
          type="button"
          onClick={() => setQueue((v) => !v)}
          aria-label={`${isOwner ? pending.length : mine.length} request(s) waiting`}
          style={isOwner ? { backgroundColor: AMBER } : undefined}
          className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
            isOwner ? '' : 'bg-brand'
          }`}
        >
          {isOwner ? pending.length : mine.length}
        </button>
      )}

      <AnimatePresence>
        {queue && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 space-y-2"
          >
            {isOwner &&
              pending.map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg"
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
                    <Button size="sm" busy={deciding === r.id} onClick={() => void decide(r.id, true)}>
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

            {!isOwner &&
              mine.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg">
                  <p className="text-[11px] font-medium text-muted">
                    Waiting for the head of the family: {formatMoney(r.amountMinor, currency)}
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 top-full z-50 mt-2 w-80 space-y-2"
        >
          <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 shadow-lg">
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
        </motion.div>
      )}
    </div>
  );
}