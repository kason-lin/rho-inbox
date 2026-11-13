'use client';
/**
 * Story beats 3–4: "Show the proof" for the $55K invoice (the invoice and its email, payments due
 * before it, expected inflows, balances), then the approval sheet: move cash from treasury and schedule
 * the payment. Amount and date are editable; a live preview shows whether the gap closes.
 */
import { ArrowLeft, ArrowRight, ExternalLink, Lock, ThumbsDown, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PresenterBar } from '@/components/health/presenter-bar';
import { healthPost, useHealth } from '@/components/health/use-health';
import { Card } from '@/components/shell/page-header';
import { useViewer } from '@/components/shell/viewer';
import connections from '@/data/business-health/connections.json';
import { eachDay, longDay, shortDay } from '@/lib/health/dates';
import type { HealthView } from '@/lib/health/view';
import { formatUSD } from '@/lib/format';

export default function ProofPage() {
  const { data } = useHealth();
  const [sheet, setSheet] = useState(false);
  const router = useRouter();
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (data.approval) {
    return (
      <>
        <PresenterBar className="mb-6" />
        <p className="text-[14px]">This invoice is already covered and scheduled. <Link className="font-semibold text-brand underline" href="/business-health/done">See the receipt</Link></p>
      </>
    );
  }
  if (!data.ready || !data.invoice || !data.forecast) {
    return (
      <>
        <PresenterBar className="mb-6" />
        <p className="text-[14px]">Nothing to review yet. Jump the demo date to Nov 18.</p>
      </>
    );
  }

  const inv = data.invoice;
  const before = data.forecast.events.filter(e => e.date < inv.due && e.amount < 0);
  const inflows = data.forecast.events.filter(e => e.date <= inv.due && e.amount > 0);
  const beforeDue = data.forecast.series.find(p => p.date === shortDayIso(inv.due, -1))?.balance ?? 0;

  return (
    <>
      <PresenterBar className="mb-6" />
      <Link href="/business-health" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Business health</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div>
            <span className="rounded bg-negative-bg px-1.5 py-0.5 text-[10px] font-semibold text-negative">Money owed · Urgent</span>
            <h1 className="mt-2 text-[20px] font-semibold">{`$${inv.amount / 1000}K invoice from ${inv.vendor} is due ${longDay(inv.due)}.`}</h1>
            <p className="text-[15px]">Checking will be {formatUSD(data.gap_before)} short on the due date.</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Data as of {longDay(data.date)}, 8:00 AM · Sample data</p>
          </div>

          <Card title="The invoice">
            <div className="divide-y text-[13px]">
              <Row k="Vendor" v={inv.vendor} />
              <Row k="Invoice" v={`${inv.number} · ${formatUSD(inv.amount)}`} />
              <Row k="Sent" v={`${longDay(inv.issued)}, net ${inv.terms_days}`} />
              <Row k="Due" v={longDay(inv.due)} />
              <div className="flex items-center gap-6 px-5 py-2.5">
                <span className="w-32 shrink-0 text-muted-foreground">Source email</span>
                <Link href={`/mailbox?email=${inv.id}`} className="inline-flex items-center gap-1 text-brand hover:underline">Gmail · “{inv.subject}” <ExternalLink className="size-3" /></Link>
              </div>
              <div className="px-5 py-2.5 text-[12px] text-muted-foreground">Not in Rho Bills or the bank yet. In a real build it would be forwarded to Rho’s AP inbox, where OCR makes the draft bill.</div>
            </div>
          </Card>

          <Card title="Payments due before it">
            <ul className="divide-y text-[13px]">
              {before.map(e => <EventRow key={e.id} label={e.label} date={e.date} amount={e.amount} href={e.source.href} tool={e.source.tool} />)}
            </ul>
          </Card>

          <Card title="Expected inflows">
            <ul className="divide-y text-[13px]">
              {inflows.map(e => <EventRow key={e.id} label={e.label} date={e.date} amount={e.amount} href={e.source.href} tool={e.source.tool} />)}
            </ul>
          </Card>

          <Card title="Balances">
            <div className="divide-y text-[13px]">
              <Row k={`Checking ••${data.accounts.checking.last4}`} v={formatUSD(data.accounts.checking.balance)} />
              <Row k={`Treasury ••${data.accounts.treasury.last4}`} v={formatUSD(data.accounts.treasury.balance)} />
              <Row k={`Checking before ${shortDay(inv.due)}`} v={formatUSD(beforeDue)} />
              <div className="flex items-center gap-6 bg-negative-bg/40 px-5 py-2.5 font-semibold">
                <span className="w-32 shrink-0">After paying {shortDay(inv.due)}</span>
                <span className="text-negative">{formatUSD(-data.gap_before)}</span>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <div className="space-y-3 p-5">
              {data.suggested && (
                <p className="text-[13px]">
                  Rho suggests moving <b>{formatUSD(data.suggested.transfer_amount)}</b> from treasury (the shortfall plus a buffer) and paying {inv.vendor} on <b>{shortDay(data.suggested.pay_date)}</b>.
                </p>
              )}
              <button onClick={() => setSheet(true)} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-mint text-[13px] font-semibold text-mint-ink hover:bg-mint-hover">
                Review the fix <ArrowRight className="size-4" />
              </button>
              <button
                onClick={async () => { await healthPost('feedback', { card_id: 'money-owed', kind: 'wrong' }); router.push('/business-health'); }}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border bg-white text-[12px] font-semibold hover:bg-[#f2f5f4]"
              >
                <ThumbsDown className="size-3.5" /> This is wrong
              </button>
            </div>
          </Card>
          <Card title="Why am I seeing this?">
            <p className="px-5 py-4 text-[13px] text-ink-2">
              An invoice is due in the next 30 days, projected checking can’t cover it on its due date, and treasury can. Rho alerts 14 days before the due date, then reminds you 5 and 3 business days before if nothing’s done.
            </p>
          </Card>
        </aside>
      </div>

      {sheet && <ApprovalSheet data={data} onClose={() => setSheet(false)} />}
    </>
  );
}

/** Story beat 4: the approval sheet. Edit the amount or date; the preview updates; Approve saves it. */
function ApprovalSheet({ data, onClose }: { data: HealthView; onClose: () => void }) {
  const inv = data.invoice!;
  const { viewer } = useViewer();
  const router = useRouter();
  const [amount, setAmount] = useState(data.suggested?.transfer_amount ?? 0);
  const [payDate, setPayDate] = useState(data.suggested?.pay_date ?? inv.due);
  const [preview, setPreview] = useState<HealthView['preview']>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/health/forecast?transfer=${amount || 0}&pay_date=${payDate}`, { cache: 'no-store' })
        .then(r => r.json()).then(v => setPreview(v.preview));
    }, 200);
    return () => clearTimeout(t);
  }, [amount, payDate]);

  async function approve() {
    setBusy(true);
    try {
      await healthPost('approve', { transfer_amount: amount, pay_date: payDate, as: viewer.id });
      router.push('/business-health/done');
    } catch {
      setBusy(false);   // the error toast is already showing
    }
  }

  const days = eachDay(data.date, inv.due);
  const canApprove = viewer.role === 'admin';

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-[15px] font-semibold">Confirm</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-md hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <p className="text-[16px] leading-snug">
            Move <b>{formatUSD(amount || 0)}</b> from treasury to checking and pay {inv.vendor} <b>{formatUSD(inv.amount)}</b> on <b>{shortDay(payDate)}</b>.
          </p>

          <label className="block text-[12px] font-semibold">
            Amount to move from Treasury ••{data.accounts.treasury.last4}
            <div className="mt-1.5 flex items-center rounded-md border bg-white focus-within:ring-2 focus-within:ring-ring/40">
              <span className="pl-3 text-muted-foreground">$</span>
              <input type="number" min={0} step={1000} value={amount} onChange={e => setAmount(Number(e.target.value))} className="tabular h-10 w-full bg-transparent px-2 text-[14px] outline-none" />
            </div>
          </label>
          <label className="block text-[12px] font-semibold">
            Pay {inv.vendor} on
            <select value={payDate} onChange={e => setPayDate(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-[14px]">
              {days.map(d => <option key={d} value={d}>{longDay(d)}{d === inv.due ? ' (due date)' : ''}</option>)}
            </select>
          </label>

          <div className="divide-y rounded-lg border text-[13px]">
            <Row k="From" v={`Treasury ••${data.accounts.treasury.last4} · ${formatUSD(data.accounts.treasury.balance)}`} />
            <Row k="To" v={`Checking ••${data.accounts.checking.last4}`} />
            <Row k="Transfer settles" v="0–2 business days" />
            <Row k="Payment" v={`${formatUSD(inv.amount)} via Rho Bill Pay on ${shortDay(payDate)}`} />
            <Row k="Approver" v={`${viewer.name} (${viewer.role === 'admin' ? 'Admin' : viewer.role === 'member' ? 'Teammate' : 'Account manager'})`} />
          </div>

          {preview && (
            preview.shortfall > 0 ? (
              <p className="rounded-md bg-negative-bg px-3 py-2 text-[13px] font-medium text-negative">Still {formatUSD(preview.shortfall)} short on {shortDay(preview.low.date)}. Move more, or pay later.</p>
            ) : (
              <p className="rounded-md bg-positive-bg px-3 py-2 text-[13px] font-medium text-positive">Gap closed. Lowest checking balance: {formatUSD(preview.low.balance)} on {shortDay(preview.low.date)}.</p>
            )
          )}

          <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground"><Lock className="mt-0.5 size-3 shrink-0" /> {connections.rho_note}</p>
        </div>
        <div className="flex gap-2 border-t px-6 py-4">
          <button onClick={onClose} className="h-10 flex-1 rounded-md border bg-white text-[13px] font-semibold hover:bg-[#f2f5f4]">Cancel</button>
          <button onClick={() => void approve()} disabled={busy || !canApprove} className="h-10 flex-1 rounded-md bg-mint text-[13px] font-semibold text-mint-ink hover:bg-mint-hover disabled:opacity-50">
            {busy ? 'Approving…' : 'Approve'}
          </button>
        </div>
        {!canApprove && <p className="px-6 pb-4 text-[12px] text-muted-foreground">Only an admin can approve payments.</p>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center gap-6 px-5 py-2.5">
      <span className="w-32 shrink-0 text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}

function EventRow({ label, date, amount, href, tool }: { label: string; date: string; amount: number; href: string; tool: string }) {
  return (
    <li className="flex items-center gap-4 px-5 py-2.5">
      <span className="w-16 text-muted-foreground">{shortDay(date)}</span>
      <span className="flex-1">{label} <Link href={href} className="ml-1 text-[11px] text-brand hover:underline">({tool})</Link></span>
      <span className={`tabular ${amount > 0 ? 'text-positive' : ''}`}>{amount > 0 ? '+' : ''}{formatUSD(amount)}</span>
    </li>
  );
}

function shortDayIso(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
