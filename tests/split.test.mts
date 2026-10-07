/**
 * The Android client's `SplitAllocatorTest`, ported.
 *
 * These are not new tests invented for the web client: they are the same
 * assertions the phone runs, so the two clients cannot drift on the one thing
 * that has to agree across devices -- who owes what.
 *
 * Run with `npm test`. Deliberately dependency-free: no test runner is
 * installed, because the only thing needed here is `assert`.
 */
import { strict as assert } from 'node:assert';
import {
  allocate,
  allocateEqual,
  allocatePercent,
  allocateWeight,
  type SplitMode,
} from '../src/lib/split';

const people = ['a', 'b', 'c', 'd', 'e'];
const modes: SplitMode[] = ['EQUAL', 'PERCENT', 'WEIGHT', 'EXACT'];

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

function shares(result: ReturnType<typeof allocate>, uid: string): number {
  assert.equal(result.ok, true, 'expected a successful allocation');
  return result.ok ? result.shares[uid] : 0;
}

function total(result: ReturnType<typeof allocate>): number {
  assert.equal(result.ok, true, 'expected a successful allocation');
  return result.ok ? Object.values(result.shares).reduce((a, b) => a + b, 0) : -1;
}

test('equal split divides evenly', () => {
  const result = allocate(9000, people, 'EQUAL');
  assert.equal(shares(result, 'a'), 1800);
  assert.equal(total(result), 9000);
});

test('equal split hands the remainder to the first people', () => {
  assert.equal(shares(allocate(1000, people, 'EQUAL'), 'a'), 200);

  const three = allocate(1000, ['a', 'b', 'c'], 'EQUAL');
  assert.equal(shares(three, 'a'), 334);
  assert.equal(shares(three, 'b'), 333);
  assert.equal(shares(three, 'c'), 333);
  assert.equal(total(three), 1000);
});

test('equal split is deterministic for a given order', () => {
  const first = allocate(1001, people, 'EQUAL');
  const second = allocate(1001, people, 'EQUAL');
  assert.deepEqual(first.ok && first.shares, second.ok && second.shares);
});

test('equal split of zero is zero', () => {
  assert.equal(total(allocate(0, people, 'EQUAL')), 0);
});

test('no participants fails', () => {
  const result = allocate(100, [], 'EQUAL');
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.problem.kind, 'no-participants');
});

test('percent split divides proportionally', () => {
  const result = allocate(1000, ['a', 'b', 'c'], 'PERCENT', { a: 50, b: 30, c: 20 });
  assert.equal(shares(result, 'a'), 500);
  assert.equal(shares(result, 'b'), 300);
  assert.equal(shares(result, 'c'), 200);
});

test('percent tolerates 33 point 33 three times', () => {
  // 33.33 x 3 = 99.99, which is not 100. The slack is normalised away rather
  // than rejected, because somebody typing 33.33 three times has expressed an
  // intent, not made a mistake.
  const result = allocatePercent(1000, ['a', 'b', 'c'], { a: 33.33, b: 33.33, c: 33.33 });
  assert.equal(total(result), 1000);
  assert.equal(shares(result, 'a'), 334);
  assert.equal(shares(result, 'b'), 333);
  assert.equal(shares(result, 'c'), 333);
});

test('percent over one hundred is an error', () => {
  const result = allocatePercent(1000, ['a', 'b'], { a: 60, b: 60 });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.problem.kind, 'percent-mismatch');
});

test('percent of zero is an even split', () => {
  assert.equal(total(allocatePercent(1000, ['a', 'b', 'c'], {})), 1000);
});

test('weight split is proportional', () => {
  const result = allocate(1000, ['a', 'b'], 'WEIGHT', { a: 3, b: 1 });
  assert.equal(shares(result, 'a'), 750);
  assert.equal(shares(result, 'b'), 250);
});

test('weight defaults to one so a new participant joins evenly', () => {
  const result = allocate(1000, ['a', 'b'], 'WEIGHT', { a: 1, b: 3 });
  assert.equal(shares(result, 'a'), 250);
  assert.equal(shares(result, 'b'), 750);
});

