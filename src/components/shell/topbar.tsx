'use client';
/** Rho's top bar: referral pill, Help Center, the bell (Business health cards that need you) and the viewer menu. */
import { Bell, Check, ChevronDown, CircleHelp, Gift } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHealth } from '@/components/health/use-health';
import { initials, ROLE_LABEL, useViewer } from './viewer';

function BellMenu() {
  const { data } = useHealth();
  const cards = data?.needs_you.cards ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-8 place-items-center rounded-md hover:bg-accent" aria-label={`${cards.length} need you`}>
        <Bell className="size-[17px]" strokeWidth={1.6} />
        {cards.length > 0 && (
          <span className="tabular absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-negative px-1 text-[10px] leading-4 font-semibold text-white">
            {cards.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Needs you</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cards.map(c => (
          <DropdownMenuItem key={c.id} asChild>
            <Link href="/business-health" className="flex flex-col items-start gap-0.5 py-2">
              {c.urgent && <span className="rounded bg-negative-bg px-1.5 text-[10px] font-semibold text-negative">Urgent</span>}
              <span className="line-clamp-2 text-[13px] leading-snug font-medium">{c.title}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        {!cards.length && <div className="px-2 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</div>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/business-health" className="justify-center text-[13px] font-medium">Open Business health</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewerMenu() {
  const { viewer, users, setViewer } = useViewer();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 text-left hover:bg-accent">
        <span className="grid size-[30px] place-items-center rounded-full bg-[#fbe0ec] text-[11px] font-semibold text-[#c2316e]">{initials(viewer.name)}</span>
        <span className="leading-tight">
          <span className="block text-[12px] font-semibold">{viewer.name}</span>
          <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[viewer.role]}</span>
        </span>
        <ChevronDown className="size-3.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">View the prototype as…</DropdownMenuLabel>
        {users.map(u => (
          <DropdownMenuItem key={u.id} onSelect={() => setViewer(u.id)} className="items-start gap-2.5 py-2">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] font-semibold">{initials(u.name)}</span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium">{u.name}</span>
              <span className="block text-xs text-muted-foreground">
                {u.title} · {u.role === 'admin' ? 'can approve' : u.role === 'member' ? 'cannot approve' : 'sees the same cards, view only'}
              </span>
            </span>
            {u.id === viewer.id && <Check className="mt-1 size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center justify-end gap-3 border-b bg-white px-7">
      <span className="flex items-center gap-1.5 rounded-md border border-[#d9d0ff] bg-[linear-gradient(90deg,#ece8ff,#f6e9ff_55%,#e6f0ff)] px-2.5 py-[5px] text-[12px] font-semibold text-[#2f2477]">
        <Gift className="size-3.5" strokeWidth={1.75} /> Earn $500
      </span>
      <span className="flex items-center gap-1.5 px-1 text-[12px] font-semibold text-foreground">
        <CircleHelp className="size-[15px]" strokeWidth={1.75} /> Help Center
      </span>
      <BellMenu />
      <ViewerMenu />
    </header>
  );
}
