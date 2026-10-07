import React, { useMemo } from 'react';
import { VectorIcon } from '../vector/VectorIcons';
import { allocate, describeProblem, DEFAULT_WEIGHT, type SplitMode } from '../../lib/split';
import { formatMoney } from '../../utils/format';

const MODE_META: { key: SplitMode; label: string; hint: string }[] = [
  { key: 'EQUAL', label: 'Equal', hint: 'Everyone pays the same' },
  { key: 'PERCENT', label: 'Percent', hint: 'Everyone pays a share of the total' },
  { key: 'WEIGHT', label: 'Weight', hint: 'Shares follow a weight' },
  { key: 'EXACT', label: 'Exact', hint: 'Everyone pays an exact amount' },
];

export interface SplitEditorProps {
  members: { uid: string; displayName?: string; email?: string; defaultWeight?: number }[];
  participants: string[];
  mode: SplitMode;
  inputs: Record<string, number>;
  totalMinor: number;
  currency: string;
  onModeChange: (mode: SplitMode) => void;
  onParticipantsChange: (uids: string[]) => void;
  onInputChange: (uid: string, value: number) => void;
  /** Fills every participant's exact amount from an even split. */
  onBalanceExact: () => void;
}

/**
 * The split editor: choose how the money is shared out.
 *
 * The four modes are the Android client's, with the same allocation rules — see
 * `src/lib/split.ts`, which is a port of the phone's allocator and is tested
 * against the phone's own test cases.
 *
 * The preview is the point. Every keystroke re-allocates, so a split that does
 * not add up shows as a running total and a one-tap fix rather than as a failed
 * save, which is the difference between a ledger you can correct and one you
 * cannot.
 */
export function SplitEditor(props: SplitEditorProps) {
  const {
    members,
    participants,
    mode,
    inputs,
    totalMinor,
    currency,
    onModeChange,
    onParticipantsChange,
    onInputChange,
    onBalanceExact,
  } = props;

  const outcome = useMemo(
    () => allocate(totalMinor, participants, mode, inputs),
    [totalMinor, participants, mode, inputs],
  );

  const problem = outcome.ok ? null : describeProblem(outcome.problem, currency);
  const shares = outcome.ok ? outcome.shares : {};

  const toggle = (uid: string) => {
    onParticipantsChange(
      participants.includes(uid) ? participants.filter((u) => u !== uid) : [...participants, uid],
    );
  };

  const percentTotal = participants.reduce((sum, uid) => sum + (Number(inputs[uid]) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {MODE_META.map((meta) => (
          <button
            key={meta.key}
            type="button"
            title={meta.hint}
            onClick={() => onModeChange(meta.key)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              mode === meta.key
                ? 'border-brand/30 bg-brand-light text-brand'
                : 'border-line text-muted hover:bg-surface-sunken hover:text-body'
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {members.map((m) => {
          const on = participants.includes(m.uid);
          const uid = m.uid;
          const name = m.displayName || m.email || 'Member';
          const share = shares[uid];

          return (
            <div
              key={uid}
              className={`rounded-xl border px-3 py-2 transition-colors ${
                on ? 'border-line bg-surface' : 'border-transparent bg-surface-sunken/60 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(uid)}
                    className="size-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span className="truncate text-xs font-semibold text-body">{name}</span>
                </label>

                {on && mode !== 'EQUAL' && (
                  <InputForMode
                    mode={mode}
                    uid={uid}
                    value={inputs[uid]}
                    fallback={mode === 'WEIGHT' ? (m.defaultWeight ?? DEFAULT_WEIGHT) : 0}
                    onChange={(v) => onInputChange(uid, v)}
                  />
                )}

                {on && mode === 'EQUAL' && share !== undefined && (
                  <span className="shrink-0 text-xs font-bold text-body">
                    {formatMoney(share, currency)}
                  </span>
                )}
              </div>

              {on && mode === 'EXACT' && share !== undefined && (
                <div className="mt-1 pl-6 text-[10px] font-medium text-faint">
                  {formatMoney(share, currency)} of the note
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mode === 'PERCENT' && participants.length > 0 && (
        <p className="text-[11px] font-medium text-muted">
          Percentages total {percentTotal.toFixed(2)}%. A total under 100% is treated as a rounding
          slip and scaled up for you.
        </p>
      )}

      {mode === 'WEIGHT' && participants.length > 0 && (
        <p className="text-[11px] font-medium text-muted">
          A weight of 3 against 1 means three times the share. Anyone without one counts as 1.
        </p>
      )}

      {problem && mode === 'EXACT' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-negative/25 bg-negative/10 px-3 py-2">
          <p className="text-[11px] font-semibold text-negative">{problem}</p>
          <button
            type="button"
            onClick={onBalanceExact}
            className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-[11px] font-bold text-brand shadow-sm"
          >
            Split evenly
          </button>
        </div>
      )}

      {problem && mode !== 'EXACT' && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-negative">
          <VectorIcon name="alert" size={13} color="var(--color-negative)" />
          {problem}
        </p>
      )}
    </div>
  );
}

function InputForMode({
  mode,
  value,
  fallback,
  onChange,
}: {
  mode: SplitMode;
  uid: string;
  value: number;
  fallback: number;
  onChange: (value: number) => void;
}) {
  const shown = value === undefined || value === null || Number.isNaN(value) ? fallback : value;

  return (
    <input
      type="number"
      inputMode="decimal"
      step={mode === 'PERCENT' ? '0.01' : mode === 'WEIGHT' ? '1' : '0.01'}
      min="0"
      value={String(shown)}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      aria-label={`${mode.toLowerCase()} share`}
      className="w-20 shrink-0 rounded-lg border border-line bg-surface px-2 py-1 text-right text-xs font-bold text-body outline-none focus:border-brand"
    />
  );
}