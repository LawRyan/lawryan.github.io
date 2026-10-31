# Immersive redesign: development log

Branch `immersive`. Experimental build at `/next/` (noindex, not linked). The live site is untouched until approval.

## 1. Audit (31 Oct)

**Strongest content and interactions**
- Four approved results: 95% less manual reporting, 97% fewer KYC errors, 20,000+ client records, 300+ validation rules (100–150K trade records).
- The Intelligence Lab, which runs the analyst in the browser, including on the visitor's own CSV.
- Real L//IOS screenshots in `public/lios-shots`: Analyst (dashboard, investigation, quality, ask), Markets (home, research, evidence, semis) and Health (nine phone screens).
- Career history from LinkedIn: seven RBC roles since 2015; VP since Dec 2025; manages an offshore analytics and reporting team.

**Limitations of the current site**
- A templated dark SaaS look: the same card, small all-caps mono label and italic accent word in every section.
- Too long: 13.8k px on desktop and 16.8k px on phones, across 10 sections. The L//IOS section alone is about 3.5 screens.
- Results sit in a strip below the hero, and the Lab is about 10 screens down.
- Motion is scattered (aurora, signal canvas, scroll thread, reveals) with no single memorable moment.
- Dense, low-contrast experience Gantt chart. 2018 bootcamp projects dilute a VP story.

**Constellation Data prototype**
- Good: the particles carry the meaning (charts, not decoration), the figures are honest, and the labels are real HTML.
- Weak: flat 2D charts on a black void with no depth, light or camera. Every scene has the same layout (text left, chart right). The plum palette reads as "night sky", not "markets".

## 2. Three concepts

1. **The Resolve (chosen):** one continuous 3D data world that the camera travels through. Chaos resolves into structure, validation, automation, leadership, career, then a portal into L//IOS. The cursor is a lens that brings order to the data beneath it, which is the brand idea made interactive.
2. **Editorial instrument:** a print-like layout with shader-masked type and inline charts. Elegant, but not the creative leap asked for, and it doesn't feel immersive.
3. **The floor:** a spatial room of floating screens. Strong for the L//IOS showcase but weak for the complexity-to-clarity story, and texture-heavy on phones.

**Decision:** concept 1, with concept 3's spatial panels used only for the L//IOS reveal, where a change of environment is the point.

## 3. Technology choices
- **three.js r187** (vendored in `vendor/three`, MIT; the npm registry isn't reachable from the build machine). Custom GLSL shaders. No React Three Fiber, because the experience is one imperative scene and React stays for the existing pages.
- **No GSAP or Lenis.** A small scroll director (one requestAnimationFrame loop, damped progress, keyframes per scene) avoids a second animation system and keeps native scrolling, which suits accessibility and phones.
- **Type:** Mona Sans variable (width 75–125, weight 300–800; GitHub, OFL) for display and UI; Newsreader for editorial interludes. Self-hosted WOFF, subset to Latin.

## 4. Visual system
- **Colour:** depth gradient from #050A11 to #0C1824; data ice #9FD4FF; insight warm #FFD6A0; exception amber #FF8A3D; text #EAF0F7 / #8C9AAD. In L//IOS the environment shifts to violet #A08BFF.
- **Motion rule:** the scene answers the scroll; nothing plays on a loop except slow drift. One orchestrated entrance (the data resolving behind the name).
- **Composition:** varies by scene. The hero is full-bleed; Structure is asymmetric; Validation is a full-bleed instrument; Leadership is intimate editorial; Career is a horizontal journey; L//IOS is a product launch.

## Log
- 31 Oct: audit and concept. Fonts and three.js vendored. Prototype next: hero, Structure and Validation.
- 31 Oct: prototype (hero, Structure, Validation) at `/next/`.
  - Critique, round 1: dim dust, invisible lens, blobby clusters, unreadable stream.
  - Round 2 added depth of field, halo points, a lens ring, the rule gate, ordered lanes after the gate and an exceptions tray, and reframed every scene.
  - Round 3 found dark discs over the gradient. Cause: opaque fragments over a transparent canvas. Fix: draw the sky inside WebGL so particle light is purely additive.
  - Headless software GL runs at about 7 fps, so frame rate must be measured on real devices.
- 31 Oct: full experience, nine scenes: complexity, structure, validation, manual, automated, leadership network, career flight, L//IOS, horizon.
  - Career and the L//IOS showcase are rendered at build time from `src/content.ts` (`src/next/static.ts`), so nothing is retyped and they work without JavaScript.
  - L//IOS sits just beyond the end of the career path (`LIOS_C`): the camera flies through each move (a ring per role) and arrives at the mark. Then the product stage scrolls over it while the mark falls out of focus.
  - Showcase: three tabs (arrow-key navigation), real screenshots with a depth crossfade (desktop) or a fanned deck (phone), thumbnails, swipe on phones, a pointer tilt. Status chips come from the content file (Working, Prototype, In development, Planned).
  - Chapter rail (≥1100px), a top progress bar, `?debug` shows fps, DPR and point count.
  - Critique, round 1: the rail labels collided with right-hand copy; the pipeline was a hot blob across the text; the leadership graph overlapped the headline; the career camera passed through the final ring; the horizon line cut the contact links. All reframed.
  - Standalone build now inlines the screenshots too (`node scripts/standalone-next.mjs <out>`).
