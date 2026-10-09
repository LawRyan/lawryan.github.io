# Content review — approve before publishing

Everything Ryan needs to sign off on before the site goes live. Items marked in the
page with a dashed amber **NEEDS APPROVAL** tag are listed here. When done, set
`REVIEW_MODE = false` in `src/content.ts` (the build prints a warning until you do).

## 1. Needs your approval (employer-related)

| # | Item | Where | Notes |
|---|------|-------|-------|
| 1.1 | "Vice President, RBC Capital Markets" shown publicly | Hero, Experience, social metadata, JSON-LD | Check RBC's social media / outside-activity policy on naming the employer and title. |
| 1.2 | Associate, RBC Capital Markets, Dec 2021 – Dec 2025 | Experience | Dates and title as you provided. |
| 1.3 | **300+** validation rules | Impact metrics | Employer-specific figure. |
| 1.4 | **100–150K** trade records | Impact metrics | Employer-specific figure. |
| 1.5 | **~40** BI reports migrated / modernized | Impact metrics | Employer-specific figure. |
| 1.6 | **~30 hrs** saved each month | Impact metrics | Employer-specific figure. |
| 1.7 | Case study: "Fixed income client intelligence" mentions RFQ flow | Impact | Generalized; no system names, clients or data. Confirm comfortable. |
| 1.8 | Case studies: validation framework, reporting modernization, ingestion-to-certified-output | Impact | Generalized descriptions; no internal names or architectures. |
| 1.9 | Experience bullet lists for VP and Associate | Experience | Taken from your brief; no management scope claimed. |
| 1.10 | L//IOS disclaimer naming RBC | Home + L//IOS page | Wording exactly as you supplied. |

If any metric is not approved, delete it from `metrics` in `src/content.ts`. The section still reads well with the four case studies alone.

## 2. Verified facts (from your old site, the repo, or your brief)

- Name: Ryan Law
- Wilfrid Laurier University, BBA 2015 (old site)
- HackerYou, 2018 (old site)
- Early career in banking and Capital Markets; 2018 site said "3+ years in Capital Markets" (old site)
- LinkedIn: linkedin.com/in/ryan-law-92a629104 (old site)
- GitHub: github.com/lawryan (owner of this repo)
- Earlier projects: ShipSimple, responsive PSD-to-HTML travel site, Pig dice game, to-do app, break timer, D3/C3 chart studies (repo)
- VP Jan 2026 – present; Associate Dec 2021 – Dec 2025 (your brief)

## 3. Gaps to fill or confirm

| # | Item | Status |
|---|------|--------|
| 3.1 | Public email address | **Empty.** None in the repo. Add to `contact.email` or leave hidden. |
| 3.2 | Résumé PDF | **Empty.** Optional. Drop a PDF in `public/` and set `contact.resume`. |
| 3.3 | Roles before Dec 2021 | Shown as "Banking & Capital Markets · Earlier roles". Add titles/employers/dates, or keep general. |
| 3.4 | ShipSimple year | Shown as "Earlier"; the old site gave no date. |
| 3.5 | Travel site live link | The old "View Live" button had no link, so none is shown. |
| 3.6 | Facebook link | Dropped from the new site on purpose. Say if you want it back. |
| 3.7 | Headshot | None used. Optional. |

## 4. L//IOS — confirm what's real

All capability statuses (In development / Prototype / Planned) and "Built with" stacks are my
**conservative placeholders**. Nothing claims to be released, live, or connected to real-time data.
Please correct them in `lios.pillars` in `src/content.ts`.

- Intelligence: which capabilities work today? Stack listed: React, TypeScript, Node.js, LLM integration, Data visualization.
- Health: which capabilities work today? Health Connect / Samsung Health marked **Planned**. Stack listed: Android, TypeScript, SQLite, LLM integration.
- Data Intelligence: which capabilities work today? Stack listed: React, TypeScript, Node.js, SQLite, Python, Data visualization.
- Ecosystem tech list (React, TypeScript, Node.js, SQLite, Python, LLM integrations, Data visualization, Android, API integration): confirm.
- Roadmap items are labelled "Future" and described as directions, not features.

### Assets needed to replace conceptual previews

The previews on the site are code-drawn illustrations with synthetic numbers, labelled
"Conceptual preview · synthetic data". To swap in real screenshots:

1. L//IOS Intelligence — desktop screenshot, ~1600×1000, sector or comparison view, synthetic/public data only.
2. L//IOS Health — two phone screenshots, ~1080×2340, with **sample** data (no real health data).
3. L//IOS Data Intelligence — desktop screenshot, ~1600×1000, using a demo dataset.
4. Optional: a 10–20s screen recording of any one app (MP4/WebM, < 8 MB).

## 5. Draft marketing language (yours to edit)

These are my words, not facts. Change freely in `src/content.ts`.

- Headline: "Turning complex data into intelligent decisions." (your first choice)
- Section titles: "From building websites to building intelligence.", "Where the business meets the build.", "Reliable data, less manual work, clearer answers.", "Beyond the dashboard, in miniature.", "The work, and the path to it.", "Let's build something meaningful."
- About paragraphs and the four-stage evolution (Foundations → Builder → Intelligence → Systems)
- Expertise levels (Established / Building / Exploring) — my reading of your brief; adjust any you disagree with.
- L//IOS vision copy and pillar descriptions

## 6. Synthetic data

- Intelligence Lab: two synthetic datasets generated in the browser from a fixed seed. No real client, trade or market data. Insights are rule-based calculations, labelled as such; 474 automated checks recompute every figure from the raw records (`npm test`).
- L//IOS previews: illustrative numbers only.
