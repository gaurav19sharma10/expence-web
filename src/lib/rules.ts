/**
 * A client-side mirror of the Firestore rules' *write* assertions.
 *
 * This exists because of what "Missing or insufficient permissions" actually is.
 * A rules denial arrives as `permission-denied` with no field, no line and no
 * reason — the server evaluates a whole expression and reports only that it was
 * false. So a composer that produces a payload the rules reject gives the user
 * a dead button and no way to work out why.
 *
 * Every assertion below is a condition the deployed rules also enforce. Checking
 * them before the write does not replace the server — the server is still the
 * authority, and a rule it gains later will still deny this — it turns "denied,
 * good luck" into a sentence naming the thing to change.
 *
 * Kept deliberately small: only the conditions that a client can get wrong on its
 * own. Anything the rules cannot express (arithmetic over a collection) is not
 * here, and pretending otherwise would be worse than useless.
 */

/** Mirrors `participantsAreMembers`, which checks each position and stops at eight. */
export const MAX_SPLIT_PARTICIPANTS = 8;

export interface ExpenseShape {
  createdBy: string;
  paidBy: string;
  baseAmountMinor: number;
  splitTotalMinor: number;
  splits: Record<string, number>;
  participantIds: string[];
}

/**
 * Returns a message describing the first rule the payload breaks, or null when
 * it should be accepted.
 *
 * Order matters: it reports the most *fixable* problem first. "Pick who paid" is
 * worth more to somebody than "the split does not add up", which is what they
 * will discover immediately after fixing the first thing anyway.
 */
export function explainDenial(
  shape: ExpenseShape,
  known: { authUid: string; memberIds: readonly string[] },
): string | null {
  const { splits, participantIds } = shape;
  const people = new Set(participantIds);

  // `request.resource.data.createdBy == request.auth.uid`
  if (shape.createdBy !== known.authUid) {
    return 'This note would be recorded as somebody else’s. Reload and try again.';
  }

  // `request.resource.data.splits.keys().hasOnly(participantIds)` plus hasAll:
  // the two sets must be identical in both directions.
  const keys = Object.keys(splits);
  if (keys.length !== participantIds.length || keys.some((uid) => !people.has(uid))) {
    return 'The split and the list of people do not match. Pick who is sharing this note.';
  }

  // `participantsAreMembers`: at least one, and at most eight.
  if (participantIds.length === 0) {
    return 'Pick at least one person to split this note with.';
  }
  if (participantIds.length > MAX_SPLIT_PARTICIPANTS) {
    // The rules check eight positions and refuse outright rather than silently
    // stop checking, so this is a real ceiling rather than a soft one.
    return `A note can be split between at most ${MAX_SPLIT_PARTICIPANTS} people. Split it into two notes instead.`;
  }

  // `participantsAreMembers`: every participant must have a member document.
  const strangers = participantIds.filter((uid) => !known.memberIds.includes(uid));
  if (strangers.length > 0) {
    return 'Someone in this split is no longer in the family. Remove them and try again.';
  }

  // `request.resource.data.paidBy in request.resource.data.participantIds`
  //
  // The one that actually bit: the payer was always the signed-in user, and the
  // participant list was freely editable, so unticking yourself produced a payer
  // who was not in their own split. The rules could not allow it — an expense
  // whose payer owes nobody nothing does not net out.
  if (!people.has(shape.paidBy)) {
    return 'The person who paid has to be one of the people sharing this note.';
  }

  // `request.resource.data.splitTotalMinor == request.resource.data.baseAmountMinor`
  //
  // Note what this does *not* check, because it is the documented limitation of
  // the rule set: Firestore cannot sum a map, so nothing server-side confirms
  // that the individual shares add up to the total. That guarantee lives in the
  // allocator and in its tests.
  if (shape.splitTotalMinor !== shape.baseAmountMinor) {
    return 'The shares do not add up to the total of this note.';
  }

  // The sum itself, which the server cannot check. This is the one assertion here
  // that is not a rule, and it is here because getting it wrong is silent: the
  // write would be *accepted*, and the ledger would silently disagree with
  // itself. A guard costs nothing and catches an allocator regression before it
  // reaches everyone's devices.
  const summed = participantIds.reduce((sum, uid) => sum + (splits[uid] ?? 0), 0);
  if (summed !== shape.baseAmountMinor) {
    return 'The shares do not add up to the total of this note.';
  }

  return null;
}

/**
 * Guards the rules' own "more than eight" refusal so the composer can say so
 * first, rather than letting somebody fill in ten people and then finding out.
 */
export function splitHeadroom(participantCount: number): string | null {
  return participantCount > MAX_SPLIT_PARTICIPANTS
    ? `This family has ${participantCount} people, and a single note can only be split ${MAX_SPLIT_PARTICIPANTS} ways. Split it into two notes.`
    : null;
}