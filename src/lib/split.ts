/**
 * The split allocator — a port of the Android client's `SplitAllocator`.
 *
 * The one guarantee this file exists to keep: **the shares always sum to the
 * total, exactly.** Not approximately, not "within a cent" — equal. When an
 * amount does not divide evenly the leftover minor units are handed out by the
 * largest-remainder rule, so rounding never systematically favours anyone: over
 * many expenses the pennies get shared rather than dumped on whoever happens to
 * be first in the list.
 *
 * The participant order is meaningful. Equal splits and remainder ties break on
 * it, so the same input always produces the same output and every device in the
 * household computes identical shares without coordinating.
 *
 * This is also not optional politeness. The Firestore rules assert
 * `splitTotalMinor == baseAmountMinor` and that the split map's keys are exactly
 * the participant list, so an inexact allocation is rejected by the server.
 *
 * Pure functions only, so it can be tested without a browser or a database.
 */

export const SPLIT_MODES = ['EQUAL', 'PERCENT', 'WEIGHT', 'EXACT'] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

/** Weights default to 1, so somebody added mid-edit takes an even share. */
export const DEFAULT_WEIGHT = 1;

/**
 * Percent totals this far below 100 are treated as a rounding artefact.
 *
 * The three-tenths problem is real: typing 33.33 three times gives 99.99, and
 * rejecting that would be technically correct and practically maddening.
 */
export const PERCENT_TOLERANCE = 0.05;

export type SplitProblem =
  | { kind: 'no-participants' }
  | { kind: 'negative-share'; uid: string }
  | { kind: 'percent-mismatch'; totalPercent: number }
  | { kind: 'invalid-weight'; uid: string }
  | { kind: 'exact-mismatch'; allocatedMinor: number; expectedMinor: number; shortfallMinor: number };

export type SplitInputs = Record<string, number>;

export type SplitOutcome =
  | { ok: true; shares: Record<string, number>; mode: SplitMode }
  | { ok: false; problem: SplitProblem };

/**
 * `floor(total / n)` for everyone, then +1 minor unit to the first
 * `total mod n` participants. Deterministic for a given input order.
 *
 * 1000 split 3 ways is 334 / 333 / 333.
 */
export function allocateEqual(totalMinor: number, participantIds: string[]): SplitOutcome {
  const n = participantIds.length;
  const base = Math.floor(totalMinor / n);
  const remainder = totalMinor % n;

  const shares: Record<string, number> = {};
  participantIds.forEach((uid, index) => {
    shares[uid] = base + (index < remainder ? 1 : 0);
  });
  return { ok: true, shares, mode: 'EQUAL' };
}

/**
 * Percentage split taking fractional inputs, e.g. `33.33`.
 *
 * A total slightly under 100 is normalised up to 100 and the slack distributed by
 * the same largest-remainder rule as everything else, so the result stays exact.
 * A total over 100 is a real error and fails.
 */
