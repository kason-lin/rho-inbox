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
        'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-accent hover:text-foreground',
        active && 'bg-accent font-medium text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
      <span className="truncate">{item.label}</span>
      <span className="ml-auto flex items-center gap-1.5">
        {item.badge}
        {item.menu && <ChevronDown className="size-3.5 opacity-50" />}
      </span>
    </Link>
  );
}

function Section({ title, items, path }: { title?: string; items: Item[]; path: string }) {
  return (
    <div className="space-y-0.5">
      {title && <div className="px-2.5 pt-4 pb-1 text-[11px] font-medium text-muted-foreground">{title}</div>}
      {items.map(i => (
        <NavItem key={i.label} item={i} active={i.href === '/' ? path === '/' : path.startsWith(i.href)} />
      ))}
    </div>
  );
}

const NewBadge = () => (
  <span className="rounded bg-mint px-1.5 py-px text-[10px] font-semibold text-mint-ink">New</span>
);

export function Sidebar() {
  const path = usePathname();
  const { data } = useLive<{ unread: number; needs_action: number }>('/api/summary', ['inbox_events']);
  const unread = data?.unread ?? 0;

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
  const workflow: Item[] = [
    { label: 'Invoicing', href: '/soon/invoicing', icon: FileText, menu: true },
    { label: 'Expenses', href: '/soon/expenses', icon: Receipt, menu: true },
    { label: 'Reimbursements', href: '/soon/reimbursements', icon: HandCoins, menu: true },
    { label: 'Bill Pay', href: '/soon/bill-pay', icon: Banknote, menu: true },
    { label: 'Accounting', href: '/soon/accounting', icon: BookOpen, menu: true },
  ];
  const admin: Item[] = [
    { label: 'Users', href: '/soon/users', icon: Users, menu: true },
    { label: 'Integrations', href: '/soon/integrations', icon: Blocks },
    { label: 'Audit log', href: '/audit', icon: ScrollText },
    { label: 'Architecture', href: '/architecture', icon: Network },
    { label: 'Partner Perks', href: '/soon/partner-perks', icon: Gift },
    { label: 'Settings', href: '/soon/settings', icon: Settings },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-wordmark text-[28px] leading-none tracking-tight">Rho</Link>
        <PanelLeft className="size-4 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <button className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium hover:bg-accent">
        <span className="grid size-6 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-white">LL</span>
        Loop Labs
        <ChevronDown className="ml-auto size-3.5 opacity-50" />
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <Section items={main} path={path} />
        <Section title="Workflow" items={workflow} path={path} />
        <Section title="Administration" items={admin} path={path} />
      </nav>
    </aside>
  );
}

export { NewBadge };
