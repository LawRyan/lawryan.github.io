# Creative reset: three concept prototypes

Branch `concepts` (from master). Each concept lives in `concepts/<name>/` and is built to `dist/concepts/<name>/`. Nothing here is deployed or linked from the live site.

## The client's instruction, in short
The previous direction (a persistent full-screen particle/constellation canvas that morphs between scenes, text left + graphic right) is **rejected**. Do not reinterpret it.

Hard constraints for every concept:
- No constellation aesthetic.
- No particle clouds as the main identity.
- No floating data points forming charts.
- No network-of-nodes hero.
- No persistent full-screen canvas that changes between sections.
- No repeating left-text / right-graphic layout.
- No generic dashboard floating in 3D space.
- No HUD graphics, fake terminal output or sci-fi clichés.

Each prototype must have:
1. a fully designed hero
2. at least one substantial transition
3. a distinctive navigation interaction
4. a representative L//IOS product reveal, using real screenshots
5. a mobile layout (360, 390 and 430 px wide)

The L//IOS reveal is the centrepiece. Entering it should feel like entering a different environment. Present Analyst, Markets and Health through interactive product storytelling, not as a logo or as text alone.

Quality floor:
- Keyboard focus visible; semantic HTML; real text (not text in images or canvas).
- `prefers-reduced-motion` respected.
- Non-WebGL fallback where WebGL is used.
- Pause rAF loops when the tab is hidden.
- Works on GitHub Pages (static files only).

Art direction:
- "A single extraordinary transition is worth more than twenty mediocre animations."
- Avoid generated-design tells:
  - all-caps tracked eyebrow labels above every heading
  - one italic or colored accent word in a headline
  - "A · B · C" meta strings
  - "→" on every link
  - identical rounded cards with the same soft shadow
  - cream + terracotta
  - black + acid-green
  - mono font for every small label
  - fade-and-slide-up on every section

## Accurate content (do not invent anything)
- **Name and role:** Ryan Law, Vice President, Client Intelligence, RBC Capital Markets (since Dec 2025).
- **Line:** "Turning complex data into intelligent decisions."
- **VP role:** leads reporting, data quality and business intelligence for Capital Markets, turning complex business requirements into practical solutions.
  - Manages an offshore analytics and reporting team: work allocation, deliverables and capability building.
  - Oversees validation frameworks, data integrity controls and reconciliations.
  - Drives automation, and aligns priorities with business leaders, technology partners and teams across regions.
- **Approved results (exact wording):**
  - **95%** less manual reporting, by automating and moving Excel reports into Tableau.
  - **97%** fewer KYC errors, with bots for client outreach and document uploads.
  - **20,000+** clients kept accurate through a global KYC refresh.
  - **300+** validation rules in a data quality framework supporting control processes (roughly 100–150K trade records).
  - About **40 reports** modernized and roughly **30 hours a month** saved.
- **Career (RBC, oldest first):**
  - Nov 2015 – Nov 2017: Tax Operations Analyst. Tax compliance across FATCA, OECD CRS, Chapter 3/61 and HIRE Act (871m).
  - Nov 2017 – Nov 2018: Client Implementation Analyst. Helped clients and internal teams comply with regulatory margin requirements.
  - Nov 2018 – Dec 2019: Global Client Onboarding Data Analyst. Lead liaison between Global Markets and the back office for the data quality of 20,000+ clients in KYC refresh.
  - Dec 2019 – Aug 2020: KYC Data & Reporting Team Lead. Led KYC data and reporting, owning data quality and the reports senior management relied on.
  - Aug 2020 – Dec 2021: Client Management & Analytics Team Lead. Led a team producing KPIs and KRIs for the COO and Global Markets business heads.
  - Dec 2021 – Dec 2025: Client Intelligence Associate. Built the Tableau reporting for Global Markets business heads and Global Business Management across all regions.
  - Dec 2025 – present: Vice President, Client Intelligence.
- **Education:** BBA Finance, Wilfrid Laurier University (2013); Diploma in Accounting, Laurier (2015); Web Development, HackerYou (2018).
- **Contact:** ryanlaw@live.com, LinkedIn https://www.linkedin.com/in/ryan-law-92a629104/
- **L//IOS:** an independent personal technology project. It is **not** affiliated with or endorsed by RBC Capital Markets; show this disclaimer near the reveal. Never imply RBC sponsors it.
  - Tagline: "An Operating System for Insight."
  - Statement: "Three applications built on one idea: software that understands the data, says what matters, and shows its working."
  - Products, with full copy, capability lists and status labels (Working / Prototype / In development / Planned): `src/content.ts`, `lios.pillars`.
    - L//IOS Analyst (Working)
    - L//IOS Markets (Working)
    - L//IOS Health (Android, In development)
  - Screenshot captions to keep with the images:
    - Analyst: "Real screenshot · L//IOS Analyst on its synthetic “Global Markets” sample (fictional firms)"
    - Markets: "Real screenshot · L//IOS in demo mode (the app labels every value DEMO DATA)"
    - Health: "Real screen · rendered by the app’s own UI tests with sample data"
  - Live demo link: https://lawryan.github.io/#lab (the Intelligence Lab, a browser version of Analyst). Product page: https://lawryan.github.io/lios/

## Assets (reference with absolute paths; served from dist)
- **Screenshots in `/lios-shots/`:**
  - Analyst and Markets: `analyst-{dashboard,init,investigation,quality,ask}.webp` and `markets-{home,semis,research,evidence}.webp`, at 1440×900, each with a `-720.webp` version.
  - Health (phone, 540×1170): `mobile-{today,brief,interpreted,health,next,food,fitness,orbit,init}.webp`.
  - Alt text is in `src/content.ts`.
- **Fonts in `/fonts/`:**
  - MonaSans-var.woff (variable: wdth 75–125, wght 300–800)
  - Newsreader-var.woff (wght 300–500) and Newsreader-Italic-var.woff
  - InstrumentSans-var.woff2, InstrumentSerif-Regular.woff2, InstrumentSerif-Italic.woff2
  - GeistMono-400.woff and GeistMono-700.woff
  - JetBrainsMono-Regular.woff2 and JetBrainsMono-Medium.woff2
- **three.js r187:** `import ... from 'three'` and `'three/addons/...'`. Vendored addons: RoomEnvironment, RoundedBoxGeometry, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, ShaderPass. Bundled by the build when a concept has `main.js`.
- **No network installs:** the npm registry is blocked. No GSAP or Lenis. Write your own tweening and scroll logic.

## Tooling
- **Build:** `node scripts/build-concepts.mjs <name>`.
- **Serve:** `node scripts/serve.mjs 4300`, then open http://localhost:4300/concepts/<name>/.
- **Single-file HTML for review:** `node scripts/pack-concept.mjs <name> <out.html>`.
  - It inlines `<link rel="stylesheet" href="./x.css">`, `<script type="module" src="./main.js">`, and `/fonts/...` and `/lios-shots/...` paths that appear in HTML, CSS or JS.
  - Each image path is inlined at every occurrence, so reference each screenshot path once where you can, e.g. one `<img>` reused by JS.
- **Playwright:** `import { chromium } from 'playwright'` from the repo root. For WebGL, launch with args `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`; that GL is about 7 fps.
  - **CSS/DOM motion:** record with `browser.newContext({ recordVideo: { dir, size } })`, then convert with `/usr/bin/ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p -crf 23 out.mp4`.
  - **WebGL motion:** drive a fixed clock (`window.__clock`) and capture frames, then assemble them with ffmpeg at 30 fps.
- **Capture scripts:** keep them in `scripts/concepts/`.
