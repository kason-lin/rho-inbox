'use client';
import {
  Banknote, BookOpen, Blocks, CalendarCheck, ChartLine, ChevronDown, CreditCard, FileText, Gift, HandCoins,
  House, Inbox, Landmark, Network, PanelLeft, Receipt, ScrollText, Settings, Store, Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLive } from '@/hooks/use-live';
import { cn } from 'cn';

type Item = { label: string; href: string; icon: React.ElementType; menu?: boolean; badge?: React.ReactNode };

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-[#f2f5f4] hover:text-foreground',
        active && 'bg-[#eef2f1] font-medium text-foreground',
      )}
    >
      <Icon className={cn('size-[15px] shrink-0', active ? 'text-brand' : 'opacity-70')} strokeWidth={1.6} />
      <span className="truncate">{item.label}</span>
      <span className="ml-auto flex items-center gap-1.5">
        {item.badge}
        {item.menu && <ChevronDown className="size-3.5 opacity-45" />}
      </span>
    </Link>
  );
}

function Section({ title, items, path }: { title?: string; items: Item[]; path: string }) {
  return (
    <div className="space-y-px">
      {title && <div className="px-2.5 pt-4 pb-1.5 text-[11px] text-muted-foreground">{title}</div>}
      {items.map(i => (
        <NavItem key={i.label} item={i} active={i.href === '/' ? path === '/' : path.startsWith(i.href)} />
      ))}
    </div>
  );
}

export const NewBadge = () => (
  <span className="rounded bg-mint px-1.5 py-px text-[10px] font-semibold text-mint-ink">New</span>
);

export function Sidebar() {
  const path = usePathname();
  const { data } = useLive<{ unread: number; needs_action: number }>('/api/summary', ['inbox_events']);
  const unread = data?.unread ?? 0;

  // Rho's own navigation, with the prototype's features (Inbox, Check-in, Audit log, Architecture) added in.
  const main: Item[] = [
    { label: 'Home', href: '/', icon: House },
    {
      label: 'Inbox', href: '/inbox', icon: Inbox,
      badge: unread > 0 && (
        <span className="tabular min-w-5 rounded-full bg-foreground px-1.5 text-center text-[10px] leading-4 font-semibold text-white">{unread}</span>
      ),
    },
    { label: 'Check-in', href: '/checkin', icon: CalendarCheck, badge: <NewBadge /> },
    { label: 'Banking', href: '/soon/banking', icon: Landmark, menu: true },
    { label: 'Cards', href: '/soon/cards', icon: CreditCard, menu: true },
    { label: 'Vendors', href: '/soon/vendors', icon: Store },
    { label: 'Reporting', href: '/soon/reporting', icon: ChartLine, menu: true },
  ];
  const workflows: Item[] = [
    { label: 'Invoicing', href: '/soon/invoicing', icon: FileText, menu: true, badge: <NewBadge /> },
    { label: 'Expenses', href: '/soon/expenses', icon: Receipt, menu: true },
    { label: 'Reimbursements', href: '/soon/reimbursements', icon: HandCoins, menu: true },
    { label: 'Bill Pay', href: '/soon/bill-pay', icon: Banknote, menu: true },
    { label: 'Accounting', href: '/soon/accounting', icon: BookOpen, menu: true },
  ];
  const admin: Item[] = [
    { label: 'Users', href: '/soon/users', icon: Users, menu: true },
    { label: 'Integrations', href: '/soon/integrations', icon: Blocks },
    { label: 'Partner Perks', href: '/soon/partner-perks', icon: Gift },
    { label: 'Audit log', href: '/audit', icon: ScrollText },
    { label: 'Architecture', href: '/architecture', icon: Network },
    { label: 'Settings', href: '/soon/settings', icon: Settings },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[212px] shrink-0 flex-col border-r bg-white">
      <div className="flex h-[58px] items-center justify-between px-[18px]">
        <Link href="/" className="font-wordmark text-[27px] leading-none tracking-tight">Rho</Link>
        <PanelLeft className="size-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <button className="mx-2.5 mt-3 mb-3 flex h-9 items-center gap-2 rounded-md px-2 text-left text-[12px] font-semibold hover:bg-[#f2f5f4]">
        <span className="grid size-6 place-items-center rounded-full bg-[conic-gradient(from_200deg,#ff7a59,#f5c84c,#3ecfa3,#54a0ff,#aea2fb,#ff7a59)] text-[9px] font-bold text-white">LL</span>
        Loop Labs
        <ChevronDown className="ml-auto size-3.5 opacity-50" />
      </button>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-20">
        <Section items={main} path={path} />
        <Section title="Workflows" items={workflows} path={path} />
        <Section title="Administration" items={admin} path={path} />
      </nav>
    </aside>
  );
}
