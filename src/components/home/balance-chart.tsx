'use client';

const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });

/** Rho-style balance line: teal line on a dotted grid, values on the right, dates underneath. */
export function BalanceChart({ series }: { series: { date: string; balance: number }[] }) {
  if (series.length < 2) return null;
  const values = series.map(p => p.balance);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.25, hi * 0.002);
  const min = lo - pad;
  const max = hi + pad;
  const x = (i: number) => (i / (series.length - 1)) * 1000;
  const y = (v: number) => 100 - ((v - min) / (max - min)) * 100;
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(2)}`).join(' ');
  const ticks = [0, 1, 2, 3].map(i => max - ((max - min) * (i + 0.5)) / 4);
  const labels = series.filter((_, i) => i % 2 === 1);

  return (
    <div className="relative mt-4" aria-label={`Balance over the last ${series.length} days`}>
      <div className="flex">
        <div
          className="relative h-[156px] flex-1"
          style={{ backgroundImage: 'radial-gradient(circle, #dfe6e3 1px, transparent 1.3px)', backgroundSize: '12px 12px' }}
        >
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="balance-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#3ecfa3" stopOpacity="0.12" />
                <stop offset="1" stopColor="#3ecfa3" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${line} L1000,100 L0,100 Z`} fill="url(#balance-fill)" />
            <path d={line} fill="none" stroke="#3ecfa3" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex w-14 flex-col justify-around pl-3 text-[10px] text-muted-foreground tabular">
          {ticks.map(t => <span key={t}>{compact.format(t)}</span>)}
        </div>
      </div>
      <div className="mr-14 mt-2 flex justify-between text-[10px] text-muted-foreground">
        {labels.map(p => (
          <span key={p.date}>{new Date(`${p.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ))}
      </div>
    </div>
  );
}
