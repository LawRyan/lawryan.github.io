# Ryan Law, the builder: direction for v3

Stages A–C of the master brief (1 Nov 2026). The signature prototype follows from this document.

## A. Creative audit

**What exists (branch `profile`, `concepts/profile`, packed as `ryan-law-profile.html`)**
- **Engine:** a raw-WebGL record engine (`gl.js`, about 90 lines, which replaced three.js and cut the script from 552 KB to 20 KB).
  - One instanced draw of 12,000 lit record tiles (5,000 on phones), plus a sky quad and line sets.
  - The intro is three scroll-linked layouts: data architecture → validation matrix with an exception queue → the 95% column, whose freed capacity streams back into the architecture.
  - Damped scroll, reversible, no snapping.
  - The loop pauses when the tab is hidden.
  - DPR adapts down when frames run slow.
  - Reduced motion is respected and there is a no-WebGL fallback.
- **Content:** everything is rendered from `src/content.ts` (the live site's copy):
  - seven RBC roles
  - four approved results
  - six case studies
  - skills
  - L//IOS (three apps, 27 real screenshots)
  - projects, principles, education and contact
- **Type and colour:** Mona Sans (variable) and Newsreader; graphite, silver, teal and amber.
- **Paused work:** v2 (`concepts/profile-2`), with a rule-run demo, report transformation, client explorer and laptop reveal. Its demos are reusable.

**What works:** the engine's continuity (the same records persist through every scene), the fluid damped motion, the honest figures, the real L//IOS screens and the light script weight.

**What feels generic or wrong for the new brief**
- It is an animated résumé. After the intro, the page is section heading → list, repeated eight times.
- The story is "what I achieved at work". The new story is "how I think and what I build"; work is evidence.
- The hero opens on data, not on a person. There is no single iconic image.
- Corporate phrasing in places ("Selected work", "Results").
- No personal dimension at all.

**Keep:** the engine, its motion and lighting, the validation choreography, the capacity scene, the content pipeline, the L//IOS assets and the honesty rules.
**Change:** the hero (a sculpture, not a data field), the narrative order, section design, the voice, and the place of the résumé (secondary).

**Assets**
- Have: 27 real L//IOS screenshots, fonts, the live site content, earlier web projects (2018), and the Intelligence Lab (a working in-browser analyst).
- Missing:
  - Personal photographs: none. Chapter 05 will be text-led with optional image slots.
  - Other independent projects beyond L//IOS and the Lab: only the 2018 builds, the LEI validator and the chart studies are on file.
  - An approved résumé PDF: none, so the print view is the only résumé.

**Content requiring verification**
- **Malaysia:** "Offshore analytics team in Malaysia" is new in this brief (not on the site). Approved for publication?
- **Share-of-wallet:** "Share-of-wallet reporting" is not in any existing content.
- **Cryptocurrency:** "Stock and cryptocurrency research" for L//IOS Markets. The app's documented themes have no cryptocurrency.
- **100,000+ records:** the brief says "more than 100,000 trade records"; the approved wording is "roughly 100–150K".
- **Validation story:** per Ryan's correction, the framework confirmed rules were accurate for audit purposes. `content.ts` still says "checks the data before it reaches reporting".
- **Malaysia note:** the brief says "Do not publish confidential employer information". Naming the team's country may count.

## B. Narrative architecture

Primary headline: **I build things that make complex problems simpler.** "Understand it. Simplify it. Build it. Improve it." heads chapter 02 only. "Curiosity drives me. Building defines me." is used once, in chapter 05.

| # | Chapter (nav label) | The visitor should think | Primary message | Content |
|---|---|---|---|---|
| 01 | The curious mind (About) | "This person thinks differently." (10 s) | I build things that make complex problems simpler. | The sculpture, one line of supporting copy, name and role kept small |
| 02 | How I think (Thinking) | "He understands complex problems." (30 s) | Understand → simplify → build → improve | The engine as a metaphor, five continuous stages ending in a real result (95% less manual reporting) |
| 03 | What I can do (Work) | "He actually builds useful things." (60 s) | Ideas are interesting; making them work is what matters. | Four capability demos; professional evidence as annotations |
| 04 | The workshop (Building) | "I'd like to see what he makes next." | Some ideas are worth building just to see what's possible. | L//IOS as a product launch; the geometry becomes its interface; other projects, honestly labelled |
| 05 | Beyond the work (Beyond) | "There's a real person here." | Curiosity doesn't stop when the workday ends. | Text-led editorial on interests that feed the work; image slots only if photos are provided |
| 06 | What's next (Contact) | "I'd be interested in what he creates next." | There's always something worth figuring out. | The sculpture returns, resolved; contact links |
| — | Experience & background (secondary) | Credibility on demand | | Roles, leadership, expertise and education, compact; linked from chapter 03 and the footer |

**Duplicates removed:**
- Results, Selected work and the case studies become evidence inside the chapter 03 capabilities.
- Principles are folded into chapter 02.
- Skills move to Experience & background.

## C. Visual direction

- **Idea: the same building blocks, rearranged.** Every visual in the site is made of one unit, the record tile. Arrangement is meaning: the sculpture (possibility), the tangle (complexity), the sort (understanding), the reduction (clarity), the machine (building), the result (improvement), the interface (product) and the resolved sculpture (closing).
- **Sculpture:** "the twisting stack". Twelve square floors of tiles, each turned slightly further than the one below, around a hollow core. It is an architectural silhouette, readable at a glance, with structure and possibility in one form.
  - When idle, the twist breathes slowly, the floors separate and close, and light travels up the core.
  - The cursor tilts the whole and lifts the floors nearest to it.
  - In chapter 06 it returns untwisted and aligned: the same form, resolved.
- **Colour:**
  - Charcoal #0A0C10 and graphite #12161D.
  - Off-white #EEF0F2 and silver #A9B3BF.
  - Teal #3FD3C6 marks clarity: understood, kept, working.
  - Amber #FFB547 marks attention: exceptions and the one real result.
  - Teal and amber appear together only in chapter 02. No glow on text; restrained bloom on tiles only.
- **Type:**
  - Newsreader (editorial serif) for headlines and the voice.
  - Mona Sans for body, labels and figures.
  - Sentence case throughout; no all-caps eyebrows. Chapter numbers are set as plain small numerals.
- **Layout:** each chapter has its own composition.
  - 01: a full-screen sculpture with an off-centre headline.
  - 02: a pinned cinematic stage with a running caption.
  - 03: four demos in alternating, asymmetric arrangements.
  - 04: product stage.
  - 05: a wide editorial text column.
  - 06: centred and quiet.
- **Motion tiers:**
  1. Cinematic: sculpture, chapter 02, L//IOS reveal, closing.
  2. Interactive: the demos.
  3. Editorial: one text reveal per chapter heading.

  Nothing loops except the sculpture's idle breath and the light in the core. All motion is scroll-linked and reversible, with damped interpolation and no scroll locking.
- **Interaction patterns:** cursor parallax on the sculpture; press-to-run on demos; tabs with arrow keys; everything reachable by keyboard and touch.

## D. Signature prototype scope

1. The hero sculpture.
2. The continuous transformation into How I Think (five stages).
3. One complete demo, "Automate the repetitive": the same ten synthetic trades, checked by hand and then by rules.
