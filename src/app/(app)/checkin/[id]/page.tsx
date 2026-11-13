'use client';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, CircleHelp, Clock, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { DataAsOf, ProofView, RoleBanner, TypeChip, ViewOnlyNote } from '@/components/checkin/shared';
import { Card } from '@/components/shell/page-header';
import { ROLE_LABEL, useViewer } from '@/components/shell/viewer';
import { Button } from '@/components/ui/button';
import { useLive } from '@/hooks/use-live';
import type { Account, Decision, PreparedAction } from '@/lib/checkin/types';
import type { CardView } from '@/lib/checkin/view';
import { send } from '@/lib/client';
import { formatUSD, shortDate } from '@/lib/format';

type Step = 'proof' | 'confirm' | 'done';
type DoneState = { headline: string; detail: string; accounts: Account[]; next: CardView | null; decision: Decision };

const RULE_NAME: Record<string, string> = {
  shortfall_7d: 'Bills and payroll due in 7 days exceed checking, and Treasury can cover the gap',
  duplicate_14d: 'Same vendor and amount paid twice within 14 days',
  new_vendor_unusual: 'A new vendor with an unusual amount',
  unused_60_days: 'A recurring tool nobody has signed in to for 60 days',
  owner_left: 'A recurring charge on a card owned by someone who left',
  price_increase: 'A recurring charge went up more than 10%',
  unfamiliar_vendor: 'A new recurring vendor nobody uses',
  burn_10pct: 'Monthly burn moved 10% or more vs the 3-month average',
};

