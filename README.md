# lawryan.github.io — 2026 redesign

Personal site of Ryan Law: Capital Markets, data intelligence, and the L//IOS project.

## What's here

- `/` — home: hero, about, experience timeline, impact, expertise, L//IOS, Intelligence Lab, principles, projects, contact
- `/lios/` — dedicated L//IOS page (vision, ecosystem, technology, roadmap). Deep links: `/lios/#intelligence`, `#health`, `#data`
- Legacy apps kept at their original URLs: `/starter/`, `/to-do-app/to-do-app.html`, `/timer/`, `/line.html`, `/bar.html`

## Stack

React 19 + TypeScript, bundled with esbuild into a plain static site. No backend, no API keys, no paid services.
Plain CSS with design tokens (`src/styles.css`); fonts are self-hosted (Instrument Sans, Instrument Serif, JetBrains Mono — OFL).
Two real pages instead of client-side routing, so direct links and refreshes work on GitHub Pages with no 404 tricks.

Vite and Tailwind were considered. esbuild does the same job here with one dependency and no config, and the design
system is small enough that hand-written CSS stays readable.

## Edit content

All copy lives in **`src/content.ts`**. `REVIEW_MODE = true` shows approval markers; set it to `false` before publishing.
See **`CONTENT_REVIEW.md`** for everything that needs sign-off.

## Commands

```bash
npm install
npm run dev        # watch + local server at http://localhost:5173
npm test           # Intelligence Lab engine checks (independent recomputation)
npm run build      # → dist/
npm run preview    # serve dist/ at http://127.0.0.1:4173
npm run typecheck
```

Visual checks (need Playwright + Chromium installed locally):

```bash
node scripts/matrix.mjs <tag>      # screenshots at 1920/1440/768/390/360 → shots/<tag>/, overflow + touch-target report
node scripts/interact.mjs          # clicks through the whole site, including the Lab flow
node scripts/og.mjs                # regenerate social share images
```

## Deploy (only after approval)

1. Create a branch in the existing repo, e.g. `redesign-2026`, and replace its contents with this project
   (the old root files are no longer needed; the legacy apps live in `public/`).
2. In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Merge `redesign-2026` into `master`. `.github/workflows/deploy.yml` builds, tests and publishes `dist/`.

To roll back: revert the merge commit on `master`; the workflow republishes the previous version.

## Structure

```
src/
  content.ts            all copy, links, statuses
  styles.css            design tokens + components
  components/common.tsx nav, intro, hero signal field, reveal, review markers
  components/previews.tsx  labelled conceptual previews for L//IOS
  home/Home.tsx         homepage sections
  lios/LiosPage.tsx     /lios/ page
  lab/analyst.ts        Lab engine: synthetic files, profiling, relationships, quality, findings, Q&A (pure, tested)
  lab/AnalystLab.tsx    Intelligence Lab UI (lazy-loaded)
  components/Shot.tsx   real-screenshot frames and gallery
public/lios-shots/      real L//IOS screenshots (WebP), see CONTENT_REVIEW.md
public/                 fonts, favicon, share images, legacy apps
scripts/                build, local server, tests, screenshots
```
