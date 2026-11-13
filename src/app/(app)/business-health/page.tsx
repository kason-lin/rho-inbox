'use client';
/**
 * The Business health tab. Top to bottom:
 *   KPI tiles     checking, lowest checking in the next 2 weeks, burn, runway
 *   Coming up     projected checking (chart) and everything due, each linked to its source
 *   Needs you     3 cards at most; the $55K invoice first
 *   Where it goes AI, cloud and tool spend by purpose, with the match check
 *   Your metrics  a preview of the next phase
 * Proof opens in a side drawer; approving is a 2-step confirm with Undo.
 */
import { CheckCircle2, Clock, Plug } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { CashChart, ChartLegend } from '@/components/health/cash-chart';
import { ComingUp } from '@/components/health/coming-up';
import { NeedsYou } from '@/components/health/needs-you';
import { ConfirmModal, DisputeModal, ProofDrawer, SpecialistModal } from '@/components/health/overlays';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Btn, Chip } from '@/components/health/ui';
import { healthPost, useHealth } from '@/components/health/use-health';
import { WhereItGoes } from '@/components/health/where-it-goes';
import { Card, HeaderButton } from '@/components/shell/page-header';
import { DEMO_DATES } from '@/lib/health/data';
import { longDay, shortDay } from '@/lib/health/dates';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';

type Overlay = 'proof' | 'confirm' | 'dispute' | 'specialist' | null;

