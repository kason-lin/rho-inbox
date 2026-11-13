'use client';
/**
 * iPhone mode: the same Business health flow inside the Rho iOS app, using the same API and demo state
 * as the web version. Lock-screen notification → Health tab → proof and confirm as bottom sheets →
 * approve with Face ID → Where it goes and Connected tools from the tab bar.
 */
import { Check, CreditCard, FileText, HeartPulse, Home, MoreHorizontal, ScanFace } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CashChart } from '@/components/health/cash-chart';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Chip, Eyebrow, MathTable } from '@/components/health/ui';
import { healthPost, useHealth } from '@/components/health/use-health';
import { useViewer } from '@/components/shell/viewer';
import connections from '@/data/business-health/connections.json';
import { DEMO_DATES } from '@/lib/health/data';
import { longDay, shortDay } from '@/lib/health/dates';
import { mathRows } from '@/lib/health/math';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';

type Screen = 'lock' | 'health' | 'where' | 'tools';
type Sheet = 'proof' | 'confirm' | 'dispute' | 'specialist' | null;

const k = (n: number) => (n >= 1000 && n % 1000 === 0 ? `$${n / 1000}K` : formatUSDShort(n));

export default function IPhonePage() {
  const { data } = useHealth();
  const { viewer } = useViewer();
  const [screen, setScreen] = useState<Screen>('lock');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [faceId, setFaceId] = useState(false);

  // The phone story starts on Nov 18, when the alert goes out.
  useEffect(() => {
    if (data && data.date < DEMO_DATES.alert) void healthPost('state', { date: DEMO_DATES.alert });
  }, [data]);

  async function approve() {
    if (!data?.suggested) return;
    setFaceId(true);
    await new Promise(r => setTimeout(r, 900));
    try {
      await healthPost('approve', { ...data.suggested, as: viewer.id });
      setSheet(null);
      toast.success('Covered and scheduled.');
    } catch {
      // the error is already shown as a toast
    } finally {
      setFaceId(false);
    }
  }

  const act = async (card_id: string, action: 'cancel' | 'dispute') => {
    try {
      await healthPost('act', { card_id, action, as: viewer.id });
      setSheet(null);
    } catch {
      // the error is already shown as a toast
    }
  };

  const steps: [string, () => void][] = [
    ['Lock screen', () => { setScreen('lock'); setSheet(null); }],
    ['Health tab', () => { setScreen('health'); setSheet(null); }],
    ['Proof', () => { setScreen('health'); setSheet('proof'); }],
    ['Approve with Face ID', () => { setScreen('health'); setSheet(data?.approval ? null : 'confirm'); }],
    ['Where it goes', () => { setScreen('where'); setSheet(null); }],
    ['Connected tools', () => { setScreen('tools'); setSheet(null); }],
  ];

  return (
    <div className="min-h-screen bg-[#eef1f0] p-3">
      <PresenterBar className="mb-6" />
      <div className="mx-auto flex max-w-4xl flex-wrap items-start justify-center gap-10">
        <div className="max-w-xs pt-8">
          <Eyebrow className="text-brand">iPhone · Rho app</Eyebrow>
          <h1 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight">Same flow, in the Rho iOS app</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Founders get the alert on their phone and approve on the go. Tap through the phone, or jump to a step.</p>
          <ol className="mt-4 space-y-1">
            {steps.map(([label, go], i) => (
              <li key={label}>
                <button type="button" onClick={go} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-white">
                  <span className="grid size-5 place-items-center rounded-full bg-[#151716] text-[11px] font-semibold text-white">{i + 1}</span>{label}
                </button>
              </li>
            ))}
          </ol>
          <Link href="/business-health" className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">Open the web version →</Link>
        </div>

        {/* the phone */}
        <div className="relative h-[780px] w-full max-w-[380px] shrink-0 overflow-hidden rounded-[54px] border-[12px] border-[#151716] bg-white shadow-2xl">
          <div className="absolute top-2.5 left-1/2 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-[#151716]" />
          {!data ? null : screen === 'lock' ? (
            <LockScreen data={data} onOpen={() => setScreen('health')} />
          ) : (
            <div className="flex h-full flex-col bg-[#f7f9f8]">
              <StatusBar />
              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {screen === 'health' && <HealthScreen data={data} setSheet={setSheet} goWhere={() => setScreen('where')} cancel={id => void act(id, 'cancel')} />}
                {screen === 'where' && <WhereScreen data={data} />}
                {screen === 'tools' && <ToolsScreen data={data} />}
              </div>
              <TabBar screen={screen} setScreen={s => { setScreen(s); setSheet(null); }} />
            </div>
          )}

          {data && sheet && (
            <BottomSheet onClose={() => setSheet(null)}>
              {sheet === 'proof' && <ProofSheet data={data} confirm={() => setSheet('confirm')} />}
              {sheet === 'confirm' && <ConfirmSheet data={data} approve={() => void approve()} cancel={() => setSheet(null)} />}
              {sheet === 'dispute' && (
                <>
                  <Eyebrow className="text-brand">Dispute · filled in for you</Eyebrow>
                  <h3 className="text-[18px] font-semibold">{data.duplicate.vendor} duplicate charge</h3>
                  <MathRowsSimple rows={[['Card', `••${data.duplicate.card_last4}`], ['Charges', data.duplicate.charges.map(shortDay).join(' · ')], ['Amount', formatUSDShort(data.duplicate.amount)], ['Reason', 'Duplicate']]} />
                  <PhoneBtn dark onClick={() => void act(data.duplicate.id, 'dispute')}>Submit dispute</PhoneBtn>
                  <PhoneBtn onClick={() => setSheet(null)}>Cancel</PhoneBtn>
                </>
              )}
              {sheet === 'specialist' && (
                <>
                  <Eyebrow className="text-brand">Talk to a specialist</Eyebrow>
                  <h3 className="text-[18px] font-semibold">Bills &amp; payments · available now</h3>
                  <p className="rounded-xl bg-[#f7f9f8] p-3 text-[13px] text-ink-2">They’ll see this card, the invoice and your balances. A person handles it; the AI only routes you.</p>
                  <PhoneBtn dark onClick={() => { setSheet(null); toast.success('Chat started (demo).'); }}>Start chat</PhoneBtn>
                  <PhoneBtn onClick={() => { setSheet(null); toast.success('Call requested (demo).'); }}>Request a call</PhoneBtn>
                </>
              )}
            </BottomSheet>
          )}

          {faceId && (
            <div className="absolute inset-0 z-50 grid place-items-center bg-black/30">
              <div className="flex size-36 flex-col items-center justify-center gap-2 rounded-3xl bg-white/90 text-[13px] font-semibold backdrop-blur">
                <ScanFace className="size-12 animate-pulse text-[#151716]" /> Face ID
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ dark }: { dark?: boolean }) {
  return <div className={cn('flex h-12 shrink-0 items-end justify-between px-7 pb-1 text-[13px] font-semibold', dark ? 'text-white' : 'text-[#151716]')}><span>8:01</span><span>●●● ▮</span></div>;
}

function LockScreen({ data, onOpen }: { data: HealthView; onOpen: () => void }) {
  const a = data.alert;
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0c3d33] via-[#151716] to-[#151716] text-white">
      <StatusBar dark />
      <div className="mt-10 text-center">
        <div className="text-[15px] font-medium">{longDay(data.date).replace(',', '')}</div>
        <div className="text-[84px] leading-none font-light tracking-tight">8:00</div>
      </div>
      {a ? (
        <button type="button" onClick={onOpen} className="mx-3 mt-10 flex gap-3 rounded-2xl bg-white/15 p-3 text-left backdrop-blur-md hover:bg-white/20">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#151716] font-wordmark text-[18px]">R</span>
          <span className="text-[13px] leading-snug">
            <span className="flex justify-between font-semibold">Rho <span className="font-normal text-white/60">now</span></span>
            {formatUSDShort(a.invoice.amount)} invoice from {a.invoice.vendor} is due in {a.days_until_due} days. Checking will be {formatUSDShort(a.short_by)} short. Tap to review.
          </span>
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="mx-3 mt-10 rounded-2xl bg-white/15 p-3 text-left text-[13px]">No alerts. Tap to open Rho.</button>
      )}
    </div>
  );
}

function HealthScreen({ data, setSheet, goWhere, cancel }: { data: HealthView; setSheet: (s: Sheet) => void; goWhere: () => void; cancel: (id: string) => void }) {
  if (!data.forecast) return <p className="pt-6 text-[13px]">Loading…</p>;
  const low = data.forecast.low;
  return (
    <>
      <div className="flex items-center justify-between pt-1"><h2 className="text-[28px] font-bold tracking-tight">Health</h2><Chip tone="teal">Updated {data.data_updated}</Chip></div>
      <div className="rounded-2xl bg-white p-4">
        <div className="text-[12px] text-muted-foreground">Lowest checking, next 2 weeks</div>
        <div className={cn('text-[32px] font-medium tracking-tight tabular', low.balance < 0 ? 'text-negative' : 'text-positive')}>{formatUSDShort(low.balance).replace('-', '−')}</div>
        <div className="text-[12px] text-muted-foreground">on {shortDay(low.date)}{data.approval ? ' · after your set-aside' : ` · ${data.invoice?.vendor} invoice due`}</div>
        <div className="mt-2"><CashChart forecast={data.forecast} before={data.forecast_before} dueDate={data.invoice?.due} height={130} /></div>
      </div>
      <h3 className="pt-1 text-[18px] font-semibold">Needs you</h3>
      {data.needs_you.cards.map(c => (
        <div key={c.id} className={cn('space-y-2 rounded-2xl bg-white p-4', c.urgent && 'ring-1 ring-negative/30')}>
          <Chip tone={c.urgent ? 'red' : 'plain'}>{c.label}</Chip>
          <p className="text-[14px] leading-snug font-semibold">{c.title}</p>
          <p className="text-[12px] text-muted-foreground">{c.why}</p>
          {c.type === 'money_owed' && (
            <>
              <PhoneBtn mint onClick={() => setSheet('confirm')}>Set aside {data.suggested ? k(data.suggested.transfer_amount) : ''} &amp; schedule</PhoneBtn>
              <div className="grid grid-cols-2 gap-2"><PhoneBtn onClick={() => setSheet('proof')}>Show proof</PhoneBtn><PhoneBtn onClick={() => setSheet('specialist')}>Specialist</PhoneBtn></div>
            </>
          )}
          {c.type === 'subscription' && <PhoneBtn dark onClick={() => cancel(c.id)}>Cancel &amp; lock card</PhoneBtn>}
          {c.type === 'spend' && <PhoneBtn onClick={goWhere}>See breakdown</PhoneBtn>}
          {c.type === 'duplicate' && <PhoneBtn dark onClick={() => setSheet('dispute')}>Review dispute</PhoneBtn>}
        </div>
      ))}
      {data.needs_you.handled.map(c => (
        <div key={c.id} className="rounded-2xl bg-white/60 p-4">
          <Chip tone="teal">Handled · {c.mode}</Chip>
          <p className="mt-2 text-[13px] text-muted-foreground line-through">{c.handled_text}</p>
        </div>
      ))}
      <p className="px-1 text-[12px] text-muted-foreground">We checked {data.needs_you.others} other things. They look fine.</p>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border tabular">
        {[['Checking', formatUSDShort(data.kpis.checking)], ['Burn incl. salaries', `$${(data.kpis.burn / 1000).toFixed(1)}K`], ['Runway', `${data.kpis.runway} mo`], ['Treasury', `$${(data.kpis.treasury / 1e6).toFixed(2)}M`]].map(([l, v]) => (
          <div key={l} className="bg-white p-3"><div className="text-[11px] text-muted-foreground">{l}</div><div className="text-[17px] font-medium">{v}</div></div>
        ))}
      </div>
    </>
  );
}

function WhereScreen({ data }: { data: HealthView }) {
  const s = data.spend;
  const color: Record<string, string> = { building: 'bg-mint text-mint-ink', running: 'bg-[#151716] text-white', ops: 'bg-[#81a5a9] text-white', unassigned: 'bg-[#dfe7e8] text-ink-2' };
  return (
    <>
      <h2 className="pt-1 text-[28px] font-bold tracking-tight">Where it goes</h2>
      <p className="text-[12px] text-muted-foreground">{s.claude.month}, by purpose · {Math.round(s.coverage * 100)}% assigned</p>
      {s.providers.map(p => (
        <div key={p.name} className="rounded-2xl bg-white p-4">
          <div className="flex justify-between text-[14px] font-semibold"><span>{p.name}</span><span className="font-mono text-[13px]">{formatUSDShort(p.total)}</span></div>
          <div className="mt-2 flex h-6 overflow-hidden rounded-md">
            {p.slices.map(sl => {
              const w = (sl.amount / p.total) * 100;
              return <span key={sl.purpose} className={cn('flex items-center truncate px-1.5 text-[10px] font-semibold', color[sl.purpose])} style={{ width: `${w}%` }}>{w > 30 ? `${sl.label.split(' ')[0]} ${k(sl.amount)}` : ''}</span>;
            })}
          </div>
        </div>
      ))}
      <div className="space-y-1.5 rounded-2xl bg-white p-4 text-[12px]">
        <div className="text-[14px] font-semibold">Match check</div>
        {s.match.map(m => (
          <div key={m.name} className="flex items-center justify-between gap-2">
            <span>{m.name}: {formatUSDShort(m.reported ?? 0)} reported · {formatUSDShort(m.paid)} paid</span>
            {m.difference === 0 ? <Chip tone="teal">Matches</Chip> : <Chip tone="amber">{formatUSDShort(Math.abs(m.difference))} unexplained</Chip>}
          </div>
        ))}
      </div>
    </>
  );
}

function ToolsScreen({ data }: { data: HealthView }) {
  const on = new Set(data.connected);
  return (
    <>
      <h2 className="pt-1 text-[28px] font-bold tracking-tight">Connected tools</h2>
      <p className="text-[12px] text-muted-foreground">Read-only. Billing details only.</p>
      {connections.tools.map(t => (
        <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
          <span className="grid size-9 place-items-center rounded-lg font-mono text-white" style={{ background: t.color }}>{t.name[0]}</span>
          <span className="flex-1 text-[14px] font-medium">{t.name}</span>
          <Chip tone={on.has(t.id) ? 'teal' : 'plain'}>{on.has(t.id) ? 'Read-only' : 'Connect'}</Chip>
        </div>
      ))}
      <div className="rounded-2xl bg-white p-4 text-[12px]">
        <div className="text-[14px] font-semibold">Never read</div>
        <p className="mt-1 text-muted-foreground">{connections.never_reads.join(', ')}.</p>
      </div>
    </>
  );
}

function ProofSheet({ data, confirm }: { data: HealthView; confirm: () => void }) {
  const inv = data.invoice!;
  return (
    <>
      <Chip tone={data.approval ? 'teal' : 'red'}>{data.approval ? 'Handled' : `Act · Due ${shortDay(inv.due)}`}</Chip>
      <h3 className="text-[18px] font-semibold">Why Rho flagged this</h3>
      <div className="space-y-1 rounded-xl border p-3 text-[13px] tabular">
        <div className="flex justify-between font-semibold"><span>{inv.vendor}</span><span>{formatUSDShort(inv.amount)}</span></div>
        <div className="text-[12px] text-muted-foreground">Invoice {inv.number} · issued {shortDay(inv.issued)} · net {inv.terms_days}</div>
        <div className="text-[12px] text-muted-foreground">From {data.invoice_email?.from} · read-only inbox · {data.approval ? 'scheduled in Rho Bills' : 'not in Rho Bills'}</div>
      </div>
      <MathTable rows={mathRows(data.forecast_before ?? data.forecast!)} />
      <p className="rounded-xl bg-[#f7f9f8] p-3 text-[12px] text-ink-2">Shown 14 days ahead: a bill checking can’t cover on its due date, while treasury can.</p>
      {data.approval ? <Chip tone="teal"><Check className="size-3" /> Approved · payment scheduled</Chip> : <PhoneBtn mint onClick={confirm}>Set aside {data.suggested ? k(data.suggested.transfer_amount) : ''} &amp; schedule</PhoneBtn>}
    </>
  );
}

function ConfirmSheet({ data, approve, cancel }: { data: HealthView; approve: () => void; cancel: () => void }) {
  const inv = data.invoice!;
  const plan = data.suggested;
  if (!plan) return <p className="text-[13px]">Already approved.</p>;
  return (
    <>
      <Eyebrow className="text-brand">Confirm · 2 steps</Eyebrow>
      <h3 className="text-[18px] font-semibold">Cover the {inv.vendor} invoice</h3>
      <ol className="divide-y rounded-xl border text-[13px] tabular">
        <li className="flex justify-between gap-3 p-3"><span>1 · Treasury → Checking<span className="block text-[11px] text-muted-foreground">Today · settles in 0–2 business days</span></span><b>{formatUSDShort(plan.transfer_amount)}</b></li>
        <li className="flex justify-between gap-3 p-3"><span>2 · Pay {inv.vendor}<span className="block text-[11px] text-muted-foreground">Rho Bills · {shortDay(plan.pay_date)}</span></span><b>{formatUSDShort(inv.amount)}</b></li>
      </ol>
      <p className="text-[12px] text-muted-foreground">Approver: you (Admin). Logged to the audit trail. Edit the amount or date on the web.</p>
      <PhoneBtn dark onClick={approve}><ScanFace className="size-4" /> Approve with Face ID</PhoneBtn>
      <PhoneBtn onClick={cancel}>Cancel</PhoneBtn>
    </>
  );
}

function BottomSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div role="dialog" className="relative max-h-[85%] space-y-3 overflow-y-auto rounded-t-3xl bg-white px-5 pt-2 pb-8">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#d7e0de]" />
        {children}
      </div>
    </div>
  );
}

