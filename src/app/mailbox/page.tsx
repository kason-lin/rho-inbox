'use client';
/**
 * Story beat 1: a Gmail-style inbox (generic mail client, not Google's). Northbeam Studio's $55,000
 * invoice arrived Oct 3 on net-60 terms. Nobody has entered it anywhere; Rho's read-only inbox
 * connection is the only thing that noticed.
 */
import { ArrowLeft, FileText, Inbox, Paperclip, Pencil, Search, Send, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PresenterBar } from '@/components/health/presenter-bar';
import { useHealth } from '@/components/health/use-health';
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

/** What Rho's read-only inbox connection noticed about this email. */
function FoundByRho({ invoice, afterAlert }: { invoice: Invoice; afterAlert: boolean }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-[#c7ebe3] bg-[#f8fcfb] px-4 py-3 text-[13px]">
      <Sparkles className="size-4 text-[#048d73]" />
      <span>
        <span className="font-semibold">Rho found an invoice:</span> {invoice.vendor}, ${invoice.amount.toLocaleString()}, due {shortDay(invoice.due)} (net {invoice.terms_days}).
        <span className="text-[#5f6368]"> Not in Rho Bills or the bank yet.</span>
      </span>
      <Link href={afterAlert ? '/business-health' : '/business-health#coming-up'} className="ml-auto font-semibold text-[#048d73] hover:underline">See it in Business health →</Link>
    </div>
  );
}
