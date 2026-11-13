'use client';
/**
 * "Where it goes": this month's AI, cloud and tool bills split by purpose (building the product, running
 * it for customers, operations, unassigned). Claude opens into its projects; the match check compares
 * each provider's own report with what Rho actually paid.
 */
import { ChevronDown } from 'lucide-react';
import type { SpendPurpose } from '@/lib/health/spend';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';
import { Chip, Eyebrow } from './ui';

const COLORS: Record<SpendPurpose, string> = {
  building: 'bg-mint text-mint-ink',
  running: 'bg-[#151716] text-white',
  ops: 'bg-[#81a5a9] text-white',
  unassigned: 'bg-[#dfe7e8] text-ink-2',
};
const SHORT: Record<SpendPurpose, string> = { building: 'Building', running: 'Running', ops: 'Operations', unassigned: 'Unassigned' };
const k = (n: number) => (n >= 1000 ? `$${Number((n / 1000).toFixed(1))}K` : formatUSDShort(n));

export function WhereItGoes({ spend, open, setOpen }: { spend: HealthView['spend']; open: boolean; setOpen: (o: boolean) => void }) {
  const pct = Math.round(spend.coverage * 100);
  const labels = Object.fromEntries(spend.providers.flatMap(p => p.slices.map(s => [s.purpose, s.label]))) as Record<SpendPurpose, string>;

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">This month, by purpose. From connected billing data (amount, model, key, project), matched to what Rho actually paid.</p>
        <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
          Assigned to a purpose
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e9edeb]"><span className="block h-full bg-brand" style={{ width: `${pct}%` }} /></span>
          <b className="text-foreground tabular">{pct}%</b>
        </span>
      </div>

      <div className="mt-4 space-y-2.5 tabular">
        {spend.providers.map((p, i) => (
          <div key={p.name}>
            <div className="grid grid-cols-[150px_1fr_80px] items-center gap-3 text-[13px] max-sm:grid-cols-[1fr_80px]">
              {i === 0 ? (
                <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-left font-medium hover:text-brand" aria-expanded={open}>
                  {p.name} <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
                </button>
              ) : <span className="font-medium">{p.name}</span>}
              <div className="flex h-7 overflow-hidden rounded-md max-sm:order-last max-sm:col-span-2">
                {p.slices.map(s => {
                  const w = (s.amount / p.total) * 100;
                  return (
                    <span key={s.purpose} title={`${s.label}: ${formatUSDShort(s.amount)}`} className={cn('flex items-center truncate px-2 text-[11px] font-semibold', COLORS[s.purpose])} style={{ width: `${w}%` }}>
                      {w > 22 ? `${SHORT[s.purpose]} · ${k(s.amount)}` : w > 12 ? k(s.amount) : ''}
                    </span>
                  );
                })}
              </div>
              <span className="text-right font-mono text-[12px]">{formatUSDShort(p.total)}</span>
            </div>
            {i === 0 && open && <ClaudeDetail claude={spend.claude} />}
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Eyebrow className="mb-2">Match check · provider report vs. what Rho paid</Eyebrow>
        <ul className="divide-y rounded-md border text-[13px] tabular">
          {spend.match.map(m => (
            <li key={m.name} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="w-24 font-medium">{m.name}</span>
              <span className="flex-1">
                Reported {formatUSDShort(m.reported ?? 0)} · Rho paid {formatUSDShort(m.paid)}
                {m.difference !== 0 && <span className="block text-[12px] text-muted-foreground">{formatUSDShort(Math.abs(m.difference))} not in the usage report</span>}
              </span>
              {m.difference === 0 ? <Chip tone="teal">Matches</Chip> : <Chip tone="amber">{formatUSDShort(Math.abs(m.difference))} unexplained</Chip>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
        {(['building', 'running', 'ops', 'unassigned'] as SpendPurpose[]).filter(p => labels[p]).map(p => (
          <span key={p} className="flex items-center gap-1.5"><i className={cn('size-2.5 rounded-sm', COLORS[p])} /> {labels[p]}</span>
        ))}
      </div>
    </div>
  );
}

/** The Claude bill by project, with the labelling rule and the check against the card charge. */
function ClaudeDetail({ claude }: { claude: HealthView['spend']['claude'] }) {
  return (
    <div className="mt-2 mb-3 rounded-md border bg-[#f7f9f8] p-4 text-[13px] md:ml-[162px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {claude.purposes.map(p => (
          <div key={p.purpose}>
            <div className="flex justify-between font-semibold"><span className="flex items-center gap-1.5"><i className={cn('size-2.5 rounded-sm', COLORS[p.purpose])} />{p.label}</span><span>{formatUSDShort(p.amount)}</span></div>
            <ul className="mt-1.5 space-y-1 text-ink-2">
              {p.projects.map(pr => <li key={pr.name} className="flex justify-between gap-3"><span>{pr.name}</span><span>{formatUSDShort(pr.amount)}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t pt-3 text-[12px] text-ink-2">{claude.label_rule}</p>
      <p className={cn('mt-1 text-[12px] font-semibold', claude.matches_charge ? 'text-positive' : 'text-negative')}>
        Projects add up to {formatUSDShort(claude.total_from_usage)} · card ••{claude.charge.card_last4} was charged {formatUSDShort(claude.charge.amount)} on {new Date(`${claude.charge.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
        {claude.matches_charge ? ' · exact match' : ' · does not match'}
      </p>
    </div>
  );
}
