'use client';
/**
 * Settings → Connected tools: the other tools Business health reads, each read-only, with exactly what
 * it can see, plus what Rho reads and never reads. Disconnect or reconnect any tool in one click.
 * Mock connections: nothing real is contacted.
 */
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Btn, Chip } from '@/components/health/ui';
import { healthPost, useHealth } from '@/components/health/use-health';
import connections from '@/data/business-health/connections.json';

export default function ConnectedToolsPage() {
  const { data } = useHealth();
  const [busy, setBusy] = useState<string | null>(null);
  const connected = new Set(data?.connected ?? []);

  async function toggle(id: string, on: boolean) {
    setBusy(id);
    try { await healthPost('state', on ? { disconnect: id } : { connect: id }); } catch { /* toast shown */ } finally { setBusy(null); }
  }

  return (
    <>
      <PresenterBar className="mb-6" />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Settings · Connected tools</div>
          <h1 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight">Connected tools</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Rho reads your other tools so Business health sees money owed before it reaches the bank. Read-only, billing details only.</p>
        </div>
        {data && <Chip tone="teal">{connected.size} of {connections.tools.length} connected</Chip>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connections.tools.map(t => {
          const on = connected.has(t.id);
          return (
            <div key={t.id} className="flex flex-col gap-3 rounded-lg border bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg font-mono text-[14px] text-white" style={{ background: t.color }}>{t.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{t.name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{t.account}</div>
                </div>
                <Chip tone={on ? 'teal' : 'plain'}>{on ? 'Read-only' : 'Not connected'}</Chip>
              </div>
              <p className="text-[13px]"><span className="text-muted-foreground">Reads:</span> {t.reads}</p>
              <ul className="space-y-1 text-[12px] text-ink-2">
                {t.scopes.map(s => <li key={s} className="flex items-start gap-1.5"><Lock className="mt-0.5 size-3 shrink-0 text-muted-foreground" /> {s}</li>)}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-1">
                <span className="text-[12px] text-muted-foreground">{t.what}</span>
                <Btn variant={on ? 'line' : 'mint'} disabled={busy !== null} onClick={() => void toggle(t.id, on)}>
                  {busy === t.id ? '…' : on ? 'Disconnect' : 'Connect'}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-[14px] font-semibold">What Rho reads</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-2">{connections.reads.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <h2 className="text-[14px] font-semibold">What Rho never reads</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-2">{connections.never_reads.map(r => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 text-[12px] text-muted-foreground">Per-person AI cost is off by default. Disconnect any tool in one click.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-[13px]">
        <span><span className="font-semibold">Note:</span> {connections.rho_note}</span>
        <Link href="/business-health" className="font-semibold text-brand hover:underline">Back to Business health →</Link>
      </div>
    </>
  );
}
