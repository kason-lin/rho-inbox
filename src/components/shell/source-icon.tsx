import { Banknote, CircleCheckBig, CreditCard, FileText, Landmark } from 'lucide-react';
import type { Source } from '@/lib/types';
import { cn } from 'cn';

const ICONS: Record<Source, { icon: React.ElementType; className: string }> = {
  cards: { icon: CreditCard, className: 'bg-lavender text-lavender-ink' },
  bill_pay: { icon: Banknote, className: 'bg-warning-bg text-warning' },
  invoicing: { icon: FileText, className: 'bg-info-bg text-info' },
  treasury: { icon: Landmark, className: 'bg-positive-bg text-positive' },
  approvals: { icon: CircleCheckBig, className: 'bg-accent text-ink-2' },
};

export function SourceIcon({ source, className }: { source: Source; className?: string }) {
  const { icon: Icon, className: tone } = ICONS[source];
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', tone, className)}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}
