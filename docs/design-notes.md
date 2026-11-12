# Design notes for Phase 2

Measured on Nov 12, 2026 from the signed-in Rho web app (app.rho.co, "Select a business" screen)
and from rho.co. The account used has no business attached, so the dashboard, sidebar and list
pages could not be captured. Layout for those is still an open input.

## Type (licensed fonts → free stand-ins)
| Use | Rho app | Stand-in |
| --- | --- | --- |
| Body / UI | Basier Circle 400/500, 15px | Manrope |
| Headings | Degular Display 600 (page title 26px) | Outfit 600 |
| Marketing display | Neue Montreal (rho.co) | Inter Tight |
| Mono labels | DM Mono / Apercu Mono | DM Mono |

## Color tokens (from the app's CSS variables)
| Token | Value |
| --- | --- |
| Text / primary button | `#151716` (`--bg-interactive-primary-idle`), hover `#012F26` |
| On-primary accent text | `#39EFCD`, hover `#07EBC0` |
| Brand button | `#048D73`, hover `#035E4D` |
| Secondary text | `#454A48` |
| Canvas / surface | `#FDFDFD` / `#FFFFFF` |
| Tinted surface | `#F7F9F8` / `#F7F9F7` |
| Neutral hover / selected | `#E9EEEC` |
| Strong neutral / borders | `#D7E0DE`, `#CED4CE` |
| Positive | bg `#C7EBE3`, strong `#0D7764`, subdued `#F8FCFB` |
| Negative | standard `#EA5362`, strong `#DB1A2D`, subdued `#FCE9EA` |
| Warning | default `#FFE5B2`, strong `#FFB829`, subdued `#FFF9EB` |
| Info | default `#E1F0FA`, strong `#1C5F80` |
| Data viz | green `#3ECFA3`, blue `#54A0FF`, purple `#AEA2FB`, red `#FF6B6B`, yellow `#FECA57` |

## Layout
- App header: 80px tall, padding 16px 24px, wordmark left, avatar + name right.
- Marketing site (rho.co) mint CTA: `#6AF3D9`, 6px radius, 13px/500 labels.

## Signed-in app shell (from the public AI demo walkthrough on rho.co, Home page)
Only the Home dashboard is shown in the walkthrough; other pages are inferred from the same shell.

**Sidebar** (white, thin right border, ~15% width, small 13px items with a line icon each):
- Top: serif "Rho" wordmark, collapse icon on the right
- Company switcher: round avatar + company name + chevron
- Home (selected = light gray `#E9EEEC` rounded pill), Banking ▾, Cards ▾, Vendors, Reporting ▾
- Muted section label **Workflow**: Invoicing (mint "New" badge) ▾, Expenses ▾, Reimbursements ▾, Bill Pay ▾, Accounting ▾
- Muted section label **Administration**: Users ▾, Integrations, Partner Perks, Settings
- **Where Inbox goes:** directly under Home, with an unread count badge

**Top bar** (right-aligned): lavender "Earn $500" referral pill · "Help Center" · bell icon · avatar circle with initials + name + role ("Admin") + chevron.
**Bell:** add an unread count dot/badge here.

**Page header**: one-line page title (large, left) · action buttons right: More ▾, Transfer, Deposit, Create card (outlined, small, icon + label) and a mint primary "Pay".

**Home content** (light gray canvas, white cards, 1px border, ~8px radius, small bold card titles):
- Full-width Balance card: "All accounts" label, large balance, small legend pills (pending, Treasury), dropdowns "All accounts ▾" / "Last 30 days ▾", teal line chart on a dotted grid, date axis
- Row of 3 cards: Rho accounts (icon + account name + masked number / yield, amount right-aligned; "And 1 more account"), Money outflows (‹ month › switcher, total, "Top outflows" list with vendor icons), Money inflows (same structure)
- Row: Credit spend (balance vs limit), Invoices ("New" badge, total unpaid), Customer perks (carousel arrows)

**For Rho Inbox / Check-in**: reuse this shell; Inbox list rows should look like the "Top outflows" rows (icon · name · amount right), and Check-in cards like these white bordered cards.
