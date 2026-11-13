# 90-second demo: "The invoice nobody entered"

**One story:** Eric Li runs Loop Labs, a 12-person startup on Rho. A design agency's $55K invoice sat in email for weeks. Rho finds it, sees checking will come up short, and gets the fix approved in one tap.

**The point to land:** Rho already has the bank data. Connect your inbox and tools (read-only), and Rho sees what you owe before it's due. You just say yes.

## Before you start (1 minute)

1. Open **https://rho-inbox.vercel.app/mailbox** (or `localhost:3100/mailbox` locally) in a full-width window.
2. Click **Reset demo** in the dark bar at the top. It should say **Oct 3**.
3. Turn on Do Not Disturb. Zoom the browser to 110% if the room is big.

The dark bar is for you, the presenter. It shows the steps in order (Inbox, Alert, Business health, Connected tools, iPhone), the demo date and Reset.

## The script

| Time | Click | Say |
| --- | --- | --- |
| **0:00** | Open the **Northbeam Studio** email | "October 3rd: our design agency sends a $55,000 invoice for the app redesign, due in 60 days. It's not in Rho Bills, nobody forwards it. It isn't in the bank yet, so no banking app knows it exists." |
| **0:12** | **Jump to Wed, Nov 18 →** | "Six weeks later, two weeks before it's due, a new email lands: Rho's alert. Not a digest: one alert, because a decision is due." Click the notification to open it, point at the math: "$63,200 today, payroll, Stripe payouts, the invoice: $19,000 short." (Bar → **2 Alert** shows the same alert as a text.) |
| **0:25** | **Review in Rho** in the email | "This is Business health, a new tab next to Home. Lowest checking in the next two weeks: minus $19,000, on December 2nd." |
| **0:32** | Point at **Coming up** | "Every line links to its source: Gusto, Stripe, the email itself." |
| **0:38** | **Show proof** | "Rho shows its work: the invoice with its line items, the email it came from, the math, and the rule that flagged it." |
| **0:48** | **Set aside $25K & schedule** → **Change amount or date** → type **15000** | "Two steps: move cash from treasury, schedule the payment. It's editable. Too little, and it tells you you're still $4,000 short." |
| **0:56** | Back to **25000** → **Approve** | "One tap. The chart redraws above zero, with the old line dashed behind it. There's Undo, and a receipt." |
| **1:05** | Point at **Needs you** | "The invoice card is crossed out as handled, and the next thing moves up: Figma charged us twice. The dispute is already filled in." |
| **1:12** | **See breakdown** on the Claude card | "Same idea for spend. The $50,000 Claude bill: $32,000 building the product, $18,000 running it for customers, matched to the card charge to the dollar. And OpenAI has $300 nobody can explain." |
| **1:22** | Bar → **5 iPhone** (optional) | "Same flow on the phone: the notification, the proof, approve with Face ID." |
| **1:28** | | "Rho does the prep. The founder just says yes." |

## If something goes wrong

- **The alert says "No alert yet":** the date is still Oct 3. Click **Nov 18** in the bar.
- **The invoice card is already crossed out:** you approved in an earlier run. Click **Reset demo**, or **Undo** on the toast.
- **A page looks empty:** refresh it. The demo state lives in your browser, so it survives refreshes.

## Likely questions

- **Does it really move money?** No. It's sample data and a mock approval. In a real build the transfer would run on Rho Treasury and the payment on Rho Bill Pay, within Rho's approval rules. Rho's connection is read-only today, so write actions are the next step with Rho.
- **How does it find the invoice?** A read-only inbox connection reads the email and pulls out the amount, line items, date and terms. In production it would hand the invoice to Rho's AP inbox, where OCR makes the draft bill.
- **Why $25,000 and not $19,000?** It's the shortfall plus a buffer, rounded up to $5,000, so a late payout doesn't put checking at $0. You can change it before approving.
- **Why only 3 cards?** Relevance over volume: urgent first. Everything else is one line, "We checked 14 other things. They look fine."
- **What does Rho read?** Settings → Connected tools lists every tool, read-only, with exactly what it reads and what it never reads (prompts, model outputs, non-bill emails, individual salaries).
- **How does it fit into Rho?** See [architecture.md](architecture.md).
