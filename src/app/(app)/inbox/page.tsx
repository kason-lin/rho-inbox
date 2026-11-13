'use client';
import {
  ArrowRight, CalendarCheck, Check, ChevronDown, Clock, Mail, MailOpen, Search, Sparkles, Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useHealth } from '@/components/health/use-health';
import { PageHeader } from '@/components/shell/page-header';
import { SourceIcon } from '@/components/shell/source-icon';
import { useViewer } from '@/components/shell/viewer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLive } from '@/hooks/use-live';
import { send } from '@/lib/client';
import { formatUSD, relativeTime } from '@/lib/format';
import { SOURCE_LABELS, SOURCES, type Action, type InboxEvent, type InboxThread, type Source, type Status } from '@/lib/types';
import { cn } from 'cn';

type Tab = 'inbox' | 'snoozed' | 'done';

const ACTION_LABEL: Record<Action, string> = { approve: 'Approve', pay: 'Pay', dispute: 'Dispute' };

const SCENARIOS: { id: string; label: string; hint: string }[] = [
  { id: 'duplicate_charge', label: 'Duplicate charge', hint: 'Check-in card, urgent' },
  { id: 'invoice_progress', label: 'Customer invoice moves forward', hint: 'sent → viewed → paid → deposited' },
  { id: 'unusual_charge', label: 'Unusual card charge', hint: 'Needs action' },
  { id: 'bill_due_soon', label: 'Bill due in 1–2 days', hint: 'Needs action' },
  { id: 'approval_request', label: 'Approval request', hint: 'Needs action' },
  { id: 'card_charge', label: 'Everyday card charge', hint: 'FYI' },
  { id: 'treasury_update', label: 'Treasury yield', hint: 'FYI' },
];

function snoozeOptions(now = new Date()) {
  const later = new Date(now.getTime() + 3 * 3_600_000);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(8, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() + (((1 - now.getDay() + 7) % 7) || 7)); monday.setHours(8, 0, 0, 0);
  return [
    { label: 'Later today', at: later },
    { label: 'Tomorrow, 8:00 AM', at: tomorrow },
    { label: 'Next Monday, 8:00 AM', at: monday },
  ];
}

