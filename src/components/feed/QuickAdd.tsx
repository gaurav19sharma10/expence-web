import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VectorIcon } from '../vector/VectorIcons';
import { Banner, Button, TextArea, TextInput } from '../ui/Field';
import { NOTE_COLORS } from '../../lib/notes';
import { SplitEditor } from './SplitEditor';
import { allocate, allocateEqual, describeProblem, type SplitMode } from '../../lib/split';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { formatMoney } from '../../utils/format';

/**
 * The "take an expense note" bar.
 *
 * Collapsed it is a single line that invites a tap, which is the interaction the
 * whole design is built around: an expense is a note, and a note is written in
 * place. Expanded it reveals the fields inline rather than opening a dialog,
 * because the reference's whole point is that adding an expense costs one tap.
 *
 * Splits are equal-only here. The split modes exist on the Android client and in
 * the data model, but the reference's composer offers a single equal split, and
 * matching the reference is the brief. The field is still written as a full
 * splits map because that is what the Firestore rules validate.
 */
export function QuickAdd({ onAdded }: { onAdded?: () => void }) {
  const { user } = useAuth();
  const { household, members, categories, addExpense } = useHousehold();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0].hex);
  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUAL');
  const [splitInputs, setSplitInputs] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (members.length && participants.length === 0) {
      setParticipants(members.map((m: any) => m.uid));
    }
  }, [members, participants.length]);

  // Collapse on an outside click only while there is nothing typed, so a stray
  // tap cannot throw away a half-written expense.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      if (boxRef.current?.contains(e.target as Node)) return;
      if (!description.trim() && !amount.trim() && !merchant.trim() && !notes.trim()) {
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, description, amount, merchant, notes]);

  const expand = () => {
    setOpen(true);
    setTimeout(() => amountRef.current?.focus(), 60);
  };

  const reset = () => {
    setDescription('');
    setAmount('');
    setMerchant('');
    setNotes('');
    setError(null);
    setColor(NOTE_COLORS[0].hex);
    setSplitMode('EQUAL');
    setSplitInputs({});
  };

  const submit = async () => {
    const minor = Math.round(parseFloat(amount) * 100);
    if (!description.trim()) return setError('Give the note a title.');
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter an amount greater than zero.');
    if (!categoryId) return setError('Pick a category.');
    if (!participants.length) return setError('Choose at least one person to split with.');

    // The allocator is the single source of truth for who owes what. It is the
    // same routine the Android client runs, and the same tests cover both, so a
    // note split here and the same note split on a phone produce identical
    // shares -- which is what makes the ledger agree across devices.
    const allocation = allocate(minor, participants, splitMode, splitInputs);
    if (!allocation.ok) {
      setError(describeProblem(allocation.problem, household?.baseCurrency || 'INR'));
      return;
    }
    const splits = allocation.shares;

    setBusy(true);
    setError(null);
    try {
      await addExpense({
        description: description.trim(),
        notes: notes.trim() || null,
        amountMinor: minor,
        currency: household?.baseCurrency || 'INR',
        fxRate: 1,
        baseAmountMinor: minor,
        paidBy: user?.uid || '',
        splitMode,
        splits,
        participantIds: participants,
        splitTotalMinor: minor,
        categoryId,
        dateEpochDay: Math.floor(Date.now() / 86_400_000),
        receiptPath: null,
        merchant: merchant.trim() || null,
        recurringId: null,
        sequence: null,
        noteColor: color,
      });

      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: any) {
      setError(err?.message || 'Could not save the note.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={boxRef} className="mx-auto w-full max-w-3xl px-3 py-4">
      <div
        className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-shadow ${
          open ? 'shadow-lg' : 'hover:shadow-md'
        }`}
        style={open && color !== NOTE_COLORS[0].hex ? { background: color } : undefined}
      >
        <button
          type="button"
          onClick={expand}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium text-muted hover:text-body"
        >
          <span>Take an expense note…</span>
          <span className="flex items-center gap-3 text-faint">
            <span className="font-mono text-sm font-bold text-brand">
              {household?.baseCurrency || 'INR'}
            </span>
            <VectorIcon name="receipt" size={18} />
            <VectorIcon name="moreHorizontal" size={18} />
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 px-5 pb-5 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Title"
                    aria-label="Expense title"
                    className="w-full bg-transparent text-base font-semibold text-body outline-none placeholder:text-faint"
                  />
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setColor(NOTE_COLORS[(NOTE_COLORS.findIndex((c) => c.hex === color) + 1) % NOTE_COLORS.length].hex)}
                      title="Change note colour"
                      className="rounded-full p-1.5 text-faint hover:bg-black/5 hover:text-body"
                    >
                      <VectorIcon name="palette" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        reset();
                      }}
                      title="Discard"
                      className="rounded-full p-1.5 text-faint hover:bg-black/5 hover:text-body"
                    >
                      <VectorIcon name="close" size={16} />
                    </button>
                  </div>
                </div>

                {error && <Banner tone="error">{error}</Banner>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-black/[0.03] px-3 py-2.5 transition-colors focus-within:border-brand/40 focus-within:bg-surface">
                    <span className="font-mono text-base font-bold text-muted">
                      {household?.baseCurrency || 'INR'}
                    </span>
                    <input
                      ref={amountRef}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      aria-label="Amount"
                      className="w-full bg-transparent text-sm font-semibold text-body outline-none placeholder:text-faint"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-line bg-black/[0.03] px-3 py-2.5 transition-colors focus-within:border-brand/40 focus-within:bg-surface">
                    <VectorIcon name="home" size={16} className="text-faint" />
                    <input
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="Merchant (optional)"
                      aria-label="Merchant"
                      className="w-full bg-transparent text-sm text-body outline-none placeholder:text-faint"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          categoryId === cat.id
                            ? 'border-transparent text-white'
                            : 'border-line text-body hover:bg-black/5'
                        }`}
                        style={
                          categoryId === cat.id
                            ? { background: cat.color || 'var(--color-brand)' }
                            : undefined
                        }
                      >
                        <VectorIcon name={cat.icon || cat.name} size={13} color={categoryId === cat.id ? '#fff' : cat.color} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {members.length > 1 && (
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                      Split between
                    </p>
                    <SplitEditor
                      members={members}
                      participants={participants}
                      mode={splitMode}
                      inputs={splitInputs}
                      totalMinor={Math.round(parseFloat(amount || '0') * 100) || 0}
                      currency={household?.baseCurrency || 'INR'}
                      onModeChange={setSplitMode}
                      onParticipantsChange={setParticipants}
                      onInputChange={(uid, value) =>
                        setSplitInputs((current) => ({ ...current, [uid]: value }))
                      }
                      onBalanceExact={() => {
                        const even = allocateEqual(
                          Math.round(parseFloat(amount || '0') * 100) || 0,
                          participants,
                        );
                        setSplitInputs(even.ok ? even.shares : {});
                      }}
                    />
                  </div>
                )}

                <TextArea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add a note…"
                  aria-label="Notes"
                  className="rounded-xl border border-line bg-black/[0.03] px-3 py-2.5"
                />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-muted">
                    {participants.length > 0 && Number(amount) > 0
                      ? `${formatMoney(Math.round((parseFloat(amount) * 100) / participants.length), household?.baseCurrency || 'INR')} each`
                      : `${participants.length} ${participants.length === 1 ? 'person' : 'people'}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        reset();
                      }}
                    >
                      Close
                    </Button>
                    <Button size="sm" busy={busy} onClick={() => void submit()}>
                      Save note
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}