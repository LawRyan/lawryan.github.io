# Intelligence Engine v3: audit and refinement

## Audit of v2 (before changes)

**Rendering**
- One instanced mesh (box geometry, one draw call) of 12,000 records (5,000 on phones) with a custom lit shader.
- Every layout is a per-instance attribute (`aArch`, `aMat`, `aSurf`, `aSer`) or computed in the vertex shader. The GPU interpolates between layouts, so nothing is allocated per frame except a few `Vector3` objects in the camera and label code.
- Supporting geometry (table outlines, matrix frame, rule sheet, grid, axes) is drawn as LineSegments. There is no post-processing.

**Scroll**
- One pinned track and four layouts with holds between them; progress is damped and reversible.
- The camera moves between keyframes, with an orbit in the hero and an inside fly-through in the matrix.

**Keep**
- The architecture hero.
- The single instanced system that carries record identity through every layout.
- The arc-and-snap motion.
- The data model, which reconciles by largest-remainder allocation.
- The palette and the Newsreader / Mona Sans type pairing.

**Weak points**
1. Validation is a single wave with records popping forward in place. There is no exception queue, no resolution, no completion, and nothing to inspect.
2. The rule sheet reads as a scanning laser.
3. Matrix to surface is one long flight. Records never visibly group by segment first, so the chart's link to the records is implied rather than shown.
4. The chart can be hovered by month only. There is no segment highlighting, and the anomaly has no detail.
5. The anomaly is a spike, while the brief's example is a decline.
6. The hero's idle motion is pleasant but not meaningful beyond the record "writes".
7. The HUD is static.
8. The inside fly-through hides the exceptions as they leave the matrix.

## v3 plan
- **Hero:** keep the tables. Add coordinated batch writes (a row of records lifts and settles in sequence across a table) and transfers (records carried between tables on short arcs, like a load job), so the idle state shows a system at work.
- **Validation, as five phases on scroll:**
  1. Alignment: the existing magnetic snap.
  2. Rule execution: records are evaluated in column groups, and each group lights briefly as it passes.
  3. Exception detection: failures turn amber and detach into an exception queue beside the matrix, in the order they were found.
  4. Resolution: each exception is inspected. Corrected ones turn silver and return to their slot; the rest are flagged for review in a deeper amber.
  5. Completion: the matrix settles, and the status display reports validated, corrected and flagged.
  - The camera stays outside the matrix and tracks the wave, so the queue is always visible.
- **Exception inspection:** hover or tap an exception in the queue to open a detail panel with synthetic fields. Previous and next buttons give keyboard access.
- **Analytics choreography:**
  - Validated and corrected records first cluster into six segment towers, whose heights are the segment totals.
  - The towers then spread month by month into the revenue surface, which unfolds into the stacked monthly chart.
  - Flagged records stay out the whole way.
- **Chart interactions:** hover a month for its breakdown. Hover or focus a segment in the legend to highlight it and dim the others. Select the anomaly (now a revenue decline) to open an observation panel: what changed, which segment, by how much, and why it is worth investigating. It is framed as an observation, not a cause.

## Refinement passes
See the log below.

### Refinement log
- **Pass 1:**
  - Passed and unpassed records were too close in tone, so I darkened the unchecked records and gave passed ones a faint teal. The rule groups now pulse visibly as they are evaluated.
  - The queue was a solid amber slab; queued records now sit smaller and tighter, so you can read individual records.
  - The segment towers were crowded and their labels collided, so the towers are spread out for this scene, with two-line labels and a reframed camera.
  - The anomaly panel ran off the bottom of the screen; it now flips above its button.
  - The month tooltip is hidden while the anomaly panel is open.
- **Pass 2:**
  - Removed a label that collided at the towers.
  - On phones, tower labels show only the amount, and the legend appears for the towers as well as the chart.
  - The phone anomaly button was clipped at the right edge.
- **Still to improve:**
  - The table-to-matrix transition passes through a dim cloud for a moment.
  - On phones the matrix is narrow, so the rule groups read less clearly.
  - Headless software GL runs at about 7 fps, so frame rate must be verified on real devices.
