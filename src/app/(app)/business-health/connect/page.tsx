'use client';
/**
 * Connect tools (side path in the spec): the founder picks which tools Business health may read.
 * Every connection is read-only and lists exactly what it can see. Nothing real is contacted.
 */
import { ArrowRight, Check, Lock, Plug } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { healthPost, useHealth } from '@/components/health/use-health';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Card, PageHeader } from '@/components/shell/page-header';
import connections from '@/data/business-health/connections.json';

export default function ConnectPage() {
  const { data } = useHealth();
  const [busy, setBusy] = useState<string | null>(null);
  const connected = new Set(data?.connected ?? []);
  const requiredDone = connections.required.every(id => connected.has(id));

  async function connect(id: string) {
    setBusy(id);
    try {
      await healthPost('state', { connect: id });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PresenterBar className="mb-6" />
      <PageHeader
        title="Connect tools to Business health"
        subtitle="Read-only. You choose which tools and inboxes Rho can see, and nothing is ever written back."
        actions={
          <button
            onClick={() => void connect('all')}
            disabled={busy !== null}
            className="flex h-[30px] items-center gap-1.5 rounded-md bg-mint px-3 text-[12px] font-semibold text-mint-ink hover:bg-mint-hover"
          >
            <Plug className="size-3.5" /> Connect all (read-only)
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {connections.tools.map(t => {
          const on = connected.has(t.id);
          return (
            <Card key={t.id}>
              <div className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold">{t.name}</div>
                    <div className="text-[12px] text-muted-foreground">{t.what}</div>
                  </div>
                  {!connections.required.includes(t.id) && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-ink-2">Optional</span>}
                </div>
                <ul className="space-y-1 text-[12px] text-ink-2">
                  {t.scopes.map(s => (
                    <li key={s} className="flex items-start gap-1.5"><Lock className="mt-0.5 size-3 shrink-0 text-muted-foreground" /> {s}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-1">
                  {on ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-positive"><Check className="size-3.5" /> Connected (read-only)</span>
                  ) : (
                    <button onClick={() => void connect(t.id)} disabled={busy !== null} className="h-[30px] rounded-md border bg-white px-3 text-[12px] font-semibold hover:bg-[#f2f5f4]">
                      {busy === t.id ? 'Connecting…' : 'Connect (read-only)'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-[13px]">
        <span><span className="font-semibold">Note:</span> {connections.rho_note}</span>
        <Link
          href="/mailbox"
          aria-disabled={!requiredDone}
          className={`flex items-center gap-1 font-semibold ${requiredDone ? 'text-brand hover:underline' : 'pointer-events-none text-muted-foreground'}`}
        >
          {requiredDone ? 'Next: open the inbox' : 'Connect Gmail, Stripe, Gusto and Anthropic to continue'} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
