'use client';
/**
 * The "Coming up" list: every payment in and out before the invoice is due, the checking balance after
 * each one, and a link to where it came from (the email, Gusto, Stripe or Rho).
 */
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { shortDay } from '@/lib/health/dates';
import type { Forecast } from '@/lib/health/forecast';
import { formatUSD } from '@/lib/format';
import { cn } from 'cn';

export function Timeline({ forecast, highlight }: { forecast: Forecast; highlight?: string }) {
  const balanceOn = (date: string) => forecast.series.find(p => p.date === date)?.balance ?? 0;
  return (
    <ul className="divide-y">
      <li className="flex items-center gap-4 px-5 py-2.5 text-[12px] text-muted-foreground">
        <span className="w-16">{shortDay(forecast.start)}</span>
        <span className="flex-1">Checking today</span>
        <span className="w-28 text-right tabular">{formatUSD(forecast.opening)}</span>
      </li>
      {forecast.events.map(e => {
        const inflow = e.amount > 0;
        const negativeAfter = balanceOn(e.date) < 0;
        return (
          <li key={e.id} className={cn('flex items-center gap-4 px-5 py-3 text-[13px]', highlight === e.id && 'bg-negative-bg/40')}>
            <span className="w-16 text-muted-foreground">{shortDay(e.date)}</span>
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', inflow ? 'bg-positive-bg text-positive' : 'bg-[#f2f5f4] text-ink-2')}>
              {inflow ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{e.label}</span>
              <Link href={e.source.href} className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline">
                Source: {e.source.tool} · {e.source.ref} <ExternalLink className="size-3" />
              </Link>
            </span>
            <span className={cn('w-28 text-right tabular', inflow && 'text-positive')}>{inflow ? '+' : ''}{formatUSD(e.amount)}</span>
            <span className={cn('w-28 text-right tabular text-[12px]', negativeAfter ? 'font-semibold text-negative' : 'text-muted-foreground')}>
              {formatUSD(balanceOn(e.date))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
