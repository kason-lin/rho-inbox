'use client';
/**
 * The dark bar at the top of every Business health demo screen: "Sample data" label, the story steps,
 * the demo date control (Oct 3 ↔ Nov 18) and "Reset demo". It's for the presenter, not part of Rho.
 */
import { CalendarDays, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_DATES } from '@/lib/health/data';
import { cn } from 'cn';
import { healthPost, useHealth } from './use-health';

const STEPS = [
  { href: '/mailbox', label: 'Inbox' },
  { href: '/alert', label: 'Alert' },
  { href: '/business-health', label: 'Business health' },
  { href: '/settings/connected-tools', label: 'Connected tools' },
  { href: '/iphone', label: 'iPhone' },
];

export function PresenterBar({ className }: { className?: string }) {
  const { data } = useHealth();
  const router = useRouter();
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const date = data?.date ?? DEMO_DATES.invoiceArrives;

  async function jump(to: string) {
    setBusy(true);
    try {
      await healthPost('state', { date: to });
      if (to === DEMO_DATES.alert) router.push('/mailbox?new=1');   // on Nov 18 Rho's alert lands in the inbox
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await healthPost('reset');
      router.push('/mailbox');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-[#151716] px-3 py-2 text-[12px] text-white', className)}>
      <span className="rounded bg-mint px-1.5 py-0.5 text-[11px] font-bold text-mint-ink">Sample data</span>
      <nav className="flex flex-wrap items-center gap-1">
        {STEPS.map((s, i) => {
          const active = s.href === '/business-health' ? path === s.href : path.startsWith(s.href);
          return (
            <Link key={s.href} href={s.href} className={cn('rounded px-2 py-1 text-white/70 hover:text-white', active && 'bg-white/15 text-white')}>
              <span className="mr-1 text-white/40">{i + 1}</span>{s.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <CalendarDays className="size-3.5 text-white/60" />
        <span className="text-white/60">Demo date</span>
        <div className="flex rounded-md bg-white/10 p-0.5">
          {[DEMO_DATES.invoiceArrives, DEMO_DATES.alert].map(d => (
            <button
              key={d}
              disabled={busy}
              onClick={() => void jump(d)}
              className={cn('rounded px-2 py-0.5 font-medium', date === d ? 'bg-white text-[#151716]' : 'text-white/80 hover:text-white')}
            >
              {d === DEMO_DATES.invoiceArrives ? 'Oct 3' : 'Nov 18'}
            </button>
          ))}
        </div>
        <button disabled={busy} onClick={() => void reset()} className="flex items-center gap-1 rounded-md border border-white/25 px-2 py-0.5 font-medium hover:bg-white/10">
          <RotateCcw className="size-3" /> Reset demo
        </button>
      </div>
    </div>
  );
}
