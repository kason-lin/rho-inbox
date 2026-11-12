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
