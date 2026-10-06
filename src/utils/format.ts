import { format as formatDate, formatDistanceToNow } from 'date-fns';

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SGD: 'S$',
};

export function formatMoney(minor: number, currency: string = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${symbol}${(Math.abs(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateShort(epochDay: number): string {
  return formatDate(new Date(epochDay * 86400000), 'dd MMM yyyy');
}

export function formatDateTime(epochDay: number, timeMs: number): string {
  return formatDate(new Date(epochDay * 86400000 + timeMs), 'dd MMM yyyy HH:mm');
}

export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

export function formatNumber(num: number): string {
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}