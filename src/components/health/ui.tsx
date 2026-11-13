'use client';
/**
 * Small building blocks shared by the Business health screens: chips, buttons, the "math" table,
 * a centered modal and a side drawer. Styled with Rho's colors so the new tab feels native.
 */
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { signedUSD, type MathRow } from '@/lib/health/math';
import { cn } from 'cn';

type Tone = 'plain' | 'red' | 'teal' | 'amber';
const TONES: Record<Tone, string> = {
  plain: 'bg-[#f2f5f4] text-ink-2',
  red: 'bg-negative-bg text-negative',
  teal: 'bg-positive-bg text-positive',
  amber: 'bg-warning-bg text-warning ring-1 ring-warning-border',
};

/** A small rounded label, e.g. "Act · Due in 14 days". */
export function Chip({ tone = 'plain', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>;
}

type Variant = 'mint' | 'dark' | 'line' | 'link';
const VARIANTS: Record<Variant, string> = {
  mint: 'h-8 rounded-md bg-mint px-3 text-mint-ink hover:bg-mint-hover',
  dark: 'h-8 rounded-md bg-[#151716] px-3 text-white hover:bg-black',
  line: 'h-8 rounded-md border bg-white px-3 hover:bg-[#f2f5f4]',
  link: 'h-auto px-0 text-brand hover:underline',
};

export function Btn({ variant = 'line', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn('inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5', VARIANTS[variant], className)}
    />
  );
}

/** Small uppercase label above a section. */
export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase', className)}>{children}</div>;
}

/** "The math" as a two-column table; the total row is red if checking goes short. `extra` adds the suggested fix. */
export function MathTable({ rows, extra }: { rows: MathRow[]; extra?: MathRow }) {
  const all = extra ? [...rows, extra] : rows;
  return (
    <dl className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border text-[13px] tabular">
      {all.map(r => {
        const tone = r === extra ? 'teal' : r.total ? (r.amount < 0 ? 'red' : 'teal') : null;
        return (
          <div key={r.label} className={cn('col-span-2 grid grid-cols-subgrid border-b px-3 py-2 last:border-b-0', tone === 'red' && 'bg-negative-bg font-semibold text-negative', tone === 'teal' && 'bg-positive-subtle font-semibold text-positive')}>
            <dt className={cn(!tone && 'text-muted-foreground')}>{r.label}</dt>
            <dd className="text-right">{r === extra || r.plain ? `$${r.amount.toLocaleString('en-US')}` : signedUSD(r.amount)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Closes an overlay when Escape is pressed. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#151716]/40" onClick={onClose} />
      <div role="dialog" aria-label={label} className="relative flex max-h-[90vh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 rounded p-1 text-muted-foreground hover:bg-[#f2f5f4]"><X className="size-4" /></button>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ label, onClose, header, footer, children }: { label: string; onClose: () => void; header: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#151716]/30" onClick={onClose} />
      <aside role="dialog" aria-label={label} className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-6 py-5">
          <div>{header}</div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[#f2f5f4]"><X className="size-4" /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
