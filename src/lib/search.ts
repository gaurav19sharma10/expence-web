/**
 * Search that understands more than text.
 *
 * A family looking for something they already know exists cannot type a keyword:
 * they remember "about two hundred on Tuesday" or "the 1,200 one". So a query
 * here is parsed for the things a person actually types -- a date, a range, an
 * amount, a payer, a category -- and anything that is not recognised falls
 * through to the text match it always was.
 *
 * The point of parsing rather than filtering per field is that the alternatives
 * are invisible. "Search" that silently ignores what you typed looks broken,
 * whereas a result list that quietly widened is hard to notice and worse.
 *
 * Pure, and tested in `tests/search.test.mts`.
 */

export interface SearchableExpense {
  id: string;
  description?: string;
  notes?: string | null;
  merchant?: string | null;
  categoryName?: string | null;
  payerName?: string | null;
  baseAmountMinor?: number;
  currency?: string;
  /** Epoch days, matching how the ledger stores dates. */
  dateEpochDay?: number;
}

export type DateRange = 'today' | 'week' | 'month' | null;

export interface ParsedQuery {
  text: string;
  /** Bare amount in major units, if the query was just a number or ₹-prefixed one. */
  amount: number | null;
  range: DateRange;
  from: number | null;
  to: number | null;
}

const SYMBOL_MINOR: Record<string, number> = { INR: 100, JPY: 1 };

/** How far either side of "today" a bare day name reaches. */
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function todayEpochDay(now: Date): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
}

/**
 * Pulls the structured parts out of a query.
 *
 * `now` is a parameter rather than read from the clock so "today" is testable
 * and so a single render cannot disagree with itself mid-query.
 */
