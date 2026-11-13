'use client';
/**
 * Projected checking balance, day by day. The line is Rho's teal; anything below $0 is shaded red
 * and the lowest point is labelled, so the gap is obvious at a glance.
 */
import { shortDay } from '@/lib/health/dates';
import type { Forecast } from '@/lib/health/forecast';
import { formatUSDShort } from '@/lib/format';

const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export function CashChart({ forecast }: { forecast: Forecast }) {
  const s = forecast.series;
  const values = s.map(p => p.balance);
  const max = Math.max(...values, 0) * 1.1 || 1;
  const min = Math.min(...values, 0) * 1.25;
  const x = (i: number) => (i / (s.length - 1)) * 1000;
  const y = (v: number) => ((max - v) / (max - min)) * 100;
  const line = s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(2)}`).join(' ');
  const zero = y(0);
  const lowIdx = s.findIndex(p => p.date === forecast.low.date);
  const short = forecast.shortfall > 0;

  return (
    <div>
      <div className="flex">
        <div className="relative h-[190px] flex-1" style={{ backgroundImage: 'radial-gradient(circle, #dfe6e3 1px, transparent 1.3px)', backgroundSize: '12px 12px' }}>
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <clipPath id="below-zero"><rect x="0" y={zero} width="1000" height={100 - zero} /></clipPath>
            </defs>
            {short && <path d={`${line} L1000,${zero} L0,${zero} Z`} fill="#db1a2d" opacity="0.14" clipPath="url(#below-zero)" />}
            <line x1="0" x2="1000" y1={zero} y2={zero} stroke="#8f9693" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <path d={line} fill="none" stroke="#3ecfa3" strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          {/* the lowest point, as HTML so the label doesn't stretch */}
          <div className="absolute" style={{ left: `${(x(lowIdx) / 1000) * 100}%`, top: `${y(forecast.low.balance)}%`, transform: 'translate(-50%, -50%)' }}>
            <span className={`block size-3 rounded-full border-2 border-white ${short ? 'bg-negative' : 'bg-[#3ecfa3]'}`} />
          </div>
          <div
            className={`absolute rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap shadow-sm ${short ? 'bg-negative text-white' : 'bg-white text-positive ring-1 ring-[#c7ebe3]'}`}
            style={{ right: 0, top: `${Math.min(Math.max(y(forecast.low.balance) - 22, 0), 82)}%` }}
          >
            {short ? `${formatUSDShort(forecast.shortfall)} short on ${shortDay(forecast.low.date)}` : `Lowest: ${formatUSDShort(forecast.low.balance)} on ${shortDay(forecast.low.date)}`}
          </div>
          <span className="absolute left-1 text-[10px] text-muted-foreground" style={{ top: `calc(${zero}% - 14px)` }}>$0</span>
        </div>
        <div className="flex w-14 flex-col justify-between pl-3 text-[10px] text-muted-foreground tabular">
          <span>{compact.format(max)}</span><span>{compact.format((max + min) / 2)}</span><span>{compact.format(min)}</span>
        </div>
      </div>
      <div className="mt-2 mr-14 flex justify-between text-[10px] text-muted-foreground">
        {s.filter((_, i) => i % 2 === 0).map(p => <span key={p.date}>{shortDay(p.date)}</span>)}
      </div>
    </div>
  );
}
