import { Mermaid } from '@/components/architecture/mermaid';
import { Card, PageHeader } from '@/components/shell/page-header';

export const metadata = { title: 'Architecture · Rho Inbox prototype' };

// Solid boxes run in this prototype. Dashed boxes are how it would plug into Rho in production (assumptions).
const CHART = `
flowchart TB
  products["<b>Rho products</b><br/>Cards · Bill Pay · Invoicing<br/>Treasury · Approvals"]
  tools["<b>Connected tools (read-only)</b><br/>Gmail · Stripe · Gusto<br/>Anthropic · OpenAI · AWS"]
  hooks["Webhooks /<br/>change feed"]
  queue[("Event<br/>queue")]
  normalize["<b>Normalize</b><br/>one inbox_events shape"]
  rules["<b>Priority rules</b><br/>needs action vs FYI"]
  checkin["<b>Business health engine</b><br/>find what you owe · project cash<br/>rank · max 3 cards"]
  db[("<b>Inbox DB + API</b><br/>Postgres · API routes")]
  inbox["<b>Business health tab</b><br/>+ Inbox, live via Realtime"]
  email["<b>Alert</b><br/>email or text, only when due"]
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
  inbox -- "Approve · Not now<br/>This is wrong" --> actions
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
  ['Obligation finder', 'Reads the mock inbox and pulls out invoices (vendor, amount, sent date, terms, due date)', 'src/lib/health/extract.ts'],
  ['Cash projection', 'Checking on each day until the invoice is due, from payroll, bills and expected Stripe payouts', 'src/lib/health/forecast.ts'],
  ['Needs you + spend by purpose', 'Max 3 cards, urgent first; Claude bill split into building vs. running, matched to the card charge', 'src/lib/health/cards.ts, spend.ts'],
  ['Sample data', 'Every number in the demo, in editable JSON files', 'src/data/business-health/*.json'],
  ['Guardrails', 'Admins approve; transfers only between own accounts; payment on or before the due date', 'src/lib/health/forecast.ts, api/health/approve'],
  ['Actions flow back', 'Each decision writes its effect (balances, card lock, dispute) and a confirmation event into the same thread', 'src/lib/checkin/store.ts'],
  ['Realtime', 'Supabase Realtime pushes new rows to every open Inbox; no polling', 'src/hooks/use-live.ts'],
  ['Audit log', 'Every suggestion and decision, including refused ones', '/audit'],
];

// From the team's "How Business Health plugs into Rho" page: every piece maps to a Rho product that exists today.
const PLUGS: [string, string, string, 'Evidence' | 'Assumption' | 'Both'][] = [
  ['Business health tab', 'New tab in the Rho web app sidebar, next to Home', 'Reuses balances, transactions and categories', 'Assumption'],
  ['Invoices found in email', 'Rho AP Automation (AP inbox + OCR)', 'Forward a detected invoice into the AP inbox; new read-only Gmail/Outlook connector', 'Evidence'],
  ['Set aside cash', 'Rho Treasury → operating account', 'Existing internal transfer, prepared here, approved by an admin', 'Both'],
  ['Schedule the payment', 'Rho Bill Pay', 'Existing scheduled payment, created from the draft bill', 'Evidence'],
  ['Approvals and roles', 'Rho’s users, roles and approval rules', 'The card shows who must approve; nothing bypasses Rho’s rules', 'Assumption'],
  ['Spend by purpose', 'Rho transactions + usage connectors', 'Provider cost reports matched to what Rho actually paid', 'Evidence'],
  ['Accounting sync', 'QuickBooks, NetSuite, Sage Intacct sync', 'Purpose tags (cost of revenue vs. R&D) sync as classes', 'Both'],
  ['Alerts', 'Rho notifications', 'Email via existing notifications; text is new', 'Assumption'],
  ['AI / agent access', 'Rho MCP connection (read-only today)', 'Runs inside Rho, not through MCP; writes are the next step', 'Evidence'],
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

      <Card title="How Business health plugs into Rho" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-tint text-left text-xs text-muted-foreground">
              <tr><th className="px-5 py-2.5 font-medium">Our piece</th><th className="px-5 py-2.5 font-medium">Where it lives in Rho</th><th className="px-5 py-2.5 font-medium">What we reuse or add</th><th className="px-5 py-2.5 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {PLUGS.map(([piece, where, what, status]) => (
                <tr key={piece}>
                  <td className="px-5 py-2.5 font-medium">{piece}</td>
                  <td className="px-5 py-2.5">{where}</td>
                  <td className="px-5 py-2.5 text-ink-2">{what}</td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${status === 'Evidence' ? 'bg-positive-bg text-positive' : status === 'Assumption' ? 'bg-warning-bg text-warning' : 'bg-accent text-ink-2'}`}>{status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
