'use client';
/**
 * Story beat 1: a Gmail-style inbox (generic mail client, not Google's). Northbeam Studio's $55,000
 * invoice arrived Oct 3 on net-60 terms. Nobody has entered it anywhere; Rho's read-only inbox
 * connection is the only thing that noticed.
 */
import { ArrowLeft, FileText, Inbox, Paperclip, Pencil, Search, Send, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Btn } from '@/components/health/ui';
import { healthPost, useHealth } from '@/components/health/use-health';
import { DEMO_DATES } from '@/lib/health/data';
import type { Email } from '@/lib/health/data';
import { shortDay } from '@/lib/health/dates';
import type { Invoice } from '@/lib/health/extract';
import { cn } from 'cn';

type InboxData = { date: string; connected: boolean; emails: Email[]; invoices: Invoice[] };

export default function MailboxPage() {
  return (
    <Suspense>
      <Mailbox />
    </Suspense>
  );
}

function Mailbox() {
  const params = useSearchParams();
  const openId = params.get('email');
  const { data: health } = useHealth();
  const [data, setData] = useState<InboxData | null>(null);

  useEffect(() => {
    fetch('/api/health/inbox', { cache: 'no-store' }).then(r => r.json()).then(setData);
  }, [health?.date, health?.connected.length]);

  const open = data?.emails.find(e => e.id === openId) ?? null;
  const invoiceFor = (id: string) => data?.invoices.find(i => i.id === id);

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-3 text-[#1f1f1f]">
      <PresenterBar className="mb-3" />
      {health && health.date < DEMO_DATES.alert && data?.invoices[0] && <Narration amount={data.invoices[0].amount} />}
      <div className="flex gap-3">
        {/* left rail */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="mb-4 flex items-center gap-2 px-3 py-2 text-[20px]">
            <span className="grid size-8 place-items-center rounded-lg bg-[#c2e7ff] text-[#041e49]"><Inbox className="size-4" /></span> Mail
          </div>
          <button className="mb-4 flex items-center gap-3 rounded-2xl bg-[#c2e7ff] px-5 py-4 text-[14px] font-medium text-[#001d35]">
            <Pencil className="size-4" /> Compose
          </button>
          {[[Inbox, 'Inbox', data?.emails.length ?? 0], [Star, 'Starred', 0], [Send, 'Sent', 0], [FileText, 'Drafts', 0]].map(([Icon, label, n]) => {
            const I = Icon as React.ElementType;
            return (
              <div key={label as string} className={cn('flex items-center gap-4 rounded-r-full px-6 py-1.5 text-[14px]', label === 'Inbox' && 'bg-[#d3e3fd] font-semibold')}>
                <I className="size-4" /> {label as string}
                {(n as number) > 0 && <span className="ml-auto text-[12px]">{n as number}</span>}
              </div>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl bg-white">
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <div className="flex flex-1 items-center gap-3 rounded-full bg-[#e9eef6] px-4 py-2.5 text-[14px] text-[#444746]">
              <Search className="size-4" /> Search mail
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-[#fbe0ec] text-[12px] font-semibold text-[#c2316e]">KL</span>
          </div>

          {!data && <p className="p-6 text-[14px] text-[#444746]">Loading…</p>}

          {data && !open && (
            <ul>
              {data.emails.map(e => {
                const inv = invoiceFor(e.id);
                const unread = !!inv;
                return (
                  <li key={e.id}>
                    <Link href={`/mailbox?email=${e.id}`} className={cn('flex items-center gap-4 border-b border-[#f1f3f4] px-4 py-2.5 text-[14px] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3)]', unread ? 'bg-white font-semibold' : 'bg-[#f2f6fc]')}>
                      <Star className="size-4 shrink-0 text-[#c4c7c5]" />
                      <span className="w-56 shrink-0 truncate">{e.from_name.split(' · ').pop()}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {e.subject} <span className="font-normal text-[#5f6368]">– {e.body.replace(/\n+/g, ' ').slice(0, 90)}</span>
                      </span>
                      {e.attachment && <Paperclip className="size-4 shrink-0 text-[#5f6368]" />}
                      <span className="w-16 shrink-0 text-right text-[12px]">{shortDay(e.received.slice(0, 10))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {data && open && (
            <article className="px-6 py-5">
              <Link href="/mailbox" className="mb-4 inline-flex items-center gap-1 text-[13px] text-[#444746] hover:underline"><ArrowLeft className="size-4" /> Back to inbox</Link>
              <h1 className="text-[22px]">{open.subject}</h1>
              <div className="mt-4 flex items-center gap-3 text-[14px]">
                <span className="grid size-10 place-items-center rounded-full bg-[#5a4bd1] text-[15px] text-white">{open.from_name.split(' · ').pop()![0]}</span>
                <div>
                  <div><span className="font-semibold">{open.from_name.split(' · ')[0]}</span> <span className="text-[12px] text-[#5f6368]">&lt;{open.from}&gt;</span></div>
                  <div className="text-[12px] text-[#5f6368]">to me · {new Date(open.received).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
              </div>

              {invoiceFor(open.id) && data.connected && (
                <FoundByRho invoice={invoiceFor(open.id)!} afterAlert={(health?.date ?? '') >= '2026-11-18'} />
              )}

              <div className="mt-5 text-[14px] leading-relaxed whitespace-pre-line">{open.body}</div>
              {open.attachment && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]">
                  <FileText className="size-4 text-[#d93025]" /> {open.attachment}
                </div>
              )}
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

/** Presenter caption for Oct 3: what's happening, and the jump to the alert six weeks later. */
function Narration({ amount }: { amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function jump() {
    setBusy(true);
    try { await healthPost('state', { date: DEMO_DATES.alert }); router.push('/alert'); } catch { setBusy(false); }
  }
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-3">
      <div>
        <div className="font-mono text-[11px] tracking-[0.08em] text-[#048d73] uppercase">Oct 3, 2026 · 9:14 AM</div>
        <p className="text-[15px] font-semibold">A ${amount.toLocaleString()} invoice lands in the finance inbox. Nobody forwards it to Rho.</p>
        <p className="text-[13px] text-[#5f6368]">It isn’t in the bank yet, so no banking app knows it exists.</p>
      </div>
      <Btn variant="mint" disabled={busy} onClick={() => void jump()}>Jump to Wed, Nov 18 →</Btn>
    </div>
  );
}

/** What Rho's read-only inbox connection noticed about this email, styled like Rho: the invoice, its line items, and that nobody has entered it. */
function FoundByRho({ invoice, afterAlert }: { invoice: Invoice; afterAlert: boolean }) {
  const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const due = new Date(`${invoice.due}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const tag = 'rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-[0.06em] uppercase';
  return (
    <div className="shadow-rho mt-6 max-w-xl overflow-hidden rounded-xl border border-[rgb(129_165_169/20%)] bg-white text-[#0c0f0f]">
      {/* header: Rho mark + mono eyebrow */}
      <div className="flex items-center gap-3 bg-[#0f0f10] px-5 py-3">
        <span className="font-wordmark text-[20px] leading-none text-[#f5f8f8]">Rho</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-[#6af3d9] uppercase">
          <Sparkles className="size-3.5" /> Found an invoice
        </span>
        <span className="ml-auto font-mono text-[11px] tracking-[0.06em] text-[#7f9195] uppercase">{invoice.number} · Net {invoice.terms_days}</span>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="font-mono text-[11px] tracking-[0.06em] text-[#7f9195] uppercase">{invoice.vendor} · amount due</div>
        <div className="mt-1 text-[34px] leading-[1.1] font-normal tracking-[-0.02em] tabular">{usd(invoice.amount)}</div>
        <div className="mt-1 text-[13px] text-[#364244]">Due {due}</div>

        <dl className="mt-4 text-[13px] tabular">
          {invoice.lines.map(l => (
            <div key={l.label} className="flex justify-between border-t border-[#dfe7e8] py-2.5">
              <dt className="text-[#364244]">{l.label}</dt><dd>{usd(l.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-[#0c0f0f] py-2.5 font-medium">
            <dt>Total</dt><dd>{usd(invoice.amount)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#dfe7e8] bg-[rgb(129_165_169/8%)] px-5 py-3">
        <span className={`${tag} bg-[#fff4e0] text-[#a86500]`}>Not in Rho Bills</span>
        <span className={`${tag} bg-white text-[#364244] ring-1 ring-[#dfe7e8]`}>Not forwarded</span>
        <Link
          href="/business-health"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0c0f0f] px-4 text-[13px] text-[#f5f8f8] transition-colors hover:bg-[#1b2122]"
        >
          {afterAlert ? 'Review in Business health' : 'See it in Business health'} <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
