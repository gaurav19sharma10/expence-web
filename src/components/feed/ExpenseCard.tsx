import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VectorIcon } from '../vector/VectorIcons';
import { NOTE_COLORS, NOTE_INK } from '../../lib/notes';
import { useAuth } from '../../contexts/AuthContext';
import { useHousehold } from '../../contexts/HouseholdContext';
import { formatMoney } from '../../utils/format';

/**
 * An expense, as a note.
 *
 * The card is the design's core idea: a ledger row that reads like a sticky
 * note, so the thing you scan is the thing you wrote. Colour, pin state and the
 * action tray all live on the card, revealed on hover on a pointer device and
 * always visible on touch, because hover does not exist on a phone.
 */
export function ExpenseCard({
  expense,
  categories,
  members,
  householdId,
}: {
  expense: any;
  categories: any[];
  members: any[];
  householdId: string | null;
}) {
  const { user } = useAuth();
  const { updateExpense, deleteExpense } = useHousehold();
  const [hovered, setHovered] = useState(false);
  const [picking, setPicking] = useState(false);

  const category = categories.find((c) => c.id === expense.categoryId);
  const payer = members.find((m) => m.uid === expense.paidBy);
  const currency = expense.currency || 'INR';
  const shares = Object.keys(expense.splits || {}).length;

  const date = new Date((expense.dateEpochDay || 0) * 86_400_000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const togglePin = async () => {
    await updateExpense(expense.id, { isPinned: !expense.isPinned });
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${expense.description}"?`)) return;
    await deleteExpense(expense.id);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPicking(false);
      }}
      style={{ background: expense.noteColor || NOTE_COLORS[0].hex, color: NOTE_INK }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line p-4 shadow-xs transition-shadow hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-bold leading-snug text-gray-900 md:text-base">
              {expense.description}
            </h3>
            {expense.merchant && (
              <p className="mt-0.5 text-xs font-medium text-gray-500">at {expense.merchant}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void togglePin()}
            aria-label={expense.isPinned ? 'Unpin' : 'Pin'}
            className={`shrink-0 rounded-full p-1.5 transition-opacity hover:bg-black/5 ${
              expense.isPinned
                ? 'text-brand opacity-100'
                : hovered
                  ? 'text-gray-500 opacity-80'
                  : 'text-gray-400 opacity-0 focus:opacity-100'
            }`}
          >
            <VectorIcon name="pin" size={16} strokeWidth={expense.isPinned ? 2.4 : 1.8} />
          </button>
        </div>

        <p className="mt-2.5 text-xl font-bold tracking-tight text-gray-900">
          {formatMoney(expense.baseAmountMinor, currency)}
        </p>

        {expense.notes && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-gray-600">{expense.notes}</p>
        )}
      </div>

      <div className="mt-3.5 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full border bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold"
            style={{
              borderColor: `${category?.color || '#9CA3AF'}40`,
              color: category?.color || '#6B7280',
            }}
          >
            <VectorIcon name={category?.icon || category?.name || 'dots'} size={12} color={category?.color} />
            {category?.name || 'Uncategorised'}
          </span>
          <span className="ml-auto text-[11px] font-medium text-gray-400">{date}</span>
        </div>

        {shares > 0 && (
          <div className="flex items-center justify-between border-t border-black/5 pt-1 text-[11px] font-medium text-gray-500">
            <span className="truncate">
              Paid by <strong>{payer?.displayName || 'Someone'}</strong>
            </span>
            <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
              {shares} ways
            </span>
          </div>
        )}
      </div>

      {/* Action tray: on hover for a pointer, always for touch. */}
      <div
        className={`mt-3 flex items-center justify-between border-t border-black/5 pt-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 ${
          hovered ? 'opacity-100' : 'opacity-100 md:opacity-0'
        }`}
      >
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            aria-label="Change note colour"
            title="Change note colour"
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-800"
          >
            <VectorIcon name="palette" size={15} />
          </button>
          {picking && (
            <div className="absolute bottom-8 left-0 z-30 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-2 shadow-lg">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  aria-label={c.name}
                  onClick={() => {
                    void updateExpense(expense.id, { noteColor: c.hex });
                    setPicking(false);
                  }}
                  className="size-6 rounded-full border border-line"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          )}
        </div>

        {(user?.uid === expense.createdBy || user?.uid === householdId) && (
          <button
            type="button"
            onClick={() => void remove()}
            aria-label="Delete expense"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <VectorIcon name="trash" size={15} />
          </button>
        )}
      </div>
    </motion.article>
  );
}