export default function BusinessHealthPage() {
  const { data } = useHealth();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [breakdown, setBreakdown] = useState(false);
  const [wrongFor, setWrongFor] = useState<string | null>(null);
  const close = useCallback(() => setOverlay(null), []);

  function approved(view: HealthView) {
    setOverlay(null);
    toast.success(`The ${view.invoice ? formatUSDShort(view.invoice.amount).replace(',000', 'K') : ''} invoice is covered and scheduled.`, {
      duration: 8000,
      action: { label: 'Undo', onClick: () => void healthPost('undo').then(() => toast('Approval undone. Nothing moved.')) },
    });
  }

  const actions = {
    confirm: () => setOverlay('confirm'),
    proof: () => setOverlay('proof'),
    dispute: () => setOverlay('dispute'),
    specialist: () => setOverlay('specialist'),
    breakdown: () => {
      setBreakdown(true);
      document.getElementById('where-it-goes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
  const moneyCard = data?.needs_you.cards.find(c => c.type === 'money_owed');

  return (
    <>
      <PresenterBar className="mb-6" />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">{data?.company ?? 'Loop Labs'} · Sample data</div>
          <h1 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight">Business health</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data && <Chip>{longDay(data.date)}</Chip>}
          {data && <Chip tone="teal">Updated {data.data_updated}</Chip>}
          <Link href="/settings/connected-tools"><HeaderButton><Plug /> Connected tools</HeaderButton></Link>
        </div>
      </div>

      {data && <Kpis data={data} />}

      {data && !data.ready && <BeforeTheAlert data={data} />}

      {data?.ready && data.forecast && (
        <>
          {data.approval && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg bg-positive-bg px-4 py-3 text-[14px] font-semibold text-positive">
              <CheckCircle2 className="size-4" /> Covered. Checking now stays above zero on {shortDay(data.invoice!.due)}.
              <Btn variant="link" className="ml-auto text-positive" onClick={actions.proof}>View receipt</Btn>
            </div>
          )}

          <div className="mb-7 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <Card title="Coming up" action={<span className="text-[12px] text-muted-foreground">Projected checking · next 2 weeks</span>}>
              <div className="px-4 pt-4 pb-2">
                <CashChart forecast={data.forecast} before={data.forecast_before} dueDate={data.invoice?.due} />
                <div className="mt-2 px-1"><ChartLegend approved={!!data.approval} /></div>
              </div>
              <div className="mt-2 border-t"><ComingUp data={data} /></div>
            </Card>

            <Card
              title="Needs you"
              action={<span className="text-[12px] text-muted-foreground">{data.needs_you.cards.length} open · max 3</span>}
            >
              <div className="p-4"><NeedsYou data={data} actions={actions} wrongFor={wrongFor} setWrongFor={setWrongFor} /></div>
            </Card>
          </div>

          <div id="where-it-goes" className="mb-7 scroll-mt-6">
            <Card title="Where it goes" action={<span className="text-[12px] text-muted-foreground">{data.spend.claude.month}</span>}>
              <WhereItGoes spend={data.spend} open={breakdown} setOpen={setBreakdown} />
            </Card>
          </div>

          <Metrics data={data} />
        </>
      )}

      {data && overlay === 'proof' && data.invoice && (
        <ProofDrawer
          data={data}
          onClose={close}
          onConfirm={() => setOverlay('confirm')}
          onWrong={() => { setOverlay(null); if (moneyCard) setWrongFor(moneyCard.id); }}
        />
      )}
      {data && overlay === 'confirm' && data.invoice && <ConfirmModal data={data} onClose={close} onApproved={() => approved(data)} />}
      {data && overlay === 'dispute' && <DisputeModal data={data} onClose={close} />}
      {overlay === 'specialist' && <SpecialistModal onClose={close} />}
    </>
  );
}

function Kpis({ data }: { data: HealthView }) {
  const k = data.kpis;
  const tiles: { label: string; value: string; sub: string; tone?: 'red' | 'teal' | 'up' }[] = [
    { label: 'Checking today', value: formatUSDShort(k.checking), sub: `+ Treasury ${formatUSDShort(k.treasury)}` },
    k.lowest
      ? { label: 'Lowest checking, next 2 weeks', value: formatUSDShort(k.lowest.balance).replace('-', '−'), sub: `on ${shortDay(k.lowest.date)}`, tone: k.lowest.balance < 0 ? 'red' : 'teal' }
      : { label: 'Lowest checking, next 2 weeks', value: '—', sub: 'Forecast starts Nov 18' },
    { label: 'Monthly burn, incl. salaries', value: formatUSDShort(k.burn), sub: `↑ ${k.burn_change}% vs. 3-month avg`, tone: 'up' },
    { label: 'Runway', value: `${k.runway} mo`, sub: `was ${k.runway_was.toFixed(1)} in October` },
  ];
  return (
    <div className="mb-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
      {tiles.map(t => (
        <div key={t.label} className="bg-white px-5 py-4">
          <div className="text-[12px] text-muted-foreground">{t.label}</div>
          <div className={cn('mt-1 text-[24px] font-medium tracking-tight tabular', t.tone === 'red' && 'text-negative', t.tone === 'teal' && 'text-positive')}>{t.value}</div>
          <div className={cn('mt-0.5 text-[12px] text-muted-foreground', t.tone === 'up' && 'text-warning')}>{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** Oct 3: the invoice is in the inbox but nowhere near due, so there's nothing to decide yet. */
function BeforeTheAlert({ data }: { data: HealthView }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mb-7">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-[13px]">
        <Clock className="size-4 text-muted-foreground" />
        <span className="flex-1">
          Rho found {data.invoice ? <>a {formatUSDShort(data.invoice.amount)} invoice from {data.invoice.vendor}, due {longDay(data.invoice.due)}</> : 'nothing due yet'}.
          {' '}It’s nowhere near due, so there’s nothing to decide yet.
        </span>
        <Btn variant="mint" disabled={busy} onClick={() => { setBusy(true); void healthPost('state', { date: DEMO_DATES.alert }).finally(() => setBusy(false)); }}>
          Jump to Wed, Nov 18 →
        </Btn>
      </div>
    </Card>
  );
}

function Metrics({ data }: { data: HealthView }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2"><h2 className="text-[14px] font-semibold">Your metrics</h2><Chip>Coming next</Chip></div>
      <div className="rounded-lg border border-dashed bg-white p-5">
        <p className="text-[13px] text-muted-foreground">Calculated your way: you pick which sources count as revenue and which costs keep it running.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {data.metrics_preview.map(m => (
            <div key={m.label}>
              <div className="text-[12px] text-muted-foreground">{m.label}</div>
              <div className="mt-1 text-[20px] font-medium tabular">{m.value}</div>
              <div className="text-[12px] text-muted-foreground">{m.note}</div>
            </div>
          ))}
        </div>
        <Btn className="mt-4" disabled>Define revenue sources · next phase</Btn>
      </div>
    </section>
  );
}