export function allocatePercent(
  totalMinor: number,
  participantIds: string[],
  percentInputs: SplitInputs,
): SplitOutcome {
  const n = participantIds.length;
  if (n === 0) return { ok: false, problem: { kind: 'no-participants' } };

  const percents = participantIds.map((uid) => {
    const value = Number(percentInputs[uid]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const totalPercent = percents.reduce((sum, p) => sum + p, 0);

  if (totalPercent > 100 + PERCENT_TOLERANCE) {
    return { ok: false, problem: { kind: 'percent-mismatch', totalPercent } };
  }

  const hundredths = percents.map((p) => {
    if (totalPercent <= 0) return Math.round(10000 / n);
    return Math.round((p * 100 * 100) / totalPercent);
  });

  const byUser: SplitInputs = {};
  participantIds.forEach((uid, index) => {
    byUser[uid] = hundredths[index];
  });

  return allocateByHundredths(totalMinor, participantIds, byUser, 'PERCENT');
}

/**
 * Largest-remainder over a relative ratio. Weights default to 1, so a
 * participant added mid-edit takes an even share until given a weight.
 */
export function allocateWeight(
  totalMinor: number,
  participantIds: string[],
  weightInputs: SplitInputs,
): SplitOutcome {
  const n = participantIds.length;
  if (n === 0) return { ok: false, problem: { kind: 'no-participants' } };

  const weights: number[] = [];
  for (const uid of participantIds) {
    const raw = weightInputs[uid];
    const weight = raw === undefined || raw === null ? DEFAULT_WEIGHT : Math.trunc(Number(raw));
    if (!Number.isFinite(weight) || weight < 1) {
      return { ok: false, problem: { kind: 'invalid-weight', uid } };
    }
    weights.push(weight);
  }
  const weightSum = weights.reduce((sum, w) => sum + w, 0);

  // Exact integer proportional shares, so a 3:1 weight split of 1000 is 750/250
  // with no floating point in the result.
  const byIndex = largestRemainder(totalMinor, n, (index) => (totalMinor * weights[index]) / weightSum);
  return { ok: true, shares: rebind(participantIds, byIndex), mode: 'WEIGHT' };
}

/**
 * Exact amounts, validated. The caller is told precisely how far off the sum is,
 * so the editor can offer a one-tap fix instead of a vague error.
 */
export function allocateExact(
  totalMinor: number,
  participantIds: string[],
  amountInputs: SplitInputs,
): SplitOutcome {
  const n = participantIds.length;
  if (n === 0) return { ok: false, problem: { kind: 'no-participants' } };

  const shares: Record<string, number> = {};
  let sum = 0;
  for (const uid of participantIds) {
    const amount = Math.trunc(Number(amountInputs[uid] ?? 0));
    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, problem: { kind: 'negative-share', uid } };
    }
    shares[uid] = amount;
    sum += amount;
  }
  if (sum !== totalMinor) {
    return {
      ok: false,
      problem: { kind: 'exact-mismatch', allocatedMinor: sum, expectedMinor: totalMinor, shortfallMinor: totalMinor - sum },
    };
  }
  return { ok: true, shares, mode: 'EXACT' };
}

/**
 * The entry point the composer uses.
 *
 * `inputs` is mode-dependent: whole percent for PERCENT, a weight ratio for
 * WEIGHT, exact minor amounts for EXACT. EQUAL takes no input at all.
 */
export function allocate(
  totalMinor: number,
  participantIds: string[],
  mode: SplitMode,
  inputs: SplitInputs = {},
): SplitOutcome {
  if (participantIds.length === 0) return { ok: false, problem: { kind: 'no-participants' } };
  // A negative total is nonsense in every mode, and letting it through would make
  // floor() and the leftover arithmetic disagree about the sign.
  if (totalMinor < 0) {
    return { ok: false, problem: { kind: 'negative-share', uid: participantIds[0] } };
  }
  switch (mode) {
    case 'EQUAL':
      return allocateEqual(totalMinor, participantIds);
    case 'PERCENT':
      return allocatePercent(totalMinor, participantIds, inputs);
    case 'WEIGHT':
      return allocateWeight(totalMinor, participantIds, inputs);
    case 'EXACT':
      return allocateExact(totalMinor, participantIds, inputs);
  }
}

/**
 * A message for the composer to show.
 *
 * Splitting that does not add up is an ordinary intermediate state while somebody
 * is typing, not a crash -- so these are values the UI renders rather than
 * exceptions thrown on every keystroke.
 */
export function describeProblem(problem: SplitProblem, currency = 'INR'): string {
  switch (problem.kind) {
    case 'no-participants':
      return 'Choose at least one person to split with.';
    case 'negative-share':
      return 'A share cannot be negative.';
    case 'percent-mismatch':
      return `Percentages add up to ${problem.totalPercent.toFixed(2)}%. They must not exceed 100%.`;
    case 'invalid-weight':
      return 'Every weight must be at least 1.';
    case 'exact-mismatch':
      return problem.shortfallMinor === 0
        ? ''
        : problem.shortfallMinor > 0
          ? `${money(problem.shortfallMinor, currency)} left to allocate.`
          : `${money(-problem.shortfallMinor, currency)} over-allocated.`;
  }
}

function money(minor: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${Math.abs(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Shares out `totalMinor` against weights that already sum to 10000 (hundredths of a percent). */
function allocateByHundredths(
  totalMinor: number,
  participantIds: string[],
  hundredths: SplitInputs,
  mode: SplitMode,
): SplitOutcome {
  const n = participantIds.length;
  const sum = Math.max(
    1,
    participantIds.reduce((acc, uid) => acc + (hundredths[uid] || 0), 0),
  );
  const byIndex = largestRemainder(totalMinor, n, (index) => (totalMinor * (hundredths[participantIds[index]] || 0)) / sum);
  return { ok: true, shares: rebind(participantIds, byIndex), mode };
}

/** Rebinds an index-keyed allocation to user ids, preserving input order. */
function rebind(participantIds: string[], byIndex: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  participantIds.forEach((uid, index) => {
    out[uid] = byIndex[index] ?? 0;
  });
  return out;
}

/**
 * Distributes `totalMinor` across `n` slots according to `idealShare(index)`.
 *
 * The algorithm, and the reason the result is always exact:
 *  1. floor every ideal share,
 *  2. the floors are short by `leftover` minor units,
 *  3. hand each leftover unit to whoever lost the most in the flooring step —
 *     that is the largest-remainder rule, and it makes rounding error cancel out
 *     on average instead of accruing on one person,
 *  4. break ties on input order, so the output is deterministic.
 *
 * `floor` is the only rounding applied to the shares themselves, and floor can
 * never over-allocate: the floors sum to at most `totalMinor`. Therefore `leftover`
 * is never negative, and step 3 can only ever hand out units that were genuinely
 * left over. That is the proof the shares sum to `totalMinor`.
 */
function largestRemainder(
  totalMinor: number,
  n: number,
  idealShare: (index: number) => number,
): number[] {
  const floor: number[] = new Array(n);
  const remainder: number[] = new Array(n);

  let distributed = 0;
  for (let i = 0; i < n; i++) {
    const ideal = idealShare(i);
    const base = Math.floor(ideal);
    if (!Number.isFinite(base) || base > Number.MAX_SAFE_INTEGER) {
      floor[i] = 0;
    } else {
      floor[i] = base;
    }
    remainder[i] = ideal - floor[i];
    distributed += floor[i];
  }

  let leftover = totalMinor - distributed;

  // Highest fractional part first. The tie-break on the original index is what
  // makes equal fractions fall back to input order.
  const order = [...Array(n).keys()].sort((a, b) => remainder[b] - remainder[a] || a - b);
  for (const i of order) {
    if (leftover === 0) break;
    floor[i] += 1;
    leftover--;
  }

  return floor;
}