export default function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { viewer } = useViewer();
  const { data, error, loading } = useLive<{ card: CardView; accounts: Account[] }>(`/api/checkin/cards/${id}?as=${viewer.id}`, ['checkin_cards', 'accounts']);
  const [step, setStep] = useState<Step>('proof');
  const [done, setDone] = useState<DoneState | null>(null);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  async function decide(decision: Decision) {
    setBusy(decision);
    try {
      const res = await send<{ done: { headline: string; detail: string }; accounts: Account[]; next: CardView | null }>(
        'POST', `/api/checkin/cards/${id}/decision`, { decision, as: viewer.id },
      );
      setDone({ ...res.done, accounts: res.accounts, next: res.next, decision });
      setStep('done');
    } catch {
      // the error toast is already showing
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-sm text-negative">{error}</p>;
  if (loading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { card, accounts } = data;
  const decided = card.status !== 'proposed';

  return (
    <>
      <Link href="/checkin" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Monday Check-in
      </Link>
      <RoleBanner />

      {step === 'done' && done ? (
        <DoneScreen done={done} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <TypeChip type={card.type} urgent={card.urgent} />
            <h1 className="mt-2 text-[20px] leading-snug font-semibold">{card.title}</h1>
            {card.question && <p className="mt-0.5 text-[15px]">{card.question}</p>}
            <DataAsOf iso={card.data_as_of} className="mt-2 block" />
            <div className="mt-6">
              {step === 'confirm' && card.action ? (
                <ConfirmScreen action={card.action} accounts={accounts} />
              ) : (
                <ProofView sections={card.proof} />
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <Card>
              <div className="space-y-3 p-5">
                {decided ? (
                  <p className="flex items-center gap-2 text-[13px]">
                    <CheckCircle2 className="size-4 text-positive" />
                    {card.status === 'approved' ? 'Approved' : card.status === 'not_now' ? 'Marked “Not now”' : 'Marked “This is wrong”'}
                    {card.decided_by ? ` by ${card.decided_by === viewer.id ? 'you' : card.decided_by}` : ''}.
                  </p>
                ) : step === 'confirm' ? (
                  <>
                    <p className="text-[13px] text-muted-foreground">
                      {card.action?.kind === 'share' ? 'No money moves.' : 'Nothing moves until you approve.'}
                    </p>
                    <Button className="h-10 w-full bg-mint text-mint-ink hover:bg-mint-hover" disabled={!card.can_approve || !!busy} onClick={() => decide('approve')}>
                      {busy === 'approve' ? 'Working…' : card.action?.kind === 'share' ? 'Share' : 'Approve'}
                    </Button>
                    <Button variant="outline" className="h-10 w-full" onClick={() => setStep('proof')} disabled={!!busy}>Cancel</Button>
                    {!card.can_approve && <p className="text-xs text-muted-foreground">Only an admin can approve. {viewer.role === 'account_manager' ? '' : 'Kason or Jordan will get this card too.'}</p>}
                  </>
                ) : (
                  <>
                    {card.action && (
                      <Button className="h-10 w-full bg-mint text-mint-ink hover:bg-mint-hover" onClick={() => setStep('confirm')} disabled={viewer.role === 'account_manager'}>
                        {card.action.label} <ArrowRight className="size-4" />
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" disabled={!!busy || viewer.role === 'account_manager'} onClick={() => decide('not_now')}>
                        <Clock className="size-4" /> {busy === 'not_now' ? '…' : 'Not now'}
                      </Button>
                      <Button variant="outline" disabled={!!busy || viewer.role === 'account_manager'} onClick={() => decide('wrong')}>
                        <ThumbsDown className="size-4" /> {busy === 'wrong' ? '…' : 'This is wrong'}
                      </Button>
                    </div>
                    {viewer.role === 'account_manager' && <ViewOnlyNote />}
                  </>
                )}
              </div>
            </Card>

            <Card>
              <button onClick={() => setWhyOpen(o => !o)} className="flex w-full items-center gap-2 px-5 py-4 text-left text-[13px] font-semibold">
                <CircleHelp className="size-4" /> Why am I seeing this?
                <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${whyOpen ? 'rotate-180' : ''}`} />
              </button>
              {whyOpen && (
                <div className="space-y-3 border-t px-5 py-4 text-[13px]">
                  <div>
                    <div className="text-xs text-muted-foreground">Rule that fired</div>
                    <div className="font-medium">{RULE_NAME[card.rule] ?? card.rule}</div>
                  </div>
                  <p className="text-ink-2">{card.why}</p>
                  <div className="text-xs text-muted-foreground">
                    {card.urgent ? 'Urgent cards always come first.' : `Worth ${card.runway_days ?? 0} days of runway${card.rule === 'unused_60_days' ? ', and unused tools always qualify' : ''}.`}
                  </div>
                  {!decided && viewer.role !== 'account_manager' && (
                    <Button variant="outline" size="sm" className="w-full" disabled={!!busy} onClick={() => decide('wrong')}>
                      <ThumbsDown className="size-3.5" /> This is wrong{card.vendor ? `: stop flagging ${card.vendor}` : ''}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-3 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function ConfirmScreen({ action, accounts }: { action: PreparedAction; accounts: Account[] }) {
  const { viewer } = useViewer();
  const acct = (id: string) => accounts.find(a => a.id === id);
  const approver = `${viewer.name} (${ROLE_LABEL[viewer.role]})`;
  const today = shortDate(new Date().toISOString());

  return (
    <Card title="Confirm">
      <div className="divide-y">
        {action.kind === 'transfer' && (
          <>
            <Field label="From">{acct(action.from)?.name} ••{acct(action.from)?.last4} · {formatUSD(acct(action.from)?.balance)}</Field>
            <Field label="To">{acct(action.to)?.name} ••{acct(action.to)?.last4} · {formatUSD(acct(action.to)?.balance)}</Field>
            <Field label="Amount"><span className="tabular text-base">{formatUSD(action.amount)}</span></Field>
            <Field label="Date">{today}, arrives instantly (internal transfer)</Field>
          </>
        )}
        {action.kind === 'dispute' && (
          <>
            <Field label="Vendor">{action.vendor}</Field>
            <Field label="Charge">{formatUSD(action.amount)}{action.card_last4 ? ` on card ••${action.card_last4}` : ''}</Field>
            <Field label="Reason">{action.reason}</Field>
            <Field label="While it's reviewed">Provisional credit; the card stays active</Field>
          </>
        )}
        {action.kind === 'lock_card' && (
          <>
            <Field label="Tool">{action.vendor}</Field>
            <Field label="Lock card">Virtual card ••{action.card_last4} ({action.card_owner})</Field>
            <Field label="Stops">{formatUSD(action.monthly_cost)} a month</Field>
            <Field label="Saves">{formatUSD(action.monthly_cost * 12)} a year</Field>
          </>
        )}
        {action.kind === 'share' && (
          <>
            <Field label="Share with">{action.to} (Co-founder)</Field>
            <Field label="What">Burn breakdown and the runway change</Field>
            <Field label="Money">Nothing moves</Field>
          </>
        )}
        <Field label="Approver">{approver}</Field>
      </div>
      {action.kind === 'transfer' && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">Transfers only move money between Loop Labs&apos; own accounts, within your existing approval rules.</p>
      )}
    </Card>
  );
}

function DoneScreen({ done }: { done: DoneState }) {
  const approved = done.decision === 'approve';
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className={`mx-auto grid size-14 place-items-center rounded-full ${approved ? 'bg-positive-bg text-positive' : 'bg-accent text-ink-2'}`}>
        <CheckCircle2 className="size-7" />
      </div>
      <h1 className="mt-4 text-[22px] font-semibold">{done.headline}</h1>
      <p className="mt-2 text-[15px] text-ink-2">{done.detail}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        {done.accounts.map(a => (
          <div key={a.id} className="rounded-lg border bg-white px-4 py-3">
            <div className="text-xs text-muted-foreground">{a.name} ••{a.last4}</div>
            <div className="tabular text-lg font-semibold">{formatUSD(a.balance)}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-white p-5 text-left">
        {done.next ? (
          <>
            <div className="text-xs text-muted-foreground">Next card</div>
            <p className="mt-1 font-semibold">{done.next.title}</p>
            {done.next.question && <p>{done.next.question}</p>}
            <Link href={`/checkin/${done.next.id}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
              Review it <ArrowRight className="size-3.5" />
            </Link>
          </>
        ) : (
          <p className="flex items-center gap-2 text-[15px]"><CheckCircle2 className="size-4 text-positive" /> That’s everything for this week.</p>
        )}
      </div>
      <Link href="/checkin" className="mt-4 inline-block text-[13px] text-muted-foreground hover:text-foreground">Back to Check-in</Link>
    </div>
  );
}
