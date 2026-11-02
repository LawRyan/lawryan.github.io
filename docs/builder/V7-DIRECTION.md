# V7: the Lens, made into an object

V7 evolves V6. It does not restart it.

What stays from V6:
- the dataset and its mathematics
- the complexity → structure → insight → creation story
- the palette
- the honesty rules

What changes is the art direction, the composition, the interaction and the hand-over into the rest of the site.

Branch `v7-hero`. Nothing is deployed.

## Phase A: audit of V6 (prioritised)

**Already excellent (keep)**
1. The discovery moment: one cloud becoming three groups, with an honest live gauge.
2. The histogram laid along the separating direction (insight), with the rule's thresholds.
3. Analytical integrity: every number is computed in the page, and an automated test confirms the headline figures.

**Reads as a technical prototype**
4. Points were uniform flat discs. There was no depth, no atmosphere and no difference between near and far.
5. The measuring box was a heavy wireframe. Its outlier-driven bounds made it larger than the data, and it crossed the screen.
6. The gauge was a dashboard widget: a label, a bar and a percentage in the text column, disconnected from the object.
7. The arrival was points falling from below. That's motion with no meaning.

**Looks generic**
8. The composition was text on the left and the visualisation on the right.
9. The readout panel was a dashboard card. The four stage tabs read as a progress widget.

**Lacks polish**
10. Axis labels collided with the histogram. The labels were crowded. The lower-left corner was empty.
11. The section ended abruptly. Nothing carried into the next chapter.

**Could be simpler**
12. Three places told the same story at once: copy, panel and gauge.

**The signature moment**
13. The instant the angle aligns. V7 makes that moment the centrepiece.

## Phase B: three treatments (working prototypes in `concepts/v7-lab`, `?t=t1|t2|t3`)

| | Composition | Rendering | Gauge | Verdict |
|---|---|---|---|---|
| **t1 Observatory** | Full-bleed instrument. The statement sits in its foreground, low left; the story text sits low right. | Fine points with atmospheric depth. The cloud casts its shadow onto the three far walls of a fine measured frame; each wall is two of the columns. | A bezel around the instrument: an arc that fills, a target notch, and a live histogram of the best direction visible right now. | **Chosen** |
| t2 Screen | The statement is huge on the left and runs into a projection screen standing behind the cloud. | The screen receives exactly what the eye sees (the flattened cloud). | A live histogram along the screen's lower edge. Peaks emerge as you turn. | The most analytically direct, but the composition crowded the statement. Its live histogram moved into t1's bezel. |
| t3 Filaments | The statement is the frame, full width, and the cloud passes in front of it. | Every customer is a fine stroke pointing at its centre. The strokes swing from one shared centre to their own as structure appears. | A big numeral. | The most striking screenshot, but the strokes read as bursts: too close to "explosion", which the brief rules out. |

Why t1:
- **Beautiful before it's explained:** a scientific object in a room, with its own shadows.
- **The walls are honest:** they show the views you'd get from pairs of columns, which is exactly what the visitor is trying to beat.
- **The bezel makes the gauge part of the object.** The search, the alignment and the reveal all happen in one place.

## The V7 hero

**Composition**
- The instrument is the page. The bezel is centred a little right of the middle (cx 0.58), and the cloud sits inside it.
- The statement sits in the foreground, low left, in two tones. The story text sits low right. Nothing is boxed.
- After discovery, the statement steps back: it scales to half and moves to the top left, and the instrument recentres (cx 0.52).
- On phones the instrument takes the upper half. The statement stands below it, then yields the stage entirely once something is found.

**Arrival (about 3 s, no loading screen)**
1. The measured frame and its ticks draw in.
2. The 1,400 customers start as raw measurements: each laid along one axis of the frame, one column at a time.
3. They then travel into 3D, so columns become a space.
4. The wall shadows and bezel fade in with them.

**Exploration**
- Drag uses measured pointer velocity and exponential damping (3.4/s), with sensitivity scaled to the viewport. Arrow keys work.
- Every frame the bezel arc shows how much structure this angle reveals.
- The live histogram inside the bezel shows the best direction visible now; three peaks emerge as the visitor gets close.
- A "warmer" hint probes four small turns and says which way to go.

**Discovery**
At 82% (the amber notch) the moment is earned. In order:
1. The camera settles the last few degrees and rolls so the separation lies across the screen.
2. The bezel completes in teal and the histogram splits into three coloured peaks.
3. The points colour from left to right, a single pulse runs along the separating axis, and the statement steps back.

No confetti, and no bloom.

**Insight**
1. The bezel withdraws.
2. The k-means centres appear and settle.
3. The histogram rises along the separating direction with its two thresholds, and the equation sits under it.
4. Segment labels give size and behaviour.

**Creation**
1. The thresholds become planes in space.
2. The cloud dims.
3. New customers fall in, are sorted by the rule and are named as they land.
4. The copy reads: 99.8% correct on 560 the rule never saw.

**Hand-over**
- Everything collapses onto the separating axis: the cloud becomes a line.
- The next chapter opens on that same line, coloured teal, silver and amber, under "Every problem is a cloud until you find the right angle."

