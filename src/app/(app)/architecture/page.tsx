import { Mermaid } from '@/components/architecture/mermaid';
import { Card, PageHeader } from '@/components/shell/page-header';

export const metadata = { title: 'Architecture · Rho Inbox prototype' };

// Solid boxes run in this prototype. Dashed boxes are how it would plug into Rho in production (assumptions).
const CHART = `
flowchart TB
  products["<b>Rho products</b><br/>Cards · Bill Pay · Invoicing<br/>Treasury · Approvals"]
  tools["<b>Connected tools</b><br/>payroll · Google Workspace<br/>email (opt-in)"]
  hooks["Webhooks /<br/>change feed"]
  queue[("Event<br/>queue")]
  normalize["<b>Normalize</b><br/>one inbox_events shape"]
  rules["<b>Priority rules</b><br/>needs action vs FYI"]
  checkin["<b>Check-in engine</b><br/>detect · rank · max 3"]
  db[("<b>Inbox DB + API</b><br/>Postgres · API routes")]
  inbox["<b>In-app Inbox</b><br/>live via Realtime"]
  email["<b>Monday email</b><br/>digest"]
  push["Push / SMS"]
  actions["<b>Action router</b><br/>right approver<br/>own accounts only"]
  audit[("Audit log")]

  products --> hooks
  tools -.-> hooks
  hooks --> queue --> normalize
  normalize --> rules --> db
  normalize --> checkin --> db
  db --> inbox
  db --> email
  db -.-> push
  inbox -- "Approve · Pay<br/>Dispute · Lock" --> actions
  email -- "tap" --> inbox
  actions --> audit
  actions -. "calls the product's API" .-> products
  actions -- "confirmation event" --> normalize

  classDef assumed stroke-dasharray: 5 4,fill:#ffffff,color:#454a48,stroke:#8f9693
  classDef built fill:#ffffff,stroke:#048d73,stroke-width:1.5px
  classDef engineNode fill:#e3fbf5,stroke:#048d73,stroke-width:1.5px
  classDef source fill:#151716,stroke:#151716,color:#ffffff
  class hooks,queue,push,tools assumed
  class db,inbox,email,audit,actions built
  class normalize,rules,checkin engineNode
  class products source
`;

const REAL = [
  ['Normalized table', 'One inbox_events row per update from any product, grouped into threads', 'supabase/migrations/0001_inbox.sql'],
  ['Priority rules', 'Bills due in under 3 days, unusual card charges, low cash, pending approvals, overdue invoices', 'src/lib/priority.ts'],
  ['Check-in engine', 'Payday guard, suspicious charge, subscription review, burn change; urgent first, runway-days bar, max 3', 'src/lib/checkin/engine.ts'],
  ['Guardrails', 'Admins approve, account managers view, payroll hidden from teammates, own-account transfers only', 'src/lib/checkin/decide.ts'],
  ['Actions flow back', 'Each decision writes its effect (balances, card lock, dispute) and a confirmation event into the same thread', 'src/lib/checkin/store.ts'],
  ['Realtime', 'Supabase Realtime pushes new rows to every open Inbox; no polling', 'src/hooks/use-live.ts'],
  ['Audit log', 'Every suggestion and decision, including refused ones', '/audit'],
];

const NOTES = [
  ['Idempotent ingest', 'Production events carry the product’s own event id; ingest upserts on it, so webhook retries never create duplicate rows.'],
  ['Ordering per thread', 'Events are ordered by created_at within a thread_id (invoice sent → viewed → paid → deposited). The newest event decides the row.'],
  ['Actions go to the source', 'The Inbox never moves money itself. It calls the owning product’s API (Treasury, Bill Pay, Cards), and that product’s confirmation event closes the loop.'],
  ['Same rules everywhere', 'Approving in the email, the Check-in card or the Inbox row runs the same decision code and the same approval rules.'],
  ['Learning', '“This is wrong” mutes a rule for a vendor; two “Not now” taps double that card type’s bar. Stored per company in checkin_feedback.'],
  ['Assumed, not built', 'Webhooks and the queue (the prototype writes events directly), push/SMS, and the payroll, Google Workspace and email connectors are simulated with seeded data.'],
];

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        title="Architecture"
        subtitle="How Rho Inbox and Check-in would sit on top of Rho’s products. Solid boxes run in this prototype; dashed ones are production assumptions."
      />
      <Card className="mb-6">
        <div className="p-6">
          <Mermaid chart={CHART} />
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border-[1.5px] border-brand bg-white" /> Built in this prototype</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border-[1.5px] border-brand bg-[#e3fbf5]" /> Decision engine</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-dashed border-ink-2 bg-white" /> Production assumption</span>
            <span className="flex items-center gap-1.5">- - → Action sent back to the owning product’s API</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="What’s real in the prototype">
          <ul className="divide-y">
            {REAL.map(([name, what, where]) => (
              <li key={name} className="px-5 py-3 text-[13px]">
                <div className="font-medium">{name}</div>
                <div className="text-ink-2">{what}</div>
                <code className="text-xs text-muted-foreground">{where}</code>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Design notes">
          <ul className="divide-y">
            {NOTES.map(([name, what]) => (
              <li key={name} className="px-5 py-3 text-[13px]">
                <div className="font-medium">{name}</div>
                <div className="text-ink-2">{what}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
