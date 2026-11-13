/**
 * "Every item links to its source": shows the exact record a timeline item came from (a Gusto pay run,
 * a Stripe payout, a Rho bill), read from the sample-data JSON, and which read-only connection provided it.
 */
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, PageHeader } from '@/components/shell/page-header';
import { DATA } from '@/lib/health/data';
import { longDay } from '@/lib/health/dates';
import { formatUSD } from '@/lib/format';

export default async function SourcePage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const record =
    type === 'payroll' ? { tool: 'Gusto (read-only)', file: 'company.json → payroll', item: DATA.company.payroll.find(p => p.id === id) }
      : type === 'payout' ? { tool: 'Stripe (read-only)', file: 'stripe-payouts.json', item: DATA.stripe.payouts.find(p => p.id === id) }
        : type === 'bill' ? { tool: 'Rho Bill Pay', file: 'company.json → bills', item: (DATA.company.bills as { id: string }[]).find(b => b.id === id) }
          : null;
  if (!record?.item) notFound();
  const item = record.item as Record<string, string | number>;

  return (
    <>
      <Link href="/business-health" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Business health</Link>
      <PageHeader title={`Source: ${record.tool}`} subtitle={<span className="flex items-center gap-1"><Lock className="size-3" /> Read from a read-only connection · Sample data ({record.file})</span>} />
      <Card>
        <dl className="divide-y text-[13px]">
          {Object.entries(item).map(([k, v]) => (
            <div key={k} className="flex gap-6 px-5 py-2.5">
              <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
              <dd className="tabular">{k === 'amount' ? formatUSD(Number(v)) : k === 'date' ? longDay(String(v)) : String(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
