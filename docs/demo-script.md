# 90-second demo: "The invoice nobody entered"

**One story:** Kason Lin runs Loop Labs, a 12-person startup on Rho. An agency's $55K invoice sat in email for weeks. Rho finds it, sees checking will come up short, and gets the fix approved in one tap.

**The point to land:** Rho already has the bank data. Connect your inbox and tools (read-only), and Rho sees what you owe before it's due. You just say yes.

## Before you start (1 minute)

1. Open **https://rho-inbox.vercel.app/business-health/connect** (or `localhost:3100` locally) in a full-width window.
2. Click **Reset demo** in the dark bar at the top. It should say **Oct 3**.
3. Turn on Do Not Disturb. Zoom the browser to 110% if the room is big.

The dark bar is for you, the presenter. It shows the steps in order, the demo date and Reset.

## The script

| Time | Click | Say |
| --- | --- | --- |
| **0:00** | Connect tools → **Connect all (read-only)** | "Loop Labs banks with Rho. It connects its inbox, Stripe, payroll and Claude usage, all read-only. Rho can look, never write." |
| **0:10** | Bar → **2 Inbox**, open **Northbeam Studio** | "October 3rd: our design agency sends a $55,000 invoice for the app redesign, due in 60 days. It sits in email. Nobody enters it anywhere, but Rho noticed it." |
| **0:22** | Bar → **Nov 18** | "Fast-forward to November 18th, two weeks before it's due." *(the alert appears)* "Rho sends one alert, by text and email: a $55K invoice due in 14 days, and checking will be $19,800 short." |
| **0:32** | Email → **Review** | "This is Business health, a new tab next to Home." |
| **0:36** | Point at the **Coming up** chart | "Checking today is $62,400. Friday payroll takes $41,200, Stripe pays us $14,000, and then the invoice lands. We're $19,800 short on December 2nd. Every line links to its source." |
| **0:48** | **Needs you** → **Review** → **Review the fix** | "Rho shows its work: the invoice and its email, what's due before it, the balances. Then the fix: move $25,000 from treasury and pay on the due date." |
| **0:58** | Change the amount to **15000**, then back to **25000** | "It's editable. Too little, and it tells you you're still short." |
| **1:03** | **Approve** | "One tap. The gap is gone, the invoice is scheduled, and there's a receipt. Today Rho's connection is read-only, so writes like this are the next step with Rho." |
| **1:13** | **Next: where the money goes** → tap **Building the product** | "Same idea for spend. The $50,000 Claude bill: $32,000 building the product, $18,000 running it for customers, matched to the card charge to the dollar." |
| **1:25** | Stay on the split | "Rho does the prep. The founder just says yes." |

## If something goes wrong

- **The alert says "No alert yet":** the date is still Oct 3. Click **Nov 18** in the bar.
- **It says the invoice is "already covered":** you approved in an earlier run. Click **Reset demo**.
- **A page looks empty:** refresh it. The demo state lives in your browser, so it survives refreshes.

## Likely questions

- **Does it really move money?** No. It's sample data and a mock approval. In a real build the transfer would run on Rho Treasury and the payment on Rho Bill Pay, within Rho's approval rules.
- **How does it find the invoice?** A read-only inbox connection reads the email and pulls out the amount, date and terms. In production it would hand the invoice to Rho's AP inbox, where OCR makes the draft bill.
- **Why $25,000 and not $19,800?** It's the shortfall plus a buffer, rounded up to $5,000, so a late payout doesn't put checking at $0. You can change it before approving.
- **Why only 3 cards?** Relevance over volume: urgent first, then by impact on runway. Everything else is one line, "14 other things look fine."
