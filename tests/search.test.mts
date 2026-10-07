/**
 * Tests for the search parser.
 *
 * The behaviour worth protecting is not "does it match" -- it is that a query is
 * never silently ignored. A search that drops what you typed looks broken, and a
 * result list that quietly widened is harder to notice and worse. So each case
 * here pins down what the parser *understood*, not just what it returned.
 */
import { strict as assert } from 'node:assert';
import { parseQuery, matches, describeQuery } from '../src/lib/search';

const NOW = new Date('2026-03-18T09:00:00Z'); // a Wednesday
const TODAY = Math.floor(Date.UTC(2026, 2, 18) / 86_400_000);

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

const expense = {
  id: 'e1',
  description: 'Weekly groceries',
  merchant: 'BigBasket',
  notes: 'Ran out of milk',
  categoryName: 'Groceries',
  payerName: 'Gaurav',
  baseAmountMinor: 245_000, // ₹2,450.00
  currency: 'INR',
  dateEpochDay: TODAY - 1,
};

test('empty query constrains nothing', () => {
  assert.equal(matches(expense, parseQuery('', NOW)).matched, true);
});

test('a word still matches text', () => {
  assert.equal(matches(expense, parseQuery('groceries', NOW)).matched, true);
  assert.equal(matches(expense, parseQuery('nothing here', NOW)).matched, false);
});

test('a bare amount is not treated as an amount', () => {
  // "5" is far more often part of a name than a price. It must stay text.
  const parsed = parseQuery('5', NOW);
  assert.equal(parsed.amount, null);
  assert.equal(parsed.text, '5');
});

test('a currency-marked amount is read as an amount', () => {
  const parsed = parseQuery('₹2450', NOW);
  assert.equal(parsed.amount, 2450);
  assert.equal(matches(expense, parsed, NOW).matched, true);
});

test('an amount matches within one unit, not by equality', () => {
  // Nobody remembers the exact figure to the paisa; a rounding band is the
  // difference between "search works" and "search finds nothing for the number
  // they can see on screen".
  assert.equal(matches(expense, parseQuery('2449', NOW)).matched, true);
  assert.equal(matches(expense, parseQuery('2400', NOW)).matched, false);
});

test('an amount with a decimal is read in major units', () => {
  const parsed = parseQuery('₹2450.50', NOW);
  assert.equal(parsed.amount, 2450.5);
  assert.equal(matches(expense, parsed, NOW).matched, true);
});

test('thousands separators are handled', () => {
  assert.equal(parseQuery('₹12,000', NOW).amount, 12000);
});

test('a k suffix multiplies', () => {
  assert.equal(parseQuery('2.5k', NOW).amount, 2500);
});

test('today is a date, not an amount', () => {
  const parsed = parseQuery('today', NOW);
  assert.equal(parsed.range, 'today');
  assert.equal(parsed.amount, null);
  assert.equal(matches({ ...expense, dateEpochDay: TODAY }, parsed, NOW).matched, true);
  assert.equal(matches(expense, parsed, NOW).matched, false);
});

test('this month keeps only the current calendar month', () => {
  const parsed = parseQuery('this month', NOW);
  assert.equal(parsed.range, 'month');
  assert.equal(matches({ ...expense, dateEpochDay: TODAY - 40 }, parsed, NOW).matched, false);
  assert.equal(matches({ ...expense, dateEpochDay: TODAY - 2 }, parsed, NOW).matched, true);
});

test('an ISO date is read as that day', () => {
  const parsed = parseQuery('2026-03-17', NOW);
  assert.ok(parsed.from !== null);
  assert.equal(parsed.from, TODAY - 1);
  assert.equal(matches(expense, parsed, NOW).matched, true);
});

test('a d/m date is read day-first, as written in the markets this app serves', () => {
  const parsed = parseQuery('17/03', NOW);
  assert.equal(parsed.from, TODAY - 1);
});

test('a date whose first part cannot be a month is read the other way round', () => {
  const parsed = parseQuery('17/3', NOW);
  assert.equal(parsed.from, TODAY - 1);
});

test('an impossible date stays text rather than becoming a wrong date', () => {
  // "13/40" is not a date. Reading it as one would silently hide real results.
  const parsed = parseQuery('13/40', NOW);
  assert.equal(parsed.from, null);
  assert.equal(parsed.text, '13/40');
});

test('a weekday name means the most recent one', () => {
  const parsed = parseQuery('monday', NOW);
  assert.equal(parsed.from, TODAY - 2);
  assert.equal(matches({ ...expense, dateEpochDay: TODAY - 2 }, parsed, NOW).matched, true);
});

test('a date and an amount can be combined', () => {
  const parsed = parseQuery('2450 on 2026-03-17', NOW);
  assert.equal(parsed.amount, 2450);
  assert.equal(parsed.from, TODAY - 1);
  assert.equal(matches(expense, parsed, NOW).matched, true);
});

test('a failing part is reported so the empty state can explain itself', () => {
  assert.equal(matches(expense, parseQuery('₹9000', NOW)).failed, 'amount');
  assert.equal(matches(expense, parseQuery('today', NOW)).failed, 'date');
  assert.equal(matches(expense, parseQuery('zzzz', NOW)).failed, 'text');
});

test('the summary names what was understood', () => {
  const parts = describeQuery(parseQuery('₹2450 today', NOW));
  assert.ok(parts.includes('today'));
  assert.ok(parts.includes('about 2450'));
});

test('a query with only understood parts leaves no stray text', () => {
  const parsed = parseQuery('₹2450 today', NOW);
  assert.equal(parsed.text, '');
});

if (failures.length) {
  console.error(`\n${failures.length} FAILED, ${passed} passed\n`);
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  process.exit(1);
}
console.log(`\n${passed} passed, 0 failed\n`);