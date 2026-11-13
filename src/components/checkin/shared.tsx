'use client';
import { Eye, Lock, Users } from 'lucide-react';
import { useViewer } from '@/components/shell/viewer';
import { useLive } from '@/hooks/use-live';
import type { CheckinView } from '@/lib/checkin/store';
import type { CardType, ProofSection } from '@/lib/checkin/types';
import { formatUSD, shortDate } from '@/lib/format';
import { cn } from 'cn';

export function useCheckin(as?: string) {
  const { viewer } = useViewer();
  return useLive<CheckinView>(`/api/checkin?as=${as ?? viewer.id}`, ['checkin_cards', 'accounts']);
}

export const TYPE_LABEL: Record<CardType, string> = {
  payday_guard: 'Payday guard',
  suspicious_charge: 'Suspicious charge',
  subscription_review: 'Subscription review',
  burn_change: 'Burn change',
};

export function TypeChip({ type, urgent }: { type: CardType; urgent: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase',
      urgent ? 'bg-negative-bg text-negative' : 'bg-accent text-ink-2',
    )}>
      {urgent && <span className="size-1.5 rounded-full bg-negative" />}
      {TYPE_LABEL[type]}{urgent ? ' · urgent' : ''}
    </span>
  );
}

export function DataAsOf({ iso, className }: { iso: string; className?: string }) {
  const t = new Date(iso);
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      Data as of {t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}, {shortDate(iso)}
    </span>
  );
}

/** Banner explaining what the current role can see and do (guardrails made visible). */
export function RoleBanner() {
  const { viewer } = useViewer();
  if (viewer.role === 'admin') return null;
  const member = viewer.role === 'member';
  return (
    <div className={cn('mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[13px]', member ? 'border-warning-border bg-warning-bg' : 'border-info-bg bg-info-bg/60')}>
      {member ? <Lock className="mt-0.5 size-4 text-warning" /> : <Users className="mt-0.5 size-4 text-info" />}
      <div>
        <span className="font-medium">Viewing as {viewer.name} ({viewer.title}).</span>{' '}
        {member
          ? 'Payroll details are hidden for your role, and approvals need an admin.'
          : "Account managers see the same cards as the company, so support starts with context. Only the company can decide."}
      </div>
    </div>
  );
}

/** The transactions, balances and drivers behind a card. */
export function ProofView({ sections }: { sections: ProofSection[] }) {
  return (
    <div className="space-y-5">
      {sections.map(s => (
        <div key={s.title}>
          <h3 className="mb-2 text-[13px] font-semibold">{s.title}</h3>
          <div className="divide-y rounded-lg border bg-white">
            {s.items.map((i, n) => (
              <div key={n} className={cn('flex items-center gap-4 px-4 py-2.5 text-[13px]', i.emphasis && 'bg-tint font-semibold')}>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{i.label}</div>
                  {i.detail && (
                    <div className={cn('truncate text-xs text-muted-foreground', i.detail === 'Hidden for your role' && 'flex items-center gap-1')}>
                      {i.detail === 'Hidden for your role' && <Lock className="size-3" />}
                      {i.detail}
                    </div>
                  )}
                </div>
                {i.date && <div className="w-20 text-right text-xs text-muted-foreground">{shortDate(i.date.length === 10 ? `${i.date}T12:00:00` : i.date)}</div>}
                <div className={cn('tabular w-32 text-right', (i.amount ?? 0) < 0 && 'text-negative')}>
                  {i.amount === null ? <span className="text-muted-foreground">••••</span> : i.amount !== undefined ? formatUSD(i.amount) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ViewOnlyNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Eye className="size-3.5" /> View only for your role
    </p>
  );
}
