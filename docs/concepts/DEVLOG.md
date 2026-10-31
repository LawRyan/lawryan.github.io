# Concepts: development log

The constellation and particle direction (branch `immersive`) was rejected on 31 Oct. Three new directions are being built in parallel on branch `concepts`; each has its own `NOTES.md`.

| Concept | Folder | Medium | The one big moment |
|---|---|---|---|
| A, Monolith | `concepts/a-monolith` | three.js, physical materials, bloom | The object splits along its seam, the camera flies into the light, and you land in a white room with the L//IOS screens |
| B, The Ledger | `concepts/b-editorial` | HTML, CSS, variable type | A dense wall of ledger rows is ticked off, struck through and drained until "95% less manual reporting" is left |
| C, Daylight OS | `concepts/c-os` | HTML, CSS, a spring engine | Switching from the Work space to the L//IOS space turns the whole OS from daylight to dusk |

## Log
- 31 Oct:
  - Brief and shared tooling: `docs/concepts/BRIEF.md`; `scripts/build-concepts.mjs` builds the concepts, and `scripts/pack-concept.mjs` packs one into a single HTML file.
  - three.js addons vendored: RoomEnvironment, RoundedBoxGeometry and the bloom chain.
  - B and C were handed to parallel builders; A was built directly.
- 31 Oct, concept A: two critique rounds (see its NOTES.md).
  - Frame-accurate recording: the page exposes `window.__step(ms)` when `window.__manual` is set, and `scripts/concepts/a-capture.mjs` scripts the scroll path.
