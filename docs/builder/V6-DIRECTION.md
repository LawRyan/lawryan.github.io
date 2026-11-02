# V6: the analytical instrument

The brief: a premium interactive experience for a creative problem solver, analytical thinker and builder. It should be visually analytical, not corporate or editorial. One extraordinary signature interaction. Every animation earns its place.

Branch `redesign-v6`. Nothing is deployed.

## 1. Audit of the live site (lawryan.github.io, built from `src/`)
Captured at 1440 and 390 px.

- **The hero says the wrong thing.**
  - "Turning complex data into *intelligent* decisions" is corporate.
  - The one italic-serif accent word is the most common generated-page tell.
  - The live-demo card beside it is small and reads as a widget, not a signature.
- **Template chrome everywhere:**
  - tracked all-caps mono eyebrows on every section ("// PROJECTS", "CAPITAL MARKETS / DATA & ANALYTICS / AI INNOVATION")
  - `→` on every link
  - a numbered left rail
  - cards inside cards
- **Length and sameness.** 13,800 px on desktop and 16,800 px on phone, ten sections with the same composition (heading, then list or cards). Nothing changes the room you're in.
- **Motion is decoration.** Section fade-ups and a constellation-style background. None of it shows anything.
- **What's good and stays:**
  - the content (`src/content.ts`, approved figures, real L//IOS screenshots)
  - the Intelligence Lab and the honesty rules
  - performance discipline: React and esbuild, with no heavy framework

## 2. Inspiration: Active Theory (principles, not designs)
- **Craft is engineering.** A lean, purpose-built renderer for the scenes you actually have; custom shaders instead of generic materials; work moved off the main thread; only recompute what changed.
- **Transitions are one continuous world.** Scenes are composited from the same objects rather than cut together, so the visitor never loses their place.
- **Interaction is the content.** The visitor does something and the world answers in under 100 ms.
- **What we take:**
  - one continuous system
  - choreographed camera and transitions
  - custom shaders
  - a hard performance budget
- **What we don't take:** their look (glossy 3D brand worlds, particles as atmosphere). Our world is data, and every element in it is a measurement.

## 3. Three directions

### A. Lens: find the angle *(recommended)*
- **The data:** 1,400 synthetic customers in 3D. From the recorded angle they are one cloud.
- **The challenge:** the visitor is told that three kinds of customer are hiding inside, and turns the cloud to find them.
- **The live gauge:** "Structure visible" is computed every frame from the current projection. It tells them warmer or colder.
- **When they find it** (or ask the system to): the groups light up, a histogram rises along the separating direction, and the direction becomes a rule. The rule is tested on customers it has never seen (99.8% correct, where any single column manages about 80%).
- **Metaphor:** seeing patterns others miss, then building something with them.
- **Signature:** the search itself.

### B. Atlas: relationships and the outlier
- **The data:** 36 synthetic stores × 104 weeks, as a wall of instruments above their correlation matrix.
- **The sequence:** the matrix reorders into blocks, the wall regroups, stacks reveal each group's shape, and one store breaks away. The groups become a forecast and a monitor.
- **Metaphor:** structure in noise.
- **Signature:** the matrix reordering.
- **Strength:** the most like real analytics work.
- **Weakness:** busy at hero scale. Small charts don't survive a phone.

### C. Terrain: from results to a decision
- **The data:** 360 synthetic weeks (discount × ad spend → profit).
- **The sequence:** a fitted surface rises out of the scatter, contours find the peak, the surface recolours by uncertainty, and the peak turns out to be where there is least evidence. The surface becomes a planner.
- **Metaphor:** judgment under uncertainty.
- **Signature:** the uncertainty reveal.
- **Strength:** the most mature thinking.
- **Weakness:** needs explanation before it lands. Harder to read at a glance.

### Choice: A, Lens

| | A Lens | B Atlas | C Terrain |
|---|---|---|---|
| Originality | Visitor *does* the analysis | Strong | Strong |
| Analytical storytelling | Complete arc in one object | Complete, but many objects | Complete, needs reading |
| Visual impact | One iconic object, readable in 3 s | Dense | Beautiful surface, slower to read |
| Feasibility, incl. phone | High: points and a camera | Medium: 36 charts on a phone | Medium |

B's matrix reorder becomes chapter 02 (How I think). C's planner becomes one of the chapter 03 tools. Nothing is wasted.

## 4. Design tokens

**Colour** (Ryan's palette)
| Token | Hex | Role |
|---|---|---|
| `--ground` | #101318 | the room |
| `--ground-2` | #191E25 | raised planes, panels |
| `--surface` | #242B33 | controls, pressed state |
| `--ink` | #F0EDE7 | primary type |
| `--ink-2` | #A7AFB9 | secondary type |
| `--ink-3` | #6E7782 | tertiary, axes |
| `--silver` | #A9B6C4 | unclassified data |
| `--teal` | #2FB8AC | found structure, "clarity" |
| `--amber` | #F2A33A | the one thing to notice: the answer, an outlier |

Each segment colour has one meaning: teal, silver and amber are segments 1, 2 and 3. Nothing else uses amber.

**Type**
- **Mona Sans (variable width and weight).**
  - Headline at width 112 and weight 500, slightly expanded and engineered, not editorial.
  - Body at width 100 and weight 400.
  - Every figure uses tabular numerals of the same family.
- **Geist Mono** only where a value is literally code or a coordinate (the rule's equation, axis names). No mono eyebrows.
- **Scale** (1.25 ratio, 16 px base): 13 / 16 / 20 / 25 / 31 / 39 / 49 / 61. Hero headline clamp(34px, 3.6vw, 56px), line length 22 ch or less.
- **No:**
  - all-caps labels
  - a single accented word in the headline
  - `→` on buttons
  - middle-dot meta strings

**Layout and space**
- 8 px base unit.
- Copy column 5 of 12 at desktop. The instrument owns the right 7 columns and bleeds full-screen.
- Radii: 10 for panels, 999 for the gauge track, 0 for anything that is data.

**Easing**
- `--out: cubic-bezier(.16,1,.3,1)` for arrivals.
- `--io: cubic-bezier(.65,0,.35,1)` for camera.
- Durations: 160 ms (feedback), 600 ms (reveal), 1,800 ms (camera).

## 5. Hero storyboard (Lens)
| Beat | Scroll | What you see | What you learn |
|---|---|---|---|
| 0 Arrive | load | The measuring box draws itself, then 1,400 points settle into it from below, front to back (about 1.4 s). The headline sets in three lines. | This is a real dataset with three named axes. |
| 1 Complexity | 0–22% | One silver cloud, gently swaying. "Three kinds of customer are in here. Turn it until you see them." The gauge reads about 5%. Drag: the gauge answers every frame, and a faint ring shows which way is warmer. | Structure depends on the angle you look from. |
| 1a Found | interactive | At 80% or more the cloud snaps the last few degrees, the groups light up from left to right, and "Found it" appears. Or press "Show me". | The visitor made the discovery. |
| 2 Structure | 22–45% | k-means draws its three centres and settles iteration by iteration. The points recolour as their centre moves. | The machine confirms what the eye saw, with numbers. |
| 3 Insight | 45–70% | The camera rolls so the separating direction lies across the screen. A histogram rises underneath, with two thresholds. The readout: +0.72 visits −0.57 spend +0.39 tenure; best single column 80%. | It's a combination nobody would see one column at a time. |
| 4 Creation | 70–100% | The thresholds become planes. New customers fall in and are sorted. "Tested on 560 it never saw: 99.8%." | Insight becomes a working tool. |
| exit | after 100% | The pinned stage releases. The cloud stays as the backdrop that chapter 02 transforms from. | |

## 6. Motion architecture
- **One master timeline (GSAP)** with labels arrive, complexity, structure, insight and creation. It tweens a plain state object (camera blend, colour, centre progress, histogram, planes, labels). Three.js renders whatever the state says. There is one source of truth for choreography.
- **Scroll drives the timeline, without hijacking.** The hero is a CSS-sticky stage inside a 420 vh track. ScrollTrigger reads progress (`scrub: 1.2` for damping). Nothing is pinned by script, and there is no snapping or locking.
- **Three tiers:**
  - cinematic: arrive, camera roll, planes
  - interactive: drag with inertia; the gauge and "warmer" ring update within one frame
  - editorial: the copy changes per beat with a short cross-fade
- **The visitor wins over the timeline.** Dragging takes the camera; after 4 s idle it eases back to the scripted path.
- **One render loop** on `gsap.ticker`. It renders only when something changed or is moving, pauses when offscreen or hidden, and lowers DPR when frames run slow.
- **Reduced motion:** no arrive sequence and no sway. Scroll still steps the beats, and every state is reachable with buttons. The gauge still works.

## 7. Technical plan
- **Modules:**
  - `data.js`: pure; generates the data, k-means, the separating direction, the rule, accuracy and profiles. Unit-tested in Node.
  - `scene.js`: three.js. One `Points` object with a custom shader (round, depth-faded and size-attenuated; per-point colour mix with a stagger by rank along the separating direction), box lines, planes and arrivals.
  - `gauge.js`: live separation of the current projection, plus a warmer/colder probe.
  - `overlay.js`: projected HTML labels with a collision pass, and an SVG histogram aligned to the projected axis.
  - `hero.js`: the GSAP timeline, ScrollTrigger and interaction.
- **Dependencies:**
  - three r187, already vendored, pinned
  - gsap 3.13.0 (free standard licence), pinned and bundled by esbuild
  - no other libraries
- **Budget:**
  - JS at most 190 KB gzipped for the hero
  - first paint before WebGL starts
  - 60 fps on a mid-range phone at DPR 1.5 or less
- **Fallbacks:**
  - No WebGL: a static description, the computed numbers and stage buttons.
  - Keyboard: the arrow keys turn the cloud, Enter on "Show me", and the beats can be reached by Tab.
- **Verification** (the site-visual-qa skill):
  - screenshots at every beat on desktop, 390 and 360 px
  - checks for overflow, console errors, reduced motion and accessible names
  - two critique passes before showing
- **Then, after approval:**
  - 02 How I think: Atlas's matrix reorder, growing out of this cloud
  - 03 tools: Untangle, Rule it, Ask the table, plus Terrain's planner
  - 04 L//IOS: product stage with real screens
  - 05 Beyond
  - 06 Close

## 7a. Skills
- **Activated:**
  - frontend-design (installed)
  - creative-web-motion and site-visual-qa (Ryan's own)
- **No GSAP or Three.js skill exists in the plugin directory.** The craft rules live in creative-web-motion.
- **Third-party plugins reviewed and not installed here:**
  - parallax-threejs (community; WebGL debugging plus Playwright/DevTools MCP servers)
  - Microsoft's playwright MCP
  - a community React/GSAP bundle with privileged access
- **Install these on the PC with real hardware if wanted:** Playwright MCP and Anthropic Design. The cloud workspace already runs Playwright directly.
