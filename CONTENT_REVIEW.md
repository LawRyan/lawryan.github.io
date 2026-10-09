# Content review: approve before merging

Updated for the October 2026 sprint (branch `sprint-oct-2026`). Everything below is visible on the
site. To change any of it, edit `src/content.ts`, or ask Claude to.

## 1. New since the last approval: needs your OK

### L//IOS real screenshots (`public/lios-shots/`)
| # | Item | Notes |
|---|------|-------|
| 1.1 | **L//IOS Analyst**: 6 screenshots of your app running on its own synthetic "Global Markets" sample (`samples/generate.py`, fictional firms, AI off) | The sample is modelled on a markets business: client value (CV), notional, desks, regions, a dataset called **"Coalition"** and wallet share. No real data, but please confirm you're comfortable showing a dataset shaped like this publicly. The "Coalition" name appears in the Model screenshot. |
| 1.2 | **L//IOS Markets**: 3 screenshots of desktop L//IOS in `--demo` mode | Every value is badged DEMO DATA by the app itself. Tickers shown: TSM, QCOM, ASML, NVDA, AVGO, AMD, MU, SOXX, S&P 500 (demo prices). |
| 1.3 | **L//IOS Health**: 6 phone screens from the app's own automated UI tests (sample data, most badged DEMO) | They show sample body weight, lifts and runs (e.g. bench 205 lb, 181.9 → 175 lb goal). **If any of these numbers are actually yours, say so and I'll swap the screens.** |

### L//IOS facts, taken from your READMEs (please confirm)
| # | Claim on the site | Source |
|---|------|--------|
| 1.4 | Analyst: "166,286 synthetic trades, 5 files, 9 data regions understood in about 17 seconds" | My run of your build in this session |
| 1.5 | Analyst: "Measured on a 72 MB workbook: 831,430 rows ready to explore in about 87 s" | lios-analyst README |
| 1.6 | Markets: "87 automated tests" | lios README |
| 1.7 | Statuses: Analyst and Markets **Working**; Health **In development** | READMEs + QA runs. Database connectors, SEC/FRED and AI marked Prototype; nutrition marked In development (screens exist; the README still lists it as "not yet"). |
| 1.8 | Pillar names: L//IOS **Analyst**, L//IOS **Markets** (your desktop app "L//IOS"), L//IOS **Health** (your app "L//IOS Mobile") | "Markets" and "Health" are display names I chose for the site. |
| 1.9 | Tech: TypeScript, React, Node.js, SQLite, esbuild, Kotlin, Jetpack Compose, Health Connect, Anthropic API (optional), Playwright | ARCHITECTURE files and package.json |

### Narrative and experience copy (my wording)
| # | Item |
|---|------|
| 1.10 | Career arc: Technology foundations (Early) → Capital Markets (2015 →) → Data & analytics (2018 →) → Automation (2021 →) → AI innovation (Now). The dates are anchors from your degree, HackerYou and RBC roles; adjust if they don't match how you'd tell it. |
| 1.11 | "Why L//IOS" bridge: "After years of building reporting, dashboards and validation frameworks, I kept coming back to one question: What if software could do more than display information?" |
| 1.12 | Case studies are now in Problem / My contribution / Approach / Impact form. The problem statements are my generalized framing; please check they're accurate and not too specific. |

## 2. Still pending from the first review

| # | Item | Status |
|---|------|--------|
| 2.1 | "Vice President, RBC Capital Markets" shown publicly | You approved at go-live |
| 2.2 | Metrics: 300+ rules · 100–150K trade records · ~40 reports · ~30 hrs/month | You approved at go-live. They now also appear in the hero "proof" strip. |
| 2.3 | Public email | Still empty: add to `contact.email` if wanted |
| 2.4 | Résumé PDF | Optional |
| 2.5 | Roles before Dec 2021 | Still shown as "Banking & Capital Markets · Earlier roles" |

## 3. Synthetic and demo data on the site
- **Hero signal panel**: a 64-point synthetic series. The trend and outlier figures are computed live from it.
- **Intelligence Lab**: three synthetic CSVs generated in the browser (fictional firms, seeded). It plants two stories and five data problems. The engine finds them without being told, and 73 automated checks recompute every figure from the raw rows (`npm test`). It is labelled "Synthetic data · no AI".
- **L//IOS screenshots**: demo or synthetic data only, as above.
