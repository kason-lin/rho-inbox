# How Business health plugs into Rho

Every piece of the prototype maps to a Rho product that exists today. **Evidence** means Rho already does it publicly. **Assumption** means we think it fits but haven't confirmed it with Rho.

| Our piece | Where it lives in Rho | What we reuse or add | Status |
| --- | --- | --- | --- |
| Business health tab | A new tab in the Rho web app sidebar, next to Home | Reuses balances, transactions and categories | Assumption |
| Invoices found in email | Rho AP Automation (AP inbox + OCR) | Forward a detected invoice into the AP inbox; new read-only Gmail/Outlook connector | Evidence |
| Set aside cash | Rho Treasury → operating account | Existing internal transfer, prepared here, approved by an admin | Both |
| Schedule the payment | Rho Bill Pay | Existing scheduled payment, created from the draft bill | Evidence |
| Approvals and roles | Rho's users, roles and approval rules | The card shows who must approve; nothing bypasses Rho's rules | Assumption |
| Disputes and card locks | Rho Cards | The duplicate-charge dispute and "cancel and lock card" use existing card controls | Assumption |
| Spend by purpose | Rho transactions + usage connectors | Provider cost reports matched to what Rho actually paid | Evidence |
| Accounting sync | QuickBooks, NetSuite, Sage Intacct sync | Purpose tags (cost of revenue vs. R&D) sync as classes | Both |
| Alerts | Rho notifications | Email via existing notifications; text and push are new | Assumption |
| Talk to a specialist | Rho's human support | The specialist sees the card, the invoice and balances | Assumption |
| AI / agent access | Rho MCP connection (read-only today) | Runs inside Rho, not through MCP; writes are the next step | Evidence |

## How the prototype is built

```
src/data/business-health/*.json   sample data (edit a number, the demo follows)
        │
src/lib/health/                    the logic, pure functions
  extract.ts    invoices (and their line items) from email
  forecast.ts   checking day by day, the shortfall, the alert, the $25K suggestion
  cards.ts      "Needs you": 3 cards at most, urgent first; handled ones kept
  spend.ts      spend by purpose for 4 providers, coverage, the match check
  math.ts       "the math" rows shown in the alert, proof and iPhone screens
  view.ts       puts it together for one viewer
        │
src/app/api/health/                real API routes (forecast, approve, act, undo, feedback, state, reset…)
        │
pages: /mailbox (invoice, then the alert email) → /business-health → /settings/connected-tools, and /iphone
```

**Demo state.** Each viewer's state (demo date, connected tools, approval, handled cards, feedback) lives in a cookie. Viewers never affect each other, there's no database, and Reset just clears the cookie.

## What's real and what's simulated

- **Real:** the API routes, the forecast math, the input checks (admins only; pay on or before the due date; treasury must have the money), Undo, and feedback that removes a card.
- **Simulated:** every connection (Gmail, Stripe, Gusto, Anthropic, OpenAI, AWS, Google Workspace), the transfer, the payment, the dispute and the alert delivery. No money moves and nothing is sent.
- **The next step with Rho:** write actions. Rho's connection is read-only today.
