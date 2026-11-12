'use client';
import { FileText, Sparkles } from 'lucide-react';
import { useViewer } from '@/components/shell/viewer';
import { useLive } from '@/hooks/use-live';
import type { Digest } from '@/lib/digest';
import { cn } from 'cn';

/** "Your week in three sentences", written by Claude (or the template fallback). */
export function DigestCard({ as, compact = false }: { as?: string; compact?: boolean }) {
  const { viewer } = useViewer();
  const { data } = useLive<Digest>(`/api/digest?as=${as ?? viewer.id}`, ['checkin_cards', 'accounts', 'inbox_events']);

  return (
    <div className={cn('rounded-lg border bg-white', compact ? 'p-4' : 'mb-5 p-5')}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your week in three sentences</span>
        {data && (
          <span
            title={data.note}
            className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', data.source === 'claude' ? 'bg-lavender text-lavender-ink' : 'bg-accent text-ink-2')}
          >
            {data.source === 'claude' ? <><Sparkles className="size-3" /> Written by Claude</> : <><FileText className="size-3" /> Template summary</>}
          </span>
        )}
      </div>
      {data ? (
        <p className={cn('leading-relaxed', compact ? 'text-[14px]' : 'text-[15px]')}>{data.text}</p>
      ) : (
        <div className="space-y-2 py-1">
          <div className="h-3.5 w-full animate-pulse rounded bg-accent" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-accent" />
        </div>
      )}
    </div>
  );
}
