/**
 * The balance engine.
 *
 * Given a household's expenses and settlements, work out what each member is
 * owed, who owes whom, and the smallest set of payments that would clear
 * everything.
 *
 * All amounts are integers in the household's *base currency* minor units.
 * Multi-currency expenses are converted once, when they are saved, and the
 * resulting `baseAmountMinor` is a permanent snapshot — so a historical balance
 * never shifts because an exchange rate moved.
 *
 * Pure functions only.
 */

export type LedgerExpense = {
  id: string;
  paidBy: string;
  baseAmountMinor: number;
  /** uid -> that person's share, in base currency minor units. */
  splits: Record<string, number>;
  /**
   * Epoch milliseconds, as Firestore stores it. Present for the caller's own
   * filtering; nothing here reads it.
   */
  createdAt?: number;
  deletedAt?: number | null;
};

export type LedgerSettlement = {
  id: string;
  fromUid: string;
  toUid: string;
  baseAmountMinor: number;
  createdAt?: number;
  deletedAt?: number | null;
};

export type Transfer = {
  fromUid: string;
  toUid: string;
  amountMinor: number;
};

export type BalanceResult = {
  /** uid -> net position. Positive means the household owes them. */
  net: Record<string, number>;
  /** `owes[a][b]` = how much `a` owes `b`, after mutual debts are netted off. */
  owes: Record<string, Record<string, number>>;
  /** Minimal set of payments that would settle every balance to zero. */
  transfers: Transfer[];
  /** Sum of every expense in the period. */
  totalSpend: number;
  /** Sum of every settlement. */
  totalSettled: number;
  /** Half the sum of absolute net positions: the amount still in dispute. */
  outstanding: number;
};

const isLive = <T extends { deletedAt?: number | null }>(row: T): boolean =>
  !row.deletedAt || row.deletedAt === null;

export function computeBalances(
  memberIds: readonly string[],
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[],
): BalanceResult {
  const net: Record<string, number> = {};
  for (const uid of memberIds) net[uid] = 0;

  const bump = (uid: string, delta: number) => {
    net[uid] = (net[uid] ?? 0) + delta;
  };

  let totalSpend = 0;

  for (const e of expenses) {
    if (!isLive(e)) continue;
    totalSpend += e.baseAmountMinor;

    // The split map is the source of truth for who owes what, so the payer's
    // credit is derived from it rather than from `baseAmountMinor`. Firestore
    // rules already require the two to match; deriving from the splits keeps the
    // zero-sum invariant true even if a malformed row ever slips through, which
    // matters because a broken ledger is much worse than a slightly odd report.
    let owed = 0;
    for (const [uid, share] of Object.entries(e.splits)) {
      if (!Number.isFinite(share) || share <= 0) continue;
      owed += share;
      // Each sharer is debited their own share...
      bump(uid, -share);
    }

    // ...and the payer is credited what the group owes them. The payer's own
    // share is already netted out by the debit above.
    if (owed > 0) bump(e.paidBy, owed);
  }

  let totalSettled = 0;

  for (const s of settlements) {
    if (!isLive(s) || !Number.isFinite(s.baseAmountMinor) || s.baseAmountMinor === 0) continue;
    totalSettled += s.baseAmountMinor;
    // Money moved from `fromUid` to `toUid`: the debtor's balance improves, the
    // creditor's claim shrinks.
    bump(s.fromUid, s.baseAmountMinor);
    bump(s.toUid, -s.baseAmountMinor);
  }

  // `net` is the authoritative position. The transfer plan is derived from it
  // rather than from the pairwise graph, because the graph does not know about
  // settlements — deriving from `net` guarantees that following the plan really
  // does bring every balance to zero.
  const transfers = settleFromNet(net);

  // Present the plan back as a pairwise matrix so callers can ask "does A owe
  // B?" without re-deriving anything. It is consistent with `transfers` by
  // construction.
  const settled: Record<string, Record<string, number>> = {};
  for (const t of transfers) {
    if (!settled[t.fromUid]) settled[t.fromUid] = {};
    settled[t.fromUid]![t.toUid] = t.amountMinor;
  }

  return {
    net,
    owes: settled,
    transfers,
    totalSpend,
    totalSettled,
    outstanding: Object.values(net).reduce((sum, v) => sum + Math.abs(v), 0) / 2,
  };
}

