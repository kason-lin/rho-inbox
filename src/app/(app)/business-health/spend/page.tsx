'use client';
/**
 * Story beat 5: "Where it goes". The $50K Claude card charge, split by purpose from usage data:
 * $32K building the product vs. $18K running it for customers. Tap a slice to see the projects behind it.
 * The slices are checked against the card charge so the totals always match exactly.
 */
import { ArrowLeft, Check, CreditCard, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Card, PageHeader } from '@/components/shell/page-header';
import type { Purpose } from '@/lib/health/data';
import { longDay } from '@/lib/health/dates';
import type { SpendSplit } from '@/lib/health/spend';
import { formatUSD } from '@/lib/format';
import { cn } from 'cn';

const COLORS: Record<Purpose, string> = { building: '#5a4bd1', running: '#3ecfa3' };
const ACCOUNTING: Record<Purpose, string> = { building: 'R&D', running: 'Cost of revenue' };

export default function SpendPage() {
  const [data, setData] = useState<SpendSplit | null>(null);
  const [open, setOpen] = useState<Purpose | null>(null);

  useEffect(() => {
    fetch('/api/health/spend', { cache: 'no-store' }).then(r => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const selected = data.purposes.find(p => p.purpose === open) ?? null;

  return (
    <>
      <PresenterBar className="mb-6" />
      <Link href="/business-health" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Business health</Link>
      <PageHeader title="Where it goes: spend by purpose" subtitle={<>{data.provider} · {data.month} · <span className="font-medium text-ink-2">Sample data</span></>} />

      <Card title="This month’s bill" className="mb-7">
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-9 place-items-center rounded-full bg-[#f2f5f4]"><CreditCard className="size-4" /></span>
            <div className="flex-1 text-[13px]">
              <div className="font-semibold">{data.charge.description}</div>
              <div className="text-muted-foreground">Card ••{data.charge.card_last4} · {data.charge.card_owner} · {longDay(data.charge.date)}</div>
            </div>
            <span className="tabular text-[22px] font-medium">{formatUSD(data.charge.amount)}</span>
          </div>

          <div className="mt-5 flex h-9 overflow-hidden rounded-md">
            {data.purposes.map(p => (
              <button
                key={p.purpose}
                onClick={() => setOpen(open === p.purpose ? null : p.purpose)}
                className={cn('flex items-center justify-center text-[12px] font-semibold text-white transition-opacity', open && open !== p.purpose && 'opacity-40')}
                style={{ width: `${p.share * 100}%`, background: COLORS[p.purpose] }}
                aria-pressed={open === p.purpose}
              >
                {formatUSD(p.amount).replace('.00', '')}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.purposes.map(p => (
              <button
                key={p.purpose}
                onClick={() => setOpen(open === p.purpose ? null : p.purpose)}
                className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-left hover:bg-[#f7f9f8]', open === p.purpose && 'ring-2 ring-offset-1')}
                style={open === p.purpose ? { ['--tw-ring-color' as string]: COLORS[p.purpose] } : undefined}
              >
                <span className="size-3 rounded-full" style={{ background: COLORS[p.purpose] }} />
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold">{p.label}</span>
                  <span className="block text-[12px] text-muted-foreground">{Math.round(p.share * 100)}% · tap to see projects</span>
                </span>
                <span className="tabular text-[15px] font-semibold">{formatUSD(p.amount)}</span>
              </button>
            ))}
          </div>

          <p className={cn('mt-4 flex items-center gap-1.5 text-[12px]', data.matches_charge ? 'text-positive' : 'text-negative')}>
            <Check className="size-3.5" />
            {data.matches_charge
              ? `Matches the card charge: usage adds up to ${formatUSD(data.total_from_usage)}, and ${formatUSD(data.charge.amount)} was charged.`
              : `Doesn’t match: usage adds up to ${formatUSD(data.total_from_usage)}, but ${formatUSD(data.charge.amount)} was charged.`}
          </p>
        </div>
      </Card>

      {selected && (
        <Card
          title={<><span className="size-2.5 rounded-full" style={{ background: COLORS[selected.purpose] }} /> {selected.label}: {formatUSD(selected.amount)}</>}
          action={
            <button
              onClick={() => toast.success(`Tagged as ${ACCOUNTING[selected.purpose]}`, { description: 'In a real build this syncs to QuickBooks or NetSuite as a class.' })}
              className="flex h-[30px] items-center gap-1.5 rounded-md border bg-white px-2.5 text-[12px] font-semibold hover:bg-[#f2f5f4]"
            >
              <Tag className="size-3.5" /> Tag as {ACCOUNTING[selected.purpose]}
            </button>
          }
        >
          <ul className="divide-y">
            {selected.projects.map(pr => (
              <li key={pr.name} className="flex items-center gap-4 px-5 py-3 text-[13px]">
                <span className="flex-1 font-medium">{pr.name}</span>
                <span className="w-40">
                  <span className="block h-1.5 rounded-full bg-[#eef2f1]"><span className="block h-full rounded-full" style={{ width: `${(pr.amount / selected.amount) * 100}%`, background: COLORS[selected.purpose] }} /></span>
                </span>
                <span className="tabular w-24 text-right">{formatUSD(pr.amount)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-5 py-2.5 text-[12px] text-muted-foreground">
              <span>From Anthropic’s usage and cost report (read-only), tagged by project</span>
              <span className="tabular font-semibold text-foreground">Total {formatUSD(selected.projects.reduce((t, p) => t + p.amount, 0))}</span>
            </li>
          </ul>
        </Card>
      )}
    </>
  );
}