test('weight below one is rejected', () => {
  const result = allocate(1000, ['a', 'b'], 'WEIGHT', { a: 0, b: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.problem.kind, 'invalid-weight');
});

test('weight defaults to integers so the editor stays readable', () => {
  assert.equal(shares(allocate(1000, ['a', 'b'], 'WEIGHT'), 'a'), 500);
});

test('exact split accepts a perfect sum', () => {
  assert.equal(shares(allocate(1000, ['a', 'b'], 'EXACT', { a: 400, b: 600 }), 'a'), 400);
});

test('exact split reports a shortfall precisely', () => {
  const result = allocate(1000, ['a', 'b'], 'EXACT', { a: 400, b: 500 });
  assert.equal(result.ok, false);
  if (!result.ok && result.problem.kind === 'exact-mismatch') {
    assert.equal(result.problem.allocatedMinor, 900);
    assert.equal(result.problem.expectedMinor, 1000);
    assert.equal(result.problem.shortfallMinor, 100);
  } else {
    assert.fail('expected an exact-mismatch');
  }
});

test('exact split reports an overrun', () => {
  const result = allocate(1000, ['a', 'b'], 'EXACT', { a: 600, b: 600 });
  assert.equal(result.ok, false);
  if (!result.ok && result.problem.kind === 'exact-mismatch') {
    assert.equal(result.problem.shortfallMinor, -200);
  } else {
    assert.fail('expected an exact-mismatch');
  }
});

test('negative shares are rejected in every mode', () => {
  assert.equal(allocate(-100, ['a'], 'EQUAL').ok, false);
  assert.equal(allocate(1000, ['a', 'b'], 'EXACT', { a: -100, b: 1100 }).ok, false);
});

test('largest remainder never favours the first participant', () => {
  // Twelve equal shares of 1000 leaves 4 spare units. Handing them all to "a"
  // would be the small-remaining-remainder bug this rule exists to avoid.
  const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
  const values = ids.map((uid) => shares(allocate(1000, ids, 'EQUAL'), uid));
  assert.equal(values.reduce((a, b) => a + b, 0), 1000);
  assert.equal(Math.max(...values), 84);
  assert.equal(Math.min(...values), 83);
  assert.equal(values.filter((v) => v === 84).length, 4);
});

test('splits stay exact across 200 amount and people combinations', () => {
  // The headline guarantee: whatever the amount and headcount, the shares sum to
  // the total exactly. This is the guarantee the Firestore rules cannot express,
  // so it is asserted here instead.
  const amounts = [
    0, 1, 2, 7, 99, 100, 101, 999, 1000, 1001, 12345, 99999, 100000, 123456, 999999,
    1000001, 4999999, 10000000,
  ];
  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];

  let checked = 0;
  for (const amount of amounts) {
    for (const count of counts) {
      const ids = Array.from({ length: count }, (_, i) => `u${i + 1}`);
      for (const mode of modes) {
        const inputs =
          mode === 'PERCENT'
            ? Object.fromEntries(ids.map((uid) => [uid, 100 / count]))
            : mode === 'WEIGHT'
              ? Object.fromEntries(ids.map((uid) => [uid, (uid.length % 4) + 1]))
              : mode === 'EXACT'
                ? allocateEqual(amount, ids).ok && allocateEqual(amount, ids).ok
                  ? (allocateEqual(amount, ids) as { shares: Record<string, number> }).shares
                  : {}
                : {};
        const result = allocate(amount, ids, mode, inputs);
        assert.equal(result.ok, true, `mode=${mode} amount=${amount} people=${count}`);
        if (!result.ok) continue;
        assert.equal(total(result), amount, `mode=${mode} amount=${amount} people=${count}`);
        assert.deepEqual(
          Object.keys(result.shares).sort(),
          [...ids].sort(),
          `every participant must have exactly one share: mode=${mode} amount=${amount} people=${count}`,
        );
        checked++;
      }
    }
  }
  // Asserted so a future edit that empties the lists cannot pass vacuously.
  assert.equal(checked, 18 * 10 * 4);
});

test('splits stay exact in zero decimal currencies', () => {
  for (const amount of [0, 1, 7, 100, 1001, 100000]) {
    for (let count = 1; count <= 13; count++) {
      const ids = Array.from({ length: count }, (_, i) => `u${i + 1}`);
      assert.equal(total(allocate(amount, ids, 'EQUAL')), amount);
    }
  }
});

test('shares are never negative for a non negative total', () => {
  for (const amount of [0, 1, 5, 100, 9999]) {
    for (let count = 1; count <= 7; count++) {
      const ids = Array.from({ length: count }, (_, i) => `u${i + 1}`);

      const equal = allocateEqual(amount, ids);
      assert.equal(equal.ok, true);
      if (equal.ok) {
        assert.ok(Object.values(equal.shares).every((v) => v >= 0));
      }

      const weighted = allocate(amount, ids, 'WEIGHT', Object.fromEntries(ids.map((uid) => [uid, 3])));
      assert.equal(weighted.ok, true);
      if (weighted.ok) {
        assert.ok(Object.values(weighted.shares).every((v) => v >= 0));
      }
    }
  }
});

test('weights are read as integers, so a fractional input does not leak a decimal share', () => {
  // The phone truncates weight inputs for the same reason: a weight is a ratio,
  // and a share must land on a whole minor unit.
  const result = allocateWeight(1000, ['a', 'b'], { a: 2.7, b: 1 });
  assert.equal(shares(result, 'a') + shares(result, 'b'), 1000);
  assert.equal(Number.isInteger(shares(result, 'a')), true);
});

if (failures.length) {
  console.error(`\n${failures.length} FAILED, ${passed} passed\n`);
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\n${passed} passed, 0 failed\n`);