/**
 * Cancel out mutual debts: if A owes B 100 and B owes A 60, the household only
 * needs A -> B for 40. Without this step, the settle-up screen would tell
 * people to pay money that cancels out anyway.
 */
export function netPairwiseDebts(
  owes: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};

  for (const a of Object.keys(owes)) {
    for (const b of Object.keys(owes[a])) {
      if (a === b) continue;
      const forward = owes[a][b] ?? 0;
      const backward = owes[b]?.[a] ?? 0;
      const netAmount = forward - backward;
      if (netAmount > 0) {
        if (!out[a]) out[a] = {};
        out[a][b] = netAmount;
      }
    }
  }

  return out;
}

/**
 * Turn net positions into the smallest practical set of payments.
 *
 * Everyone with a negative balance needs to pay out, everyone with a positive
 * balance needs to be paid. Matching the largest debtor against the largest
 * creditor each step never produces a circular payment and never uses more than
 * `n - 1` transfers for `n` members.
 *
 * This is the authoritative settlement plan, derived from the balances
 * themselves, so applying it always brings every balance to exactly zero.
 */
export function settleFromNet(net: Record<string, number>): Transfer[] {
  const debtors: { uid: string; amount: number }[] = [];
  const creditors: { uid: string; amount: number }[] = [];

  for (const [uid, value] of Object.entries(net)) {
    if (!Number.isFinite(value) || value === 0) continue;
    if (value < 0) debtors.push({ uid, amount: -value });
    else creditors.push({ uid, amount: value });
  }

  // Largest first. The uid tie-break keeps the output deterministic.
  debtors.sort((a, b) => b.amount - a.amount || a.uid.localeCompare(b.uid));
  creditors.sort((a, b) => b.amount - a.amount || a.uid.localeCompare(b.uid));

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;

    // A member can never be both owing and owed once balances are net, but
    // never emit a self-payment even if malformed input says otherwise.
    if (debtor.uid === creditor.uid) {
      if (debtor.amount <= creditor.amount) i += 1;
      else j += 1;
      continue;
    }

    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) {
      transfers.push({ fromUid: debtor.uid, toUid: creditor.uid, amountMinor: amount });
      debtor.amount -= amount;
      creditor.amount -= amount;
    }

    if (debtor.amount === 0) i += 1;
    if (creditor.amount === 0) j += 1;
  }

  return transfers;
}

/**
 * Convenience wrapper for callers that start from a raw debt graph rather than
 * from balances: cancel mutual debts first, then settle what is left.
 */
export function simplifyDebts(owes: Record<string, Record<string, number>>): Transfer[] {
  const netted = netPairwiseDebts(owes);

  const net: Record<string, number> = {};
  const bump = (uid: string, delta: number) => {
    net[uid] = (net[uid] ?? 0) + delta;
  };

  for (const [a, targets] of Object.entries(netted)) {
    for (const [b, amount] of Object.entries(targets)) {
      if (amount <= 0) continue;
      bump(a, -amount);
      bump(b, amount);
    }
  }

  return settleFromNet(net);
}

/** Convenience: what one member's position is, defaulting to 0 when unknown. */
export function netOf(result: BalanceResult, uid: string): number {
  return result.net[uid] ?? 0;
}

/**
 * Split `result` into the "you are owed" and "you owe" sides for one viewer.
 */
export function positionFor(
  result: BalanceResult,
  uid: string,
): { owedToYou: Transfer[]; youOwe: Transfer[] } {
  return {
    owedToYou: result.transfers.filter((t) => t.toUid === uid),
    youOwe: result.transfers.filter((t) => t.fromUid === uid),
  };
}
