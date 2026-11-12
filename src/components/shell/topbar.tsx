'use client';
import { Bell, Check, ChevronDown, CircleHelp, Gift } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLive } from '@/hooks/use-live';
import { relativeTime } from '@/lib/format';
import type { InboxThread } from '@/lib/types';
import { SourceIcon } from './source-icon';
import { initials, ROLE_LABEL, useViewer } from './viewer';

function BellMenu() {
  const { data } = useLive<{ threads: InboxThread[] }>('/api/events?status=unread', ['inbox_events']);
  const unread = data?.threads ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-8 place-items-center rounded-md hover:bg-accent" aria-label={`${unread.length} unread`}>
        <Bell className="size-4" strokeWidth={1.75} />
        {unread.length > 0 && (
          <span className="tabular absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-negative px-1 text-[10px] leading-4 font-semibold text-white">
            {unread.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Unread <span className="text-xs font-normal text-muted-foreground">{unread.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {unread.slice(0, 5).map(t => (
          <DropdownMenuItem key={t.thread_id} asChild>
            <Link href={`/inbox?thread=${t.thread_id}`} className="flex items-start gap-2.5 py-2">
              <SourceIcon source={t.source} className="size-7" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] leading-snug font-medium">{t.head.title}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(t.head.created_at)}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
        {!unread.length && <div className="px-2 py-6 text-center text-sm text-muted-foreground">You’re all caught up.</div>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/inbox" className="justify-center text-[13px] font-medium">Open Inbox</Link>
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
        <span className="grid size-7 place-items-center rounded-full bg-[#fbe3ec] text-[11px] font-semibold text-[#9c2b56]">{initials(viewer.name)}</span>
        <span className="leading-tight">
          <span className="block text-[13px] font-medium">{viewer.name}</span>
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
                {u.title} · {u.role === 'admin' ? 'can approve' : u.role === 'member' ? 'payroll hidden, cannot approve' : 'sees the same cards, view only'}
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b bg-white/90 px-6 backdrop-blur">
      <span className="flex items-center gap-1.5 rounded-md bg-lavender px-2.5 py-1 text-xs font-medium text-lavender-ink">
        <Gift className="size-3.5" /> Earn $500
      </span>
      <span className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-2">
        <CircleHelp className="size-3.5" /> Help Center
      </span>
      <BellMenu />
      <ViewerMenu />
    </header>
  );
}