export default function InboxPage() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const { viewer } = useViewer();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>('inbox');
  const [source, setSource] = useState<Source | null>(null);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(params.get('thread'));

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const url = `/api/events?status=${tab}${source ? `&source=${source}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const { data, loading } = useLive<{ threads: InboxThread[] }>(url, ['inbox_events']);
  const { data: health } = useHealth();
  const threads = useMemo(() => data?.threads ?? [], [data]);

  // Flash rows that arrived since the last load (Realtime inserts).
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!data) return;
    const heads = new Set(threads.map(t => t.head.id));
    if (seen.current) {
      const arrived = new Set([...heads].filter(id => !seen.current!.has(id)));
      if (arrived.size) {
        setFresh(arrived);
        setTimeout(() => setFresh(new Set()), 2500);
      }
    }
    seen.current = heads;
  }, [data, threads]);

  useEffect(() => {
    if (open) document.getElementById(`thread-${open}`)?.scrollIntoView({ block: 'center' });
  }, [open, data]);

  const needs = threads.filter(t => t.priority === 'needs_action');
  const fyi = threads.filter(t => t.priority === 'fyi');

  async function simulate(id: string, label: string) {
    const res = await send<{ event?: InboxEvent | null; card?: { title: string } | null }>('POST', '/api/simulate', { scenario: id });
    toast(`Simulated: ${label}`, { description: res.card?.title ?? res.event?.title, icon: <Sparkles className="size-4" /> });
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Updates from Cards, Bill Pay, Invoicing, Treasury and Approvals, in one place."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-md border border-dashed border-lavender-ink/40 bg-lavender px-3 text-[13px] font-medium text-lavender-ink hover:bg-lavender/70">
                <Sparkles className="size-3.5" /> Simulate event <ChevronDown className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Presenter tool: fires a realistic event</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SCENARIOS.map(s => (
                <DropdownMenuItem key={s.id} onSelect={() => void simulate(s.id, s.label)} className="flex-col items-start gap-0">
                  <span className="text-[13px] font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.hint}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {health && health.needs_you.cards.length > 0 && tab === 'inbox' && (
        <Link href="/business-health" className="mb-4 flex items-center gap-3 rounded-lg border border-mint bg-positive-subtle px-4 py-3 text-[13px] hover:bg-positive-bg/40">
          <CalendarCheck className="size-4 text-brand" />
          <span><span className="font-semibold">Business health:</span> {health.needs_you.cards.length} {health.needs_you.cards.length === 1 ? 'thing needs' : 'things need'} you, starting with “{health.needs_you.cards[0].title}”</span>
          <span className="ml-auto flex items-center gap-1 font-medium text-brand">Open <ArrowRight className="size-3.5" /></span>
        </Link>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border bg-white p-0.5 text-[13px]">
          {(['inbox', 'snoozed', 'done'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn('rounded px-3 py-1 capitalize', tab === t ? 'bg-accent font-medium' : 'text-ink-2 hover:text-foreground')}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!source} onClick={() => setSource(null)}>All</Chip>
          {SOURCES.map(s => <Chip key={s} active={source === s} onClick={() => setSource(source === s ? null : s)}>{SOURCE_LABELS[s]}</Chip>)}
        </div>
        <div className="relative ml-auto w-64">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search vendors, customers, amounts" className="h-8 bg-white pl-8 text-[13px]" />
        </div>
      </div>

      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}

      {tab === 'inbox' ? (
        <>
          <Section title="Needs action" count={needs.length} empty="Nothing needs you right now.">
            {needs.map(t => <Row key={t.thread_id} t={t} open={open === t.thread_id} fresh={fresh.has(t.head.id)} onToggle={setOpen} viewerId={viewer.id} canAct={viewer.role === 'admin'} />)}
          </Section>
          <Section title="FYI" count={fyi.length} empty="No updates.">
            {fyi.map(t => <Row key={t.thread_id} t={t} open={open === t.thread_id} fresh={fresh.has(t.head.id)} onToggle={setOpen} viewerId={viewer.id} canAct={viewer.role === 'admin'} />)}
          </Section>
        </>
      ) : (
        <Section title={tab === 'done' ? 'Done' : 'Snoozed'} count={threads.length} empty={tab === 'done' ? 'Nothing marked done yet.' : 'Nothing snoozed.'}>
          {threads.map(t => <Row key={t.thread_id} t={t} open={open === t.thread_id} fresh={false} onToggle={setOpen} viewerId={viewer.id} canAct={viewer.role === 'admin'} />)}
        </Section>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('h-7 rounded-full border px-3 text-xs font-medium', active ? 'border-foreground bg-foreground text-white' : 'bg-white text-ink-2 hover:border-strong')}>
      {children}
    </button>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold">
        {title} <span className="tabular rounded-full bg-accent px-1.5 text-[11px] text-ink-2">{count}</span>
      </h2>
      <div className="divide-y overflow-hidden rounded-lg border bg-white">
        {count ? children : <p className="px-5 py-6 text-center text-[13px] text-muted-foreground">{empty}</p>}
      </div>
    </section>
  );
}

function Row({ t, open, fresh, onToggle, viewerId, canAct }: {
  t: InboxThread; open: boolean; fresh: boolean; onToggle: (id: string | null) => void; viewerId: string; canAct: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const unread = t.status === 'unread';
  const isCard = t.head.type.startsWith('checkin_') && t.head.type !== 'checkin_followup';
  const cardId = typeof t.head.meta.checkin_card_id === 'string' ? t.head.meta.checkin_card_id : null;

  async function setStatus(status: Status, opts: { snooze_until?: string; quiet?: boolean } = {}) {
    const previous = t.status;
    await send('PATCH', `/api/events/${t.head.id}`, { status, snooze_until: opts.snooze_until, apply_to_thread: true });
    if (opts.quiet) return;
    toast(status === 'done' ? 'Marked done' : `Snoozed until ${new Date(opts.snooze_until!).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`, {
      action: {
        label: <span className="flex items-center gap-1"><Undo2 className="size-3.5" /> Undo</span>,
        onClick: () => void send('PATCH', `/api/events/${t.head.id}`, { status: previous === 'snoozed' || previous === 'done' ? 'read' : previous, apply_to_thread: true }),
      },
    });
  }

  async function act(action: Action) {
    setBusy(true);
    try {
      const res = await send<{ done?: { headline: string; detail: string }; follow_up?: InboxEvent }>(
        'POST', `/api/events/${t.head.id}/action`, { action, as: viewerId },
      );
      toast.success(res.done?.headline ?? res.follow_up?.title ?? 'Done', {
        description: res.done?.detail ?? res.follow_up?.summary ?? undefined,
      });
    } catch {
      // error toast already shown
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    onToggle(open ? null : t.thread_id);
    if (!open && unread) void setStatus('read', { quiet: true });
  }

  return (
    <div id={`thread-${t.thread_id}`} className={cn('group', fresh && 'animate-arrive')}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={e => (e.key === 'Enter' ? toggle() : undefined)}
        className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-tint', open && 'bg-tint')}
      >
        <span className={cn('size-1.5 shrink-0 rounded-full', unread ? 'bg-brand' : 'bg-transparent')} />
        <SourceIcon source={t.source} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {SOURCE_LABELS[t.source]}
            {t.events.length > 1 && <span className="rounded bg-accent px-1 text-[10px]">{t.events.length}</span>}
            {t.reason && t.priority === 'needs_action' && (
              <span className={cn('rounded px-1.5 py-px text-[11px] font-medium', isCard ? 'bg-positive-bg text-positive' : 'bg-warning-bg text-warning')}>{t.reason}</span>
            )}
          </div>
          <div className={cn('truncate text-[14px]', unread ? 'font-semibold' : 'text-ink-2')}>{t.head.title}</div>
          {t.head.summary && <div className="truncate text-[13px] text-muted-foreground">{t.head.summary}</div>}
        </div>

        {/* hover actions */}
        <div className="hidden items-center gap-1 group-hover:flex" onClick={e => e.stopPropagation()}>
          {t.status !== 'done' && t.actions.map(a => (
            <Tooltip key={a}>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled={!canAct || busy} onClick={() => void act(a)} className="h-7 bg-mint px-3 text-[12px] text-mint-ink hover:bg-mint-hover">
                    {busy ? '…' : ACTION_LABEL[a]}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canAct && <TooltipContent>Needs an admin</TooltipContent>}
            </Tooltip>
          ))}
          {isCard && cardId && (
            <Link href={`/checkin/${cardId}`} className="flex h-7 items-center rounded-md border bg-white px-2.5 text-[12px] font-medium hover:bg-accent">Review</Link>
          )}
          {t.status !== 'done' && (
            <>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger className="grid size-7 place-items-center rounded-md hover:bg-accent" aria-label="Snooze"><Clock className="size-4" /></DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Snooze</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  {snoozeOptions().map(o => (
                    <DropdownMenuItem key={o.label} onSelect={() => void setStatus('snoozed', { snooze_until: o.at.toISOString() })}>{o.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <IconButton label="Done" onClick={() => void setStatus('done')}><Check className="size-4" /></IconButton>
            </>
          )}
          <IconButton label={unread ? 'Mark read' : 'Mark unread'} onClick={() => void setStatus(unread ? 'read' : 'unread', { quiet: true })}>
            {unread ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
          </IconButton>
        </div>

        <div className="w-28 shrink-0 text-right">
          {t.head.amount != null && <div className={cn('tabular text-[13px]', unread && 'font-semibold')}>{formatUSD(t.head.amount)}</div>}
          <div className="text-xs text-muted-foreground">{relativeTime(t.head.created_at)}</div>
        </div>
      </div>

      {open && (
        <ol className="relative ml-[58px] border-l py-2 pr-5 pl-5">
          {t.events.map(e => (
            <li key={e.id} className="relative py-1.5">
              <span className={cn('absolute top-3 -left-[25px] size-2 rounded-full border-2 border-white', e.id === t.head.id ? 'bg-brand' : 'bg-strong')} />
              <div className="flex items-baseline justify-between gap-4 text-[13px]">
                <span className={e.id === t.head.id ? 'font-medium' : 'text-ink-2'}>{e.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(e.created_at)}</span>
              </div>
              {e.summary && <div className="text-xs text-muted-foreground">{e.summary}</div>}
            </li>
          ))}
          {isCard && cardId && (
            <li className="pt-2">
              <Link href={`/checkin/${cardId}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                Show the proof <ArrowRight className="size-3.5" />
              </Link>
            </li>
          )}
        </ol>
      )}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} aria-label={label} className="grid size-7 place-items-center rounded-md hover:bg-accent">{children}</button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
