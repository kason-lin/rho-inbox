'use client';
import { ArrowRight, Archive, Inbox, Paperclip, Search, Send, Star } from 'lucide-react';
import Link from 'next/link';
import { DigestCard } from '@/components/checkin/digest';
import { useLive } from '@/hooks/use-live';
import type { CheckinView } from '@/lib/checkin/store';
import { formatUSD } from '@/lib/format';

/**
 * Screen 1: the Monday check-in as it lands in the founder's email. A neutral mail-client
 * mockup; the cards are live, so they match what the app will show when she clicks through.
 */
const OTHER_MAIL = [
  { from: 'Halcyon Health', subject: 'Re: pilot kickoff next week', time: '7:42 AM' },
  { from: 'Jordan Ellis', subject: 'Hiring plan: two part-time engineers', time: 'Sun' },
  { from: 'Northwind Logistics', subject: 'Payment sent for invoice #1042', time: 'Fri' },
  { from: 'Investor updates', subject: 'October update draft', time: 'Thu' },
];

export default function MailPage() {
  const { data } = useLive<CheckinView>('/api/checkin?as=maya', ['checkin_cards']);
  const count = data?.cards.length ?? 3;
  const subject = `${count} ${count === 1 ? 'thing needs' : 'things need'} you this week`;

  return (
    <div className="flex min-h-screen bg-[#eef1f0] p-4 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl overflow-hidden rounded-xl border bg-white shadow-sm">
        {/* folders */}
        <aside className="hidden w-48 shrink-0 border-r bg-tint p-3 text-[13px] md:block">
          <div className="mb-4 px-2 font-semibold">Mail</div>
          {[[Inbox, 'Inbox', 5], [Star, 'Starred', 0], [Send, 'Sent', 0], [Archive, 'Archive', 0]].map(([Icon, label, n]) => {
            const I = Icon as React.ElementType;
            return (
              <div key={label as string} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${label === 'Inbox' ? 'bg-white font-medium shadow-xs' : 'text-ink-2'}`}>
                <I className="size-4" strokeWidth={1.75} /> {label as string}
                {(n as number) > 0 && <span className="ml-auto text-xs">{n as number}</span>}
              </div>
            );
          })}
        </aside>

        {/* message list */}
        <section className="hidden w-80 shrink-0 border-r lg:block">
          <div className="flex items-center gap-2 border-b px-4 py-3 text-[13px] text-muted-foreground">
            <Search className="size-4" /> Search mail
          </div>
          <div className="border-l-2 border-l-brand bg-positive-subtle px-4 py-3">
            <div className="flex justify-between text-[13px] font-semibold">Rho Check-in <span className="font-normal text-muted-foreground">8:00 AM</span></div>
            <div className="text-[13px] font-semibold">{subject}</div>
            <div className="truncate text-xs text-muted-foreground">{data?.cards[0]?.title ?? 'Your weekly briefing is ready'}</div>
          </div>
          {OTHER_MAIL.map(m => (
            <div key={m.subject} className="border-t px-4 py-3">
              <div className="flex justify-between text-[13px]">{m.from} <span className="text-muted-foreground">{m.time}</span></div>
              <div className="truncate text-[13px] text-ink-2">{m.subject}</div>
            </div>
          ))}
        </section>

        {/* the email */}
        <article className="min-w-0 flex-1 overflow-y-auto">
          <header className="border-b px-8 py-5">
            <h1 className="text-xl font-semibold">{subject}</h1>
            <div className="mt-3 flex items-center gap-3 text-[13px]">
              <span className="grid size-9 place-items-center rounded-full bg-foreground font-wordmark text-lg text-white">R</span>
              <div>
                <div><span className="font-semibold">Rho Check-in</span> <span className="text-muted-foreground">· to Maya Chen</span></div>
                <div className="text-xs text-muted-foreground">Monday, 8:00 AM · Loop Labs</div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[560px] px-6 py-8">
            <div className="rounded-xl border bg-white p-7 shadow-xs">
              <div className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">Monday 8:00 AM · Weekly check-in</div>
              <h2 className="mt-2 font-display text-2xl font-semibold">{subject.replace(' this week', '')}</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Rho did the prep work. Each one takes a tap, and no money moves without you.</p>
              <div className="mt-4"><DigestCard as="maya" compact /></div>

              <ol className="mt-5 space-y-3">
                {(data?.cards ?? []).map((c, i) => (
                  <li key={c.id} className="rounded-lg border p-4">
                    <div className="flex gap-3">
                      <span className="font-display text-lg leading-6 font-semibold">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-[15px] leading-6"><span className="font-semibold">{c.title}</span>{c.question ? ` ${c.question}` : ''}</p>
                        <Link
                          href={`/checkin/${c.id}`}
                          className="mt-3 inline-flex h-8 items-center gap-1 rounded-md bg-mint px-3 text-[13px] font-semibold text-mint-ink hover:bg-mint-hover"
                        >
                          {c.action?.kind === 'transfer' ? `Review the ${formatUSD(c.action.amount).replace('.00', '')} transfer`
                            : c.action?.kind === 'share' ? 'See the breakdown' : 'Review in Rho'}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <Link href="/inbox" className="mt-4 block text-[13px] text-ink-2 hover:underline">
                + {data?.others.length ?? 14} other things look fine
              </Link>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Every card links to the transactions behind it. You can change how often you get this in Rho settings.
            </p>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><Paperclip className="size-3" /> Prototype email. Not sent by Rho.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