export function parseQuery(raw: string, now: Date = new Date()): ParsedQuery {
  let text = raw.trim();
  let amount: number | null = null;
  let range: DateRange = null;
  let from: number | null = null;
  let to: number | null = null;

  const today = todayEpochDay(now);

  // An ISO date, or an unambiguous d/m or d-m. Matched before the amount parser
  // so "12/03" is read as a date rather than as two amounts.
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    from = to = Math.floor(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]) / 86_400_000);
    text = text.replace(iso[0], ' ');
  } else {
    const dmy = text.match(/\b(\d{1,2})[/](\d{1,2})(?:[/](\d{2,4}))?\b/);
    if (dmy) {
      const year = dmy[3] ? +dmy[3] : now.getUTCFullYear();
      // d/m is the convention in the markets this app is built for, and a value
      // above 12 in the first position settles it either way.
      const first = +dmy[1];
      const second = +dmy[2];
      // Day first, as the app's markets write it. A first component above 12
      // cannot be a month, which is what settles an otherwise ambiguous date --
      // it does not change the order.
      const day = first;
      const month = second;
      const candidate = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
      // Only accept it if it is a real date: "13/40" is not a date, it is text.
      const probe = new Date(candidate * 86_400_000);
      if (probe.getUTCDate() === day && probe.getUTCMonth() === month - 1) {
        from = to = candidate;
        text = text.replace(dmy[0], ' ');
      }
    }
  }

  // Relative ranges.
  const relative = text.toLowerCase().match(/\b(today|yesterday|this week|last week|this month|last month)\b/);
  if (relative) {
    const word = relative[1];
    if (word === 'today') range = 'today';
    else if (word === 'yesterday') from = to = today - 1;
    else if (word === 'this week') range = 'week';
    else if (word === 'last week') {
      range = 'week';
      from = today - 14;
      to = today - 7;
    } else if (word === 'this month') range = 'month';
    else {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
      from = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
      to = from + new Date(now.getUTCFullYear(), now.getUTCMonth(), 0).getDate() - 1;
    }
    text = text.replace(relative[0], ' ');
  }

  // A weekday name, in or out of a range.
  const weekday = text.toLowerCase().match(/\b(?:on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekday && range === null && from === null) {
    const target = DAY_NAMES.indexOf(weekday[1]);
    // Walk a week in each direction and take the nearest match, so "friday" means
    // the Friday just gone rather than one eight days away.
    let best: number | null = null;
    for (let back = 0; back <= 7; back++) {
      const candidate = today - back;
      if (new Date(candidate * 86_400_000).getUTCDay() === target) {
        best = candidate;
        break;
      }
    }
    if (best !== null) from = to = best;
    text = text.replace(weekday[0], ' ');
  }

  // An amount, with or without a currency mark. Deliberately strict about what
  // counts as one: a bare "5" is far more often part of a name than an amount, so
  // an amount must carry a symbol, a decimal point, or grouping.
  const money = text.match(/(?:₹|\$|£|€|rs\.?\s*|inr\s*|usd\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(k)?/i);
  if (money) {
    const [matched, digits, thousands] = money;
    const bare = digits.replace(/,/g, '');
    // A short bare number stays text -- "5" is far more often part of a name than
    // a price. Three digits or more is a strong enough signal to treat as money,
    // which is what makes "2450 on 2026-03-17" work.
    const looksLikeMoney =
      /[₹$£€]|,|\./i.test(matched) || /\s*k$/i.test(matched) || thousands || bare.length >= 3;
    if (looksLikeMoney) {
      const numeric = Number(bare);
      amount = thousands ? numeric * 1000 : numeric;
      text = text.replace(matched, ' ');
    }
  }

  // Consume the glue. Stripping "2450 on 2026-03-17" down to the word "on" would
  // leave a text term that matches nothing, which reads as a broken search rather
  // than as a parsed one.
  text = text.replace(/\b(on|of|from|for|at|in|and|during|was|for)\b/gi, ' ');

  return { text: text.replace(/\s+/g, ' ').trim(), amount, range, from, to };
}

/**
 * What a parsed query means for one row, split out so the tests can read it.
 */
export interface MatchVerdict {
  matched: boolean;
  /** Parts of the query this row failed, for the "why is nothing found" line. */
  failed: 'text' | 'amount' | 'date' | null;
}

export function matches(expense: SearchableExpense, query: ParsedQuery, now: Date = new Date()): MatchVerdict {
  const today = todayEpochDay(now);
  const day = expense.dateEpochDay || 0;
  const currency = expense.currency || 'INR';
  const perMajor = SYMBOL_MINOR[currency] ?? 100;

  if (query.range === 'today' && day !== today) return { matched: false, failed: 'date' };
  if (query.range === 'week' && day > today) return { matched: false, failed: 'date' };
  if (query.range === 'month') {
    const d = new Date(day * 86_400_000);
    const n = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
    if (d.getUTCFullYear() !== n.getUTCFullYear() || d.getUTCMonth() !== n.getUTCMonth()) {
      return { matched: false, failed: 'date' };
    }
  }
  if (query.from !== null && day < query.from) return { matched: false, failed: 'date' };
  if (query.to !== null && day > query.to) return { matched: false, failed: 'date' };

  if (query.amount !== null) {
    const wanted = query.amount * perMajor;
    // Nearest whole unit, because nobody remembers to the paisa. A rounding band
    // rather than equality is the difference between "search works" and "search
    // finds nothing for the number they can see on screen".
    if (Math.abs((expense.baseAmountMinor || 0) - wanted) > perMajor) {
      return { matched: false, failed: 'amount' };
    }
  }

  if (query.text) {
    const needle = query.text.toLowerCase();
    const haystack = [
      expense.description,
      expense.notes,
      expense.merchant,
      expense.categoryName,
      expense.payerName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return { matched: false, failed: 'text' };
  }

  return { matched: true, failed: null };
}

/** A human summary of what the parser understood, for the search bar's footer. */
export function describeQuery(query: ParsedQuery): string[] {
  const parts: string[] = [];
  if (query.range === 'today') parts.push('today');
  if (query.range === 'week') parts.push('this week');
  if (query.range === 'month') parts.push('this month');
  if (query.from !== null && query.from === query.to) {
    parts.push(new Date(query.from * 86_400_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  }
  if (query.amount !== null) parts.push(`about ${query.amount}`);
  if (query.text) parts.push(`“${query.text}”`);
  return parts;
}