**Three levels**
1. Immediate: the statement and an object you want to touch.
2. Interactive: turn it, find it.
3. Technical: "How this works" discloses the data generation, the gauge's formula, the k-means settings, the direction, the rule and its validation.

The data is labelled synthetic in three places.

## Design tokens (unchanged from V6 unless noted)
- **Colour:** ground #101318, raised #191E25, surface #242B33, ink #F0EDE7 / #A7AFB9 / #6E7782; teal, silver and amber = segments 1, 2 and 3. Amber is also the target notch: the one thing to notice.
- **Type:**
  - Mona Sans at width 112 and weight 500 for the statement (clamp 38–80 px, line-height 1.01, tracking −0.03 em); body at width 100.
  - Geist Mono only for axis names and the equation.
  - The statement's second line is set in ink-2, which gives a two-tone rhythm (complexity → building).
- **Depth:**
  - Points are size-attenuated with near/far fog toward the ground colour, and alpha falls to 32% at the back.
  - Each point has a crisp core and a soft rim.
  - A vignette sits on the room.
- **Motion:**
  - One GSAP timeline scrubbed by scroll (`scrub: 1.2`). The track is 520 vh with a CSS-sticky stage; no script pinning, no snapping.
  - The visitor's drag always wins, and the camera eases back after 4.2 s idle.
  - Easing: `power3.inOut` for the camera and the statement, `power2.out` for reveals.

## Extending to the rest of the site (after approval)
Each chapter opens from the previous chapter's last state. They share one system and differ in their room.

| Chapter | Opens from | Signature | Room |
|---|---|---|---|
| 02 How I think | The axis line | Atlas: the line becomes the diagonal of a correlation matrix that reorders into blocks; one store breaks away | Ground, the matrix full-bleed |
| 03 What I build | The matrix's blocks become tool windows | Untangle, Rule it, Ask the table, plus the Terrain planner, each a working tool | The one light chapter (ivory) |
| 04 L//IOS | A tool window becomes the L//IOS window | Real screens, with the wordmark in teal (L//IOS keeps teal as its own) | Deep ground, product stage |
| 05 Beyond the work | Quiet | Six interests, text-led, small line drawings | Warm ivory |
| 06 Connect | The line returns | One sentence, three links | Ground |

## Phase D: refinement passes (from browser screenshots)

**Pass 1** (`r1`, desktop)
- The cloud read small inside the bezel and the frame's edges ran off the screen. The camera was pulled back (distance 12.4 → 14.4).
- The compacted statement fought the bezel. The instrument now recentres on discovery (cx 0.58 → 0.52).
- The bezel lingered through Insight. It now withdraws as the histogram rises.

**Pass 2** (`r2`, desktop and 390 px)
- On phones the compacted statement collided with the bezel's histogram, and the segment labels collided with the statement. On phones the statement now yields the stage entirely after discovery, and the segment labels show names only.
- Segment-label descriptions overran one another on desktop. They now wrap at 210 px.

**Pass 3** (`r3`, 1920, 390 and 360 px)
- At arrival, the raw measurements stacked along the frame edges read as a broken diagonal streak. The arrival is now staged: points start faint and travel later, so the frame draws first and then the measurements become a space.
- At 360 px the statement overlapped the story text. Its position is now clamped against the viewport height.
- Points looked too small on phones. They are now 1.6× at phone scale.
- After discovery, a stale "warmer" hint stayed on screen. It is suppressed once found.

**Pass 4** (validation-driven)
- The render loop kept running when the hero was off screen at the bottom of a short page. The next chapter is now tall enough that the hero leaves the viewport, and the loop is measured at 0 frames in 1.5 s off screen.
- The no-WebGL fallback showed an empty room with overlapping copy. It now states the findings, computed from the same data, and the method panel works.

## Phase E: validation (actual results, `scripts/concepts/v7-validate.mjs`)

| Check | Result |
|---|---|
| Analytical tests (`concepts/v6-hero/data.test.mjs`) | Pass: rule 99.8% on 560 unseen customers; best single column 79.8%; k-means direction matches the planted one |
| Keyboard | Tab reaches the skip link first. The instrument is focusable. Eight ArrowLeft presses turned it 0.42 rad |
| Discovery by turning (no button) | Fires, "found by you" |
| Accessible names | 0 unnamed controls, one h1, the canvas labelled |
| Horizontal overflow | 0 px at 1440, 1920, 390 and 360 (screenshots) and on the packed file at 1440 and 360 |
| Reduced motion | No arrival animation (state starts resolved). The "Insight" button jumps to beat 3. No errors |
| No WebGL | `no-gl` class. Findings stated as text. No errors |
| Off screen | 0 frames rendered in 1.5 s |
| Console errors | None in any run |
| Bundle | 190 KB gzipped (three.js + GSAP + ScrollTrigger + hero). At the V6 budget |
| Frame time | **Not measured on real hardware.** This workspace uses software WebGL (median 150 ms a frame, which is meaningless for devices). DPR adapts down after slow frames. Needs a check on Ryan's PC and S24+. |

**Known limits**
- The gauge's "best direction" search runs over 16 directions × 1,400 points each frame (about 22k multiply-adds), which is light on a GPU device but is CPU work.
- The arrival's "raw measurements" read best on desktop.
