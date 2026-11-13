'use client';
/**
 * "Needs you": at most 3 open cards, urgent first. Each card has one main action; "Not now" hides it,
 * "This is wrong" asks why (to tune the rule). Handled cards stay, crossed out, so you see what's done.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { useViewer } from '@/components/shell/viewer';
import type { HealthCard } from '@/lib/health/cards';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';
import { Btn, Chip } from './ui';
import { healthPost } from './use-health';

export type CardActions = {
  confirm: () => void;
  proof: () => void;
  breakdown: () => void;
  dispute: () => void;
  specialist: () => void;
};

const REASONS: Record<HealthCard['type'], string[]> = {
  money_owed: ['I already paid this invoice', 'The amount or date is wrong', 'Don’t flag bills from this vendor'],
  subscription: ['We still use this tool', 'The card owner is still here', 'Don’t flag this vendor'],
  spend: ['The split by purpose is wrong', 'I don’t need this every month'],
  duplicate: ['These are two different purchases', 'Already refunded', 'Don’t flag this vendor'],
};

export function NeedsYou({ data, actions, wrongFor, setWrongFor }: { data: HealthView; actions: CardActions; wrongFor: string | null; setWrongFor: (id: string | null) => void }) {
  const { cards, handled, others } = data.needs_you;
  return (
    <div className="space-y-3">
      {cards.map((c, i) => <OpenCard key={c.id} card={c} lead={i === 0 && c.urgent} data={data} actions={actions} wrong={wrongFor === c.id} setWrong={on => setWrongFor(on ? c.id : null)} />)}
      {handled.map(c => (
        <div key={c.id} className="rounded-lg border bg-[#f7f9f8] p-4">
          <Chip tone="teal">Handled · {c.mode}</Chip>
          <p className="mt-2 text-[13px] text-muted-foreground line-through decoration-[#8f9693]">{c.handled_text}</p>
          {c.type === 'money_owed' && <Btn variant="link" className="mt-1" onClick={actions.proof}>View details</Btn>}
        </div>
      ))}
      {!cards.length && !handled.length && <p className="text-[13px]">Nothing needs a decision right now.</p>}
      <p className="pt-1 text-[12px] text-muted-foreground">We checked {others} other things. They look fine.</p>
    </div>
  );
}

function OpenCard({ card: c, lead, data, actions, wrong, setWrong }: { card: HealthCard; lead: boolean; data: HealthView; actions: CardActions; wrong: boolean; setWrong: (on: boolean) => void }) {
  const { viewer } = useViewer();
  const [asking, setAsking] = useState(false);   // "Cancel the subscription and lock the card?"
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast already shown */ } finally { setBusy(false); } };
  const notNow = () => run(() => healthPost('feedback', { card_id: c.id, kind: 'not_now' }));
  const cancelTool = () => run(async () => {
    await healthPost('act', { card_id: c.id, action: 'cancel', as: viewer.id });
    toast.success(`${data.subscription.vendor} cancelled and card ••${data.subscription.card_last4} locked`);
  });

  return (
    <div className={cn('rounded-lg border p-4', lead ? 'border-negative/30 bg-negative-bg/30' : 'bg-white')}>
      <Chip tone={c.urgent ? 'red' : 'plain'}>{c.label}</Chip>
      <p className="mt-2 text-[14px] leading-snug font-semibold">{c.title}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">{c.why}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {c.type === 'money_owed' && (
          <>
            <Btn variant="mint" onClick={actions.confirm}>Set aside {data.suggested ? formatUSDShort(data.suggested.transfer_amount).replace(',000', 'K') : ''} &amp; schedule</Btn>
            <Btn onClick={actions.proof}>Show proof</Btn>
          </>
        )}
        {c.type === 'subscription' && (asking ? (
          <>
            <span className="text-[12px] text-ink-2">Cancel the subscription and lock the card?</span>
            <Btn variant="dark" disabled={busy} onClick={() => void cancelTool()}>Cancel it</Btn>
            <Btn onClick={() => setAsking(false)}>Keep</Btn>
          </>
        ) : <Btn variant="dark" onClick={() => setAsking(true)}>Cancel</Btn>)}
        {c.type === 'spend' && <Btn onClick={actions.breakdown}>See breakdown</Btn>}
        {c.type === 'duplicate' && <Btn variant="dark" onClick={actions.dispute}>Review dispute</Btn>}
        {c.type !== 'spend' && !asking && <Btn disabled={busy} onClick={() => void notNow()}>Not now</Btn>}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4">
        {c.urgent && <Btn variant="link" onClick={actions.specialist}>Talk to a specialist</Btn>}
        <Btn variant="link" className="text-muted-foreground" onClick={() => setWrong(!wrong)}>This is wrong</Btn>
      </div>
      {wrong && <WrongForm card={c} onDone={() => setWrong(false)} />}
    </div>
  );
}

/** "What's wrong with this card?" Sends the reason and removes the card. */
function WrongForm({ card, onDone }: { card: HealthCard; onDone: () => void }) {
  const [reason, setReason] = useState(REASONS[card.type][0]);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await healthPost('feedback', { card_id: card.id, kind: 'wrong', reason });
      toast.success('Thanks. Card removed; the rule is tuned for this vendor.');
      onDone();
    } catch {
      setBusy(false);
    }
  }
  return (
    <div role="group" aria-label="What's wrong with this card?" className="mt-3 space-y-2 rounded-md border bg-white p-3 text-[13px]">
      <p className="font-semibold">What’s wrong with this card?</p>
      {REASONS[card.type].map(r => (
        <label key={r} className="flex items-center gap-2"><input type="radio" name={`wrong-${card.id}`} checked={reason === r} onChange={() => setReason(r)} className="accent-[#048d73]" /> {r}</label>
      ))}
      <div className="flex gap-2 pt-1">
        <Btn variant="dark" disabled={busy} onClick={() => void send()}>Send</Btn>
        <Btn onClick={onDone}>Close</Btn>
      </div>
      <p className="text-[12px] text-muted-foreground">Removes the card and tunes the rule for this vendor.</p>
    </div>
  );
}
