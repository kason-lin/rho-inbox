'use client';
import { PageHeader } from '@/components/shell/page-header';
import { useViewer } from '@/components/shell/viewer';
import { useLive } from '@/hooks/use-live';
import { formatUSD, relativeTime } from '@/lib/format';
import { cn } from 'cn';

type Entry = {
  id: string;
  actor: string;
  role: string;
  event: string;
  detail: Record<string, unknown>;
  created_at: string;
  card: { title: string; type: string } | null;
};

const EVENT_LABEL: Record<string, string> = {
  checkin_generated: 'Check-in generated',
  card_suggested: 'Card suggested',
  decision_approved: 'Approved',
  decision_not_now: 'Not now',
  decision_wrong: 'Marked “This is wrong”',
  decision_refused: 'Refused by guardrail',
  transfer_executed: 'Transfer executed',
  card_locked: 'Card locked',
  dispute_submitted: 'Dispute submitted',
  shared_with_cofounder: 'Shared with co-founder',
};

function describe(e: Entry): string {
  const d = e.detail;
  switch (e.event) {
    case 'checkin_generated': return `${(d.cards as string[] | undefined)?.length ?? 0} cards, ${d.others ?? 0} other checks fine`;
    case 'transfer_executed': return `${formatUSD(d.amount as number)} from ${d.from} to ${d.to}`;
    case 'decision_refused': return String(d.reason ?? '');
    case 'dispute_submitted': return `${d.vendor} · ${formatUSD(d.amount as number)}`;
    case 'card_locked': return `${d.vendor} · card ••${d.card_last4}`;
    case 'shared_with_cofounder': return `with ${d.to}`;
    default: return e.card?.title ?? String(d.card ?? d.title ?? '');
  }
}

export default function AuditPage() {
  const { users } = useViewer();
  const { data, loading } = useLive<{ entries: Entry[] }>('/api/audit', ['audit_log']);
  const name = (id: string) => (id === 'rho' ? 'Rho (engine)' : users.find(u => u.id === id)?.name ?? id);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every suggestion and decision, including the ones the guardrails refused." />
      {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-tint text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Who</th>
              <th className="px-4 py-2.5 font-medium">What</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.entries.map(e => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground" title={new Date(e.created_at).toLocaleString()}>{relativeTime(e.created_at)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{name(e.actor)}<span className="ml-1 text-xs text-muted-foreground">{e.role !== 'engine' ? e.role.replace('_', ' ') : ''}</span></td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium',
                    e.event === 'decision_refused' ? 'bg-negative-bg text-negative'
                      : e.event.startsWith('decision') || e.event.endsWith('executed') || e.event.endsWith('submitted') || e.event.endsWith('locked') ? 'bg-positive-bg text-positive'
                        : 'bg-accent text-ink-2')}>
                    {EVENT_LABEL[e.event] ?? e.event}
                  </span>
                </td>
                <td className="max-w-md truncate px-4 py-2.5 text-ink-2">{describe(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
