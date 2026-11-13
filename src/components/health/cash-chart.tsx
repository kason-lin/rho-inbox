'use client';
/**
 * Projected checking, drawn exactly like Rho's Home balance chart: teal line on a dotted grid, values on
 * the right, dates underneath. Anything below $0 turns red, the lowest day gets a label, and after approval
 * the old projection stays behind as a dashed line. Hover any day to see its balance and what moved it.
 */
import { useRef, useState } from 'react';
import type { Forecast } from '@/lib/health/forecast';
import { formatUSD } from '@/lib/format';
import { cn } from 'cn';

const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const day = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
const money = (n: number) => formatUSD(n).replace('-', '−');

export function CashChart({ forecast, before, dueDate, height = 200 }: { forecast: Forecast; before?: Forecast | null; dueDate?: string; height?: number }) {
  const s = forecast.series;
  const all = [...s, ...(before?.series ?? [])].map(p => p.balance);
  const lo = Math.min(...all, 0);
  const hi = Math.max(...all, 0);
  const pad = (hi - lo) * 0.14;
  const min = lo - pad;
  const max = hi + pad;
  const x = (i: number) => (i / (s.length - 1)) * 1000;
  const y = (v: number) => 100 - ((v - min) / (max - min)) * 100;
  const path = (f: Forecast) => f.series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(2)}`).join(' ');
  const line = path(forecast);
  const zero = y(0);
  const ticks = [0, 1, 2, 3].map(i => max - ((max - min) * (i + 0.5)) / 4);

  const lowIdx = s.findIndex(p => p.date === forecast.low.date);
  const dueIdx = dueDate ? s.findIndex(p => p.date === dueDate) : -1;
  const markIdx = forecast.shortfall > 0 ? lowIdx : dueIdx >= 0 ? dueIdx : lowIdx;
  const short = forecast.shortfall > 0;

  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  function onMove(e: React.MouseEvent) {
    const r = box.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(s.length - 1, Math.round(((e.clientX - r.left) / r.width) * (s.length - 1)))));
  }
  const pct = (i: number) => `${(x(i) / 1000) * 100}%`;
  const shown = hover ?? markIdx;
  const events = forecast.events.filter(e => e.date === s[shown].date);

  return (
    <div className="relative" aria-label={`Projected checking: lowest ${money(forecast.low.balance)} on ${day(forecast.low.date, { month: 'short', day: 'numeric' })}`}>
      <div className="flex">
        <div
          ref={box}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="relative flex-1 cursor-crosshair"
          style={{ height, backgroundImage: 'radial-gradient(circle, #dfe6e3 1px, transparent 1.3px)', backgroundSize: '12px 12px' }}
        >
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="cash-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#3ecfa3" stopOpacity="0.16" />
                <stop offset="1" stopColor="#3ecfa3" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="cash-fill-red" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0" stopColor="#db1a2d" stopOpacity="0.18" />
                <stop offset="1" stopColor="#db1a2d" stopOpacity="0.02" />
              </linearGradient>
              <clipPath id="above-zero"><rect x="-10" y="-10" width="1020" height={zero + 10} /></clipPath>
              <clipPath id="below-zero"><rect x="-10" y={zero} width="1020" height={110 - zero} /></clipPath>
            </defs>
            {/* fills: teal under the line above $0, red between the line and $0 below it */}
            <path d={`${line} L1000,${Math.min(zero, 100)} L0,${Math.min(zero, 100)} Z`} fill="url(#cash-fill)" clipPath="url(#above-zero)" />
            {short && <path d={`${line} L1000,${zero} L0,${zero} Z`} fill="url(#cash-fill-red)" clipPath="url(#below-zero)" />}
            <line x1="0" x2="1000" y1={zero} y2={zero} stroke="#b8c2bf" strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {before && <path d={path(before)} fill="none" stroke="#b8c2bf" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
            <path d={line} fill="none" stroke="#3ecfa3" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#above-zero)" />
            <path d={line} fill="none" stroke="#db1a2d" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" clipPath="url(#below-zero)" />
          </svg>

          <span className="absolute left-1 -translate-y-full pb-0.5 text-[10px] text-muted-foreground" style={{ top: `${zero}%` }}>$0</span>

          {/* guide line + dot for the shown day */}
          <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#cfd8d5]" style={{ left: pct(shown) }} />
          <span
            className={cn('pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow', s[shown].balance < 0 ? 'bg-[#db1a2d]' : 'bg-[#3ecfa3]')}
            style={{ left: pct(shown), top: `${y(s[shown].balance)}%` }}
          />

          {/* tooltip, Rho-style white card */}
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg border bg-white px-3 py-2 text-[12px] shadow-[0_4px_16px_rgba(21,23,22,0.08)]"
            style={{
              left: pct(shown),
              top: `${y(s[shown].balance)}%`,
              transform: `translate(${shown > s.length * 0.6 ? 'calc(-100% - 12px)' : '12px'}, ${y(s[shown].balance) > 50 ? 'calc(-100% - 10px)' : '10px'})`,
            }}
          >
            <div className="text-[11px] text-muted-foreground">{day(s[shown].date, { weekday: 'short', month: 'short', day: 'numeric' })}{hover === null && short ? ' · lowest' : ''}</div>
            <div className={cn('tabular text-[14px] font-semibold', s[shown].balance < 0 ? 'text-negative' : 'text-foreground')}>{money(s[shown].balance)}</div>
            {events.map(e => (
              <div key={e.id} className="mt-0.5 flex justify-between gap-3 text-[11px] text-ink-2">
                <span className="truncate">{e.kind === 'invoice' ? e.label.split(' · ')[0] : e.kind === 'payroll' ? 'Payroll' : e.kind === 'payout' ? 'Stripe payout' : 'From Treasury'}</span>
                <span className={cn('tabular', e.amount > 0 && 'text-positive')}>{e.amount > 0 ? '+' : '−'}{formatUSD(Math.abs(e.amount)).replace('.00', '')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-14 flex-col justify-around pl-3 text-[10px] text-muted-foreground tabular">
          {ticks.map(t => <span key={t}>{compact.format(t).replace('-', '−')}</span>)}
        </div>
      </div>
      <div className="mt-2 mr-14 flex justify-between text-[10px] text-muted-foreground">
        {s.filter((_, i) => i % 2 === 0).map(p => <span key={p.date}>{day(p.date, { month: 'short', day: 'numeric' })}</span>)}
      </div>
    </div>
  );
}

export function ChartLegend({ approved }: { approved: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-3.5 rounded bg-[#3ecfa3]" /> Projected checking</span>
      <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-3.5 rounded bg-[#db1a2d]" /> Below $0</span>
      {approved && <span className="flex items-center gap-1.5"><i className="inline-block w-3.5 border-t-[1.5px] border-dashed border-[#b8c2bf]" /> Before your approval</span>}
    </div>
  );
}
