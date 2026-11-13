'use client';
/**
 * The pop-ups on the Business health tab:
 *   ProofDrawer      why Rho flagged the invoice: the invoice, the email it came from, the math, the rule
 *   ConfirmModal     one approval, two steps (treasury → checking, then pay the invoice); amount and date editable
 *   DisputeModal     the Figma duplicate charge, with the dispute form filled in
 *   SpecialistModal  hand the card to a person at Rho
 */
import { Check, ExternalLink, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ROLE_LABEL, useViewer } from '@/components/shell/viewer';
import { shortDay } from '@/lib/health/dates';
import { mathRows, weekday } from '@/lib/health/math';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { Receipt } from './receipt';
import { Btn, Chip, Drawer, Eyebrow, MathTable, Modal } from './ui';
import { healthPost } from './use-health';

export function ProofDrawer({ data, onClose, onConfirm, onWrong }: { data: HealthView; onClose: () => void; onConfirm: () => void; onWrong: () => void }) {
  const inv = data.invoice!;
  const before = data.forecast_before ?? data.forecast!;
  const email = data.invoice_email;
  const approved = !!data.approval;
  const plan = data.suggested;
  return (
    <Drawer
      label={`Proof for the ${inv.vendor} invoice`}
      onClose={onClose}
      header={<><Chip tone={approved ? 'teal' : 'red'}>{approved ? 'Handled' : `Act · Due ${shortDay(inv.due)}`}</Chip><h3 className="mt-2 text-[18px] font-semibold">Why Rho flagged this</h3></>}
      footer={approved
        ? <Chip tone="teal"><Check className="size-3" /> Approved · payment scheduled</Chip>
        : <><Btn variant="mint" onClick={onConfirm}>Set aside {plan ? formatUSDShort(plan.transfer_amount).replace(',000', 'K') : ''} &amp; schedule</Btn><Btn onClick={onWrong}>This is wrong</Btn></>}
    >
      {approved && <Receipt data={data} />}
      <section className="space-y-2">
        <Eyebrow>The invoice</Eyebrow>
        <div className="space-y-1.5 rounded-md border p-4 text-[13px] tabular">
          <div className="flex justify-between font-semibold"><span>{inv.vendor}</span><span>{inv.number}</span></div>
          <div className="text-[12px] text-muted-foreground">Issued {shortDay(inv.issued)} · Net {inv.terms_days} · Due {shortDay(inv.due)}, {inv.due.slice(0, 4)}</div>
          {inv.lines.map(l => <div key={l.label} className="flex justify-between"><span>{l.label}</span><span>{formatUSDShort(l.amount)}</span></div>)}
          <div className="flex justify-between border-t pt-1.5 font-semibold"><span>Total</span><span>{formatUSDShort(inv.amount)}</span></div>
        </div>
      </section>
      <section className="space-y-2">
        <Eyebrow>Where it came from</Eyebrow>
        <p className="rounded-md bg-[#f7f9f8] p-3 text-[13px] text-ink-2">
          Email from {email?.from} to {email?.to}, {email ? new Date(email.received).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}.
          {' '}Read-only inbox connection. {approved ? 'Now scheduled in Rho Bills.' : 'Not in Rho Bills yet.'}
          <Link href={`/mailbox?email=${inv.id}`} className="mt-1 flex items-center gap-1 font-semibold text-brand hover:underline">Open the email <ExternalLink className="size-3" /></Link>
        </p>
      </section>
      <section className="space-y-2">
        <Eyebrow>The math{approved ? ', before your approval' : ''}</Eyebrow>
        <MathTable rows={mathRows(before)} extra={plan && !approved ? { label: 'Suggested set-aside (shortfall + buffer)', amount: plan.transfer_amount } : undefined} />
      </section>
      <section className="space-y-2">
        <Eyebrow>Why am I seeing this?</Eyebrow>
        <p className="rounded-md bg-[#f7f9f8] p-3 text-[13px] text-ink-2">
          Rule: a bill due in the next 30 days that projected checking can’t cover on its due date, while treasury can.
          Shown 14 days ahead because transfers take 0–2 business days and you may need time to approve.
        </p>
      </section>
    </Drawer>
  );
}

