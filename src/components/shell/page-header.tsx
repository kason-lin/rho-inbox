/** Rho's page header: a quiet one-line title on the left, small outlined actions on the right. */
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-[15px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Rho's small outlined header buttons (More, Transfer, Deposit…). */
export function HeaderButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-[30px] items-center gap-1.5 rounded-md border bg-white px-2.5 text-[12px] font-semibold text-foreground hover:bg-[#f2f5f4] disabled:opacity-50 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

/** A section in Rho's dashboard style: the title sits above an outlined white box. */
export function Card({ title, action, children, className = '' }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-2.5 flex min-h-6 items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className="rounded-lg border bg-white">{children}</div>
    </section>
  );
}

/** The ‹ Nov 2026 › control Rho puts next to monthly sections (display only in the prototype). */
export function MonthNav({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-medium text-ink-2">
      <span className="opacity-60">‹</span> {label} <span className="opacity-60">›</span>
    </span>
  );
}
