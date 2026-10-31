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
- 31 Oct: concept C is finished (four refine rounds; see its NOTES.md). A, B and C were delivered as packed HTML files with recordings.
- 31 Oct: new direction, **The Intelligence Engine** (branch `engine`, `concepts/engine`).
  - Keep the constellation's continuous scroll-linked motion; replace the visuals with lit, instanced record tiles that keep their identity through four layouts: raw streams → validation matrix → revenue surface → time series.
  - First three scenes only, as briefed. Two critique rounds; see `concepts/engine/NOTES.md`.
- 31 Oct: Intelligence Engine v2 (`concepts/engine-v2`) replaces the ribbon with a data-architecture hero.
- 31 Oct: Intelligence Engine v3 (`concepts/engine-v3`):
  - The validation run has five phases: alignment, grouped rule runs, an exception queue, resolution, completion.
  - Exceptions can be inspected.
  - Records reach the chart through segment towers.
  - The chart has month and segment interactions, plus an anomaly observation panel.
  - Two refinement passes; see its NOTES.md.