export function ConfirmModal({ data, onClose, onApproved }: { data: HealthView; onClose: () => void; onApproved: () => void }) {
  const { viewer } = useViewer();
  const inv = data.invoice!;
  const [amount, setAmount] = useState(data.suggested?.transfer_amount ?? 0);
  const [date, setDate] = useState(data.suggested?.pay_date ?? inv.due);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<HealthView['preview']>(null);
  const [busy, setBusy] = useState(false);

  // Re-run the forecast with the edited plan (nothing is saved until Approve).
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/health/forecast?transfer=${amount}&pay_date=${date}`, { cache: 'no-store' });
      if (res.ok) setPreview((await res.json()).preview);
    }, 200);
    return () => clearTimeout(t);
  }, [amount, date]);

  async function approve() {
    setBusy(true);
    try {
      await healthPost('approve', { transfer_amount: amount, pay_date: date, as: viewer.id });
      onApproved();
    } catch {
      setBusy(false);   // the error is already shown as a toast
    }
  }

  return (
    <Modal label="Confirm two steps" onClose={onClose}>
      <Eyebrow className="text-brand">Confirm · 2 steps</Eyebrow>
      <h3 className="-mt-2 text-[20px] font-semibold">Cover the {inv.vendor} invoice</h3>
      <ol className="divide-y rounded-md border text-[13px] tabular">
        <li className="flex items-start gap-3 p-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-[12px] font-bold text-mint-ink">1</span>
          <span className="flex-1">Treasury ••{data.accounts.treasury.last4} → Checking ••{data.accounts.checking.last4}<span className="block text-[12px] text-muted-foreground">Today · settles in 0–2 business days</span></span>
          {editing
            ? <input aria-label="Transfer amount" type="number" min={0} step={1000} value={amount} onChange={e => setAmount(Number(e.target.value))} className="h-8 w-28 rounded-md border px-2 text-right" />
            : <span className="font-semibold">{formatUSDShort(amount)}</span>}
        </li>
        <li className="flex items-start gap-3 p-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-[12px] font-bold text-mint-ink">2</span>
          <span className="flex-1">Pay {inv.vendor}<span className="block text-[12px] text-muted-foreground">Rho Bills · {editing ? 'pay on' : weekday(date)} · from Checking · draft created from the email</span>
            {editing && <input aria-label="Payment date" type="date" value={date} min={data.date} max={inv.due} onChange={e => setDate(e.target.value)} className="mt-1 h-8 rounded-md border px-2" />}
          </span>
          <span className="font-semibold">{formatUSDShort(inv.amount)}</span>
        </li>
      </ol>
      {preview && (
        <p className={`rounded-md px-3 py-2 text-[13px] font-semibold ${preview.shortfall > 0 ? 'bg-negative-bg text-negative' : 'bg-positive-subtle text-positive'}`}>
          {preview.shortfall > 0
            ? `Checking would still be ${formatUSDShort(preview.shortfall)} short on ${shortDay(preview.low.date)}.`
            : `Checking stays above zero. Lowest: ${formatUSDShort(preview.low.balance)} on ${shortDay(preview.low.date)}.`}
        </p>
      )}
      {!editing && <Btn variant="link" className="self-start" onClick={() => setEditing(true)}><Pencil /> Change amount or date</Btn>}
      <p className="rounded-md bg-[#f7f9f8] p-3 text-[12px] text-ink-2">
        Approver: {viewer.name} ({ROLE_LABEL[viewer.role]}). Logged to the audit trail. Runs on Rho’s existing transfers and bill pay.
      </p>
      <div className="flex gap-2">
        <Btn variant="dark" disabled={busy} onClick={() => void approve()} autoFocus>Approve</Btn>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function DisputeModal({ data, onClose }: { data: HealthView; onClose: () => void }) {
  const { viewer } = useViewer();
  const d = data.duplicate;
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      await healthPost('act', { card_id: d.id, action: 'dispute', as: viewer.id });
      toast.success(`Dispute sent: ${d.vendor} duplicate charge, ${formatUSDShort(d.amount)}`);
      onClose();
    } catch {
      setBusy(false);
    }
  }
  return (
    <Modal label="Dispute form" onClose={onClose}>
      <Eyebrow className="text-brand">Dispute · filled in for you</Eyebrow>
      <h3 className="-mt-2 text-[20px] font-semibold">{d.vendor} duplicate charge</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-md border p-3 text-[13px] tabular">
        <dt className="text-muted-foreground">Card</dt><dd className="text-right">••{d.card_last4} ({d.card_owner})</dd>
        <dt className="text-muted-foreground">Charges</dt><dd className="text-right">{d.charges.map(shortDay).join(' · ')}</dd>
        <dt className="text-muted-foreground">Amount disputed</dt><dd className="text-right font-semibold">{formatUSDShort(d.amount)}</dd>
        <dt className="text-muted-foreground">Reason</dt><dd className="text-right">Duplicate charge</dd>
        <dt className="text-muted-foreground">Evidence</dt><dd className="text-right">{d.evidence}</dd>
      </dl>
      <p className="rounded-md bg-[#f7f9f8] p-3 text-[12px] text-ink-2">Review and submit. It goes to Rho’s disputes team; no forms, no email chain.</p>
      <div className="flex gap-2">
        <Btn variant="dark" disabled={busy} onClick={() => void submit()}>Submit dispute</Btn>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function SpecialistModal({ onClose }: { onClose: () => void }) {
  const done = (what: string) => { toast.success(what); onClose(); };
  return (
    <Modal label="Talk to a specialist" onClose={onClose}>
      <Eyebrow className="text-brand">Talk to a specialist</Eyebrow>
      <h3 className="-mt-2 text-[20px] font-semibold">Bills &amp; payments specialist · available now</h3>
      <p className="rounded-md bg-[#f7f9f8] p-3 text-[13px] text-ink-2">They’ll see this card, the invoice and your balances, so you don’t have to explain. A person handles it; the AI only routes you.</p>
      <div className="flex gap-2">
        <Btn variant="dark" onClick={() => done('Chat started. A specialist will join in about a minute (demo).')}>Start chat</Btn>
        <Btn onClick={() => done('Call requested. Expect a call within the hour (demo).')}>Request a call</Btn>
      </div>
      <span className="text-[12px] text-muted-foreground">Your account manager is copied.</span>
    </Modal>
  );
}
