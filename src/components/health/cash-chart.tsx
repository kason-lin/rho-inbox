'use client';
/**
 * Projected checking balance, day by day, drawn as steps (money moves on a day, then stays put).
 * Below $0 is tinted red, the invoice's due date is marked, and after approval the old line stays
 * behind as a dashed "before" line so you can see what changed.
 */
import { shortDay } from '@/lib/health/dates';
import type { Forecast } from '@/lib/health/forecast';
import { formatUSDShort } from '@/lib/format';

const W = 760, H = 250, PL = 58, PR = 16, PT = 14, PB = 30;
const STEPS = [5000, 10000, 20000, 25000, 50000, 100000, 250000];
const axis = (v: number) => (v === 0 ? '$0' : `${v < 0 ? '−' : ''}$${Math.abs(v / 1000)}K`);

export function CashChart({ forecast, before, dueDate }: { forecast: Forecast; before?: Forecast | null; dueDate?: string }) {
  const days = forecast.series.map(p => p.date);
  const all = [...forecast.series, ...(before?.series ?? [])].map(p => p.balance);
  const step = STEPS.find(s => (Math.max(...all, 0) - Math.min(...all, 0)) / s <= 6) ?? 500000;
  const min = Math.floor(Math.min(...all, 0) / step) * step - (Math.min(...all) < 0 ? step / 4 : 0);
  const max = Math.ceil(Math.max(...all, 0) / step) * step;

  const x = (i: number) => PL + (i * (W - PL - PR)) / (days.length - 1);
  const y = (v: number) => PT + ((max - v) * (H - PT - PB)) / (max - min);
  const path = (f: Forecast) => f.series.map((p, i) => (i ? `L${x(i)},${y(f.series[i - 1].balance)} L${x(i)},${y(p.balance)}` : `M${x(0)},${y(p.balance)}`)).join(' ');

  const short = forecast.shortfall > 0;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  const di = dueDate ? days.indexOf(dueDate) : -1;
  const atDue = di >= 0 ? forecast.series[di].balance : null;
  const line = short ? '#151716' : '#048d73';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
      aria-label={`Projected checking from ${shortDay(days[0])} to ${shortDay(days[days.length - 1])}; lowest ${formatUSDShort(forecast.low.balance)} on ${shortDay(forecast.low.date)}`}>
      {ticks.map(v => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#454a48' : '#e9edeb'} strokeWidth={v === 0 ? 1.2 : 1} />
          <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b716e" className="font-mono">{axis(v)}</text>
        </g>
      ))}
      {days.map((d, i) => (i % 3 === 0 || i === days.length - 1) && (
        <text key={d} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b716e" className="font-mono">{shortDay(d)}</text>
      ))}
      {min < 0 && <rect x={PL} y={y(0)} width={W - PL - PR} height={y(min) - y(0)} fill="#db1a2d" opacity="0.05" />}
      {di >= 0 && (
        <>
          <line x1={x(di)} x2={x(di)} y1={PT} y2={H - PB} stroke="#db1a2d" strokeDasharray="4 4" />
          <text x={x(di) - 6} y={PT + 12} textAnchor="end" fontSize="11" fill="#db1a2d" className="font-mono">Invoice due</text>
        </>
      )}
      {before && <path d={path(before)} fill="none" stroke="#c4cecb" strokeWidth="2" strokeDasharray="5 5" />}
      <path d={`${path(forecast)} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={short ? '#81a5a9' : '#6af3d9'} opacity="0.16" />
      <path d={path(forecast)} fill="none" stroke={line} strokeWidth="2.4" />
      {atDue !== null && (
        <>
          <circle cx={x(di)} cy={y(atDue)} r="5" fill={atDue < 0 ? '#db1a2d' : '#048d73'} stroke="#fff" strokeWidth="2" />
          <text x={x(di) - 10} y={y(atDue) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill={atDue < 0 ? '#db1a2d' : '#0d7764'} className="font-mono">
            {formatUSDShort(atDue).replace('-', '−')}
          </text>
        </>
      )}
    </svg>
  );
}

export function ChartLegend({ approved }: { approved: boolean }) {
  const items: [string, string, boolean?][] = [[approved ? '#048d73' : '#151716', 'Projected checking'], ...(approved ? [['#c4cecb', 'Before set-aside', true] as [string, string, boolean]] : []), ['#db1a2d', 'Bill due', true]];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
      {items.map(([c, l, dashed]) => (
        <span key={l} className="flex items-center gap-1.5">
          <i className="inline-block h-0 w-4 border-t-2" style={{ borderColor: c, borderStyle: dashed ? 'dashed' : 'solid' }} /> {l}
        </span>
      ))}
    </div>
  );
}