function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const tabs: [string, React.ElementType, Screen | null][] = [['Home', Home, null], ['Health', HeartPulse, 'health'], ['Cards', CreditCard, null], ['Bills', FileText, null], ['More', MoreHorizontal, 'tools']];
  return (
    <nav className="grid shrink-0 grid-cols-5 border-t bg-white pt-2 pb-6">
      {tabs.map(([label, Icon, to]) => {
        const active = to === screen || (label === 'Health' && screen === 'where');
        return (
          <button key={label} type="button" disabled={!to} onClick={() => to && setScreen(to)} className={cn('flex flex-col items-center gap-0.5 text-[10px] font-medium', active ? 'text-brand' : 'text-muted-foreground')}>
            <Icon className="size-5" /> {label}
          </button>
        );
      })}
    </nav>
  );
}

function PhoneBtn({ mint, dark, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { mint?: boolean; dark?: boolean }) {
  return <button type="button" {...props} className={cn('flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold', mint ? 'bg-mint text-mint-ink' : dark ? 'bg-[#151716] text-white' : 'border bg-white', className)} />;
}

function MathRowsSimple({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y rounded-xl border text-[13px]">
      {rows.map(([l, v]) => <div key={l} className="flex justify-between px-3 py-2"><dt className="text-muted-foreground">{l}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}
