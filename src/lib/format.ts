const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUSD(amount: number | null | undefined): string {
  return amount == null ? '' : usd.format(amount);
}

const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** "$4,200" for whole dollars, "$4,212.50" otherwise. For headlines. */
export function formatUSDShort(amount: number): string {
  return Number.isInteger(amount) ? usdWhole.format(amount) : usd.format(amount);
}

/** 12.0 → "12", 10.714 → "10.7" */
export function oneDecimal(n: number): string {
  return String(Number(n.toFixed(1)));
}

const DAY = 86_400_000;

/** Gmail-style relative time: "just now", "12m ago", "2h ago", "Yesterday", "Mon", "Nov 3". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (then >= startOfToday) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (then >= new Date(startOfToday.getTime() - DAY)) return 'Yesterday';
  if (then >= new Date(startOfToday.getTime() - 6 * DAY)) {
    return then.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Whole days from now until `iso` (negative when it's in the past). */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY);
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
