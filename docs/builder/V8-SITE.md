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
- The tower → city hand-over is now a rise-and-dissolve (see Build-out). A literal flight of the tower members into the buildings remains a possible later pass.

## Build-out (2 Nov 2026)
Built out as its own page. The live site is not replaced.

- **Hand-over hero → How I think:** while leaving the hero, the tower breaks apart as the camera rises until it looks straight down. The city then dissolves in from the same overhead view.
- **Room changes** are a 0.7 s dissolve, not a cut.
- **Shaders for every room are compiled during idle time** after the hero has assembled, so later chapters don't stutter on arrival.
- **How I think:** the map view is framed to the right of the copy, with a stronger backdrop behind the words.
- **Print:** a print stylesheet gives an 8-page text version of the site, without the 3D rooms.
- **Metadata:** Open Graph tags.
- **Fixed:** "Break it apart" was ignored while the intro was still assembling (tween overwrite). The idle-callback call had wrong arguments.

## Validation (actual results, `scripts/concepts/v8-validate.mjs`, raw output in `v8-validation.json`)

| Check | Result |
|---|---|
| Keyboard | The first Tab goes to the skip link. L//IOS tabs move with arrow keys (Analyst → Markets, panel follows) |
| Accessible names | 0 unnamed controls, 0 images without alt, one h1, headings in order |
| Break / build | Build 1 → 0 after "Break it apart", back to 1 after "Build it" |
| How I think | Scroll at 3 / 36 / 60 / 97% shows beats 1 / 2 / 3 / 4 |
| Untangle | "14 rows · 6 columns · 13 things worth a look", with 9 findings listed |
| Rule it | Toggling a rule changes the output |
| Ask the table | A different question gives a different, computed answer |
| Rendering when not needed | 0 frames in 1.5 s while Beyond is on screen; the Connect room renders while visible |
| Bring it to order | Field order reaches 1 |
| Horizontal overflow | 0 px at 1920, 1440, 390 and 360, checked down the whole page |
| Reduced motion | The tower is built immediately; no errors |
| No WebGL | `no-gl`; all four How I think beats shown as text; no errors |
| Print | 8 pages, all chapters as text |
| Console errors | None |
| Bundle | About 193 KB gzipped (three.js + GSAP + ScrollTrigger + site). L//IOS screenshots load lazily |
| Frame rate | **Not measured on real hardware** (software WebGL here) |
