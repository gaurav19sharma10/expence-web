/**
 * Tests for the client-side mirror of the Firestore write rules.
 *
 * The mirror is only worth having if it denies exactly what the server denies.
 * These cases are the shapes that actually produced
 * "Missing or insufficient permissions" in the wild, plus the ones it must let
 * through.
 */
import { strict as assert } from 'node:assert';
import { explainDenial, splitHeadroom, MAX_SPLIT_PARTICIPANTS } from '../src/lib/rules';

const authUid = 'u1';
const memberIds = ['u1', 'u2', 'u3'];

const known = { authUid, memberIds };

function shape(overrides: Partial<Parameters<typeof explainDenial>[0]> = {}) {
  return {
    createdBy: authUid,
    paidBy: authUid,
    baseAmountMinor: 1000,
    splitTotalMinor: 1000,
    splits: { u1: 500, u2: 500 },
    participantIds: ['u1', 'u2'],
    ...overrides,
  };
}

let passed = 0;
const failures: string[] = [];

function test(name: string, body: () => void) {
  try {
    body();
    passed++;
  } catch (error) {
    failures.push(`${name}\n    ${(error as Error).message.split('\n')[0]}`);
  }
}

test('a well-formed split is allowed', () => {
  assert.equal(explainDenial(shape(), known), null);
});

test('the payer who is not in the split is denied, and says so', () => {
  // The real bug: the payer was hard-coded to the signed-in user while the
  // participant list was freely editable, so unticking yourself produced this.
  const message = explainDenial(
    shape({ paidBy: 'u1', participantIds: ['u2'], splits: { u2: 1000 } }),
    known,
  );
  assert.notEqual(message, null);
  assert.match(String(message), /paid has to be one of the people/i);
});

test('more than eight participants is denied, and names the ceiling', () => {
  const ids = Array.from({ length: MAX_SPLIT_PARTICIPANTS + 1 }, (_, i) => `m${i}`);
  const many = Object.fromEntries(ids.map((uid) => [uid, 1]));
  const message = explainDenial(
    shape({ splits: many, participantIds: ids, splitTotalMinor: ids.length }),
    { authUid, memberIds: ids },
  );
  assert.notEqual(message, null);
  assert.match(String(message), /at most 8/i);
});

test('a declared total that disagrees with the amount is denied', () => {
  // This is the rule's actual comparison: the two *fields*.
  const message = explainDenial(shape({ splitTotalMinor: 900 }), known);
  assert.notEqual(message, null);
  assert.match(String(message), /do not add up/i);
});

test('shares that do not sum to the total are denied, which the server cannot catch', () => {
  // Firestore cannot sum a map, so both fields can read 1000 while the individual
  // shares add to 800. The server would accept that and the ledger would be
  // quietly wrong, so it is checked here.
  const message = explainDenial(shape({ splits: { u1: 400, u2: 400 } }), known);
  assert.notEqual(message, null);
  assert.match(String(message), /do not add up/i);
});

test('a participant who is not a member is denied', () => {
  const message = explainDenial(
    shape({ splits: { u1: 500, ghost: 500 }, participantIds: ['u1', 'ghost'] }),
    known,
  );
  assert.notEqual(message, null);
  assert.match(String(message), /no longer in the family/i);
});

test('a split map whose keys differ from the participant list is denied', () => {
  const message = explainDenial(
    shape({ splits: { u1: 1000 }, participantIds: ['u1', 'u2'] }),
    known,
  );
  assert.notEqual(message, null);
  assert.match(String(message), /do not match/i);
});

test('an empty participant list is denied', () => {
  const message = explainDenial(shape({ splits: {}, participantIds: [] }), known);
  assert.notEqual(message, null);
  assert.match(String(message), /at least one/i);
});

test('a write recorded as somebody else is denied', () => {
  const message = explainDenial(shape({ createdBy: 'u2' }), known);
  assert.notEqual(message, null);
  assert.match(String(message), /somebody else/i);
});

test('the payer may be any member, not only the signed-in user', () => {
  assert.equal(
    explainDenial(shape({ paidBy: 'u2', splits: { u1: 400, u2: 600 } }), known),
    null,
  );
});

test('headroom is only reported above the ceiling', () => {
  assert.equal(splitHeadroom(3), null);
  assert.equal(splitHeadroom(MAX_SPLIT_PARTICIPANTS), null);
  assert.match(String(splitHeadroom(MAX_SPLIT_PARTICIPANTS + 1)), /8 ways/);
});

if (failures.length) {
  console.error(`\n${failures.length} FAILED, ${passed} passed\n`);
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\n${passed} passed, 0 failed\n`);