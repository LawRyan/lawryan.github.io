# V8: one site, three rooms

Ryan approved all three V8 concepts (2 Nov 2026) and asked to use them where they fit. V7 stays on its own branch as the fallback.

Branch `v8-site`. Nothing is deployed.

| Chapter | Room | What it does |
|---|---|---|
| 01 Hero | **The Transformation** (WebGL) | About 9,000 straight members assemble into a ruled, curved tower on arrival. Moving across it un-builds it locally, and it rebuilds. "Break it apart" toggles the whole thing. Scrolling on breaks it apart again: every structure starts as a problem. |
| 02 How I think | **The Intelligence World** (WebGL) | A city of 3,200 synthetic measurements (40 series × 80 weeks). Scroll moves through four beats: **Step back** (the map; a pattern) → **Get close** (street level: each building is one value, the avenue is time) → **Follow the signal** (an amber line in the street) → **Find what doesn't fit** (the one tower that breaks its row), ending on "check the data before calling it an event". |
| 03 What I build | DOM, ivory | The three working tools from V4.1: Untangle, Rule it and Ask the table. |
| 04 L//IOS | DOM, dark | The product stage with real screenshots and tabs. The copy comes from `src/content.ts`. |
| 05 Beyond the work | DOM, warm ivory | Six interests. |
| Experience and background | DOM, dark | Roles, education and expertise from `content.ts`. |
| 06 Connect | **The Living System** (WebGL) | Contour rings shaped by a living field. It grows when you arrive. Touch sends a travelling wave; hold, or the button, brings it to order. |

## Engineering
- **One renderer and one canvas.** Only the room whose chapter is on screen renders. The canvas hides behind the DOM chapters, which have opaque backgrounds.
- **GSAP for choreography.** ScrollTrigger reads progress; there is no script pinning and no snapping. The hero's break-apart and the city's camera path are scrubbed.
- **Adaptive DPR** (capped at 1.5 on phones). The loop skips rendering when the tab is hidden or no room is on screen.
- **Reduced motion:** the tower starts built and doesn't orbit; the field doesn't spin. Scroll still steps through the city beats.
- **No WebGL:** the chapters fall back to text, with all four city beats shown.
- **Headlines:** Mona Sans (engineered sans) replaces V4.1's serif across the reused sections.

## Still open
- Copy for review: the Beyond sentences, "Eleven years at RBC Capital Markets", and the open items from DIRECTION.md (Malaysia, share-of-wallet, crypto, the 100–150K wording, the validation case study).
- Smoothness on real hardware (PC and S24+) is unverified. These captures are software-rendered.
- The tower → city hand-over is a cut via scroll. A future pass could fly the tower's members down to become the city's buildings.
