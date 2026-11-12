# 90-second demo: “Maya's Monday”

**One story:** Maya Chen founded Loop Labs (6 people). It's Monday, 8:00 AM. She has payroll on Friday and no time to check five tabs.

**The point to land:** Rho already has the data. Check-in does the prep work, so Maya just says yes or no, and nothing moves without her tap.

## Before you start (2 minutes, off stage)

1. `npm run seed` to reset to Monday morning: 3 cards, 14 "looks fine".
2. Make sure the dev server is running, then open **`http://localhost:3100/mail?as=maya`** in a full-width window.
3. Open **`/architecture`** in a second tab and leave it for the end.
4. Close other tabs, turn on Do Not Disturb, and zoom the browser to 110% if the room is big.

Optional: add `ANTHROPIC_API_KEY` to `.env.local` so the summary badge says “Written by Claude”. The template version works the same.

## The script

| Time | Show / click | Say |
| --- | --- | --- |
| **0:00** | The Monday email (`/mail`) | “Every founder at a small company checks Cards, Bill Pay, Invoicing and Treasury separately. Rho already has all of that data. So here's Rho Check-in: one email on Monday morning.” |
| **0:10** | Point at **“3 things need you”** and the summary | “Rho did the prep. Three decisions, ranked: urgent first, then by how many days of runway each one is worth. Everything else is one line: fourteen things checked, all fine.” |
| **0:18** | Click **Review the $5,000 transfer** | “Payroll is Friday. Rho shows its work: $16,000 due, $11,800 in checking, $4,200 short, and Treasury can cover it.” |
| **0:28** | Click **Move $5,000 to checking** to open the confirm screen | “Before anything moves: from, to, amount, date, approver. Only between our own accounts, and only an admin can approve.” |
| **0:35** | Click **Approve** | “Payroll is covered. Balances update, and the next card is already waiting.” |
| **0:40** | Click **Review it**, then **Why am I seeing this?** | “Every card explains itself. Nobody has signed in to Mixpanel in 60 days, which is $3,000 a year. If Rho gets it wrong, one tap mutes the rule, and the engine learns.” |
| **0:50** | Sidebar → **Inbox** | “The same decisions live in one inbox across every Rho product: Needs action on top, FYI below, actions right on the row.” |
| **0:57** | **Simulate event → Duplicate charge** | “Now a vendor double-bills us…” *(the row appears live, highlighted)* “…AWS charged us twice in nine days. Urgent, top of the inbox, no refresh.” |
| **1:05** | Hover the row → **Dispute** | “One tap to dispute, with a provisional credit while it's reviewed. The thread updates itself.” |
| **1:10** | Avatar → **Ana Costa** (teammate), open the **Burn** card | “Not everyone sees everything. Ana can see the burn card, but payroll is hidden, and she can't approve.” |
| **1:17** | Switch to the **Architecture** tab | “It's built the way Rho already works: product events in, one normalized feed, a ranking engine, and every action goes back through each product's own API, within your existing approval rules, with an audit trail.” |
| **1:27** | Stay on the diagram | “Rho does the prep. The founder just says yes. Thank you.” |

## If something goes wrong

- **The duplicate charge doesn't appear within about 3 seconds:** refresh the Inbox. The event is already saved; only the live push was slow. Say: “In production this arrives as a push notification.”
- **“No recent subscription charge left to duplicate”:** you've already simulated several. Use **Simulate event → Unusual card charge** instead, or reset with `npm run seed`.
- **The first card already says approved:** the data wasn't reset. Run `npm run seed` and reload.
- **You're stuck as Ana:** open any page with `?as=maya`.

## Likely questions

- **“Does it really move money?”** Not in the prototype. Approving writes the new balances and a confirmation event into the demo database. In production it would call Treasury's transfer API with Rho's existing approval rules.
- **“Why only three cards?”** Relevance over volume. A card only shows up if it's urgent or worth 3+ days of runway, so the briefing stays readable. Unused tools are the exception because they're pure waste.
- **“What did the AI do?”** It writes the three-sentence summary from the same numbers the viewer is allowed to see. The decisions come from transparent rules, which is why every card can say exactly why it's there.
- **“How does it learn?”** “This is wrong” mutes that rule for that vendor. Two “Not now” taps double the bar for that card type. All of it is stored and audited.
