# The Intelligence Engine: proof of concept (scenes 1–3)

Keeps the motion from the constellation prototype, which was continuous, scroll-linked, damped and reversible, with cinematic camera moves. Replaces its visual language.

## The system
- **One population of records** (12,000 on desktop, 5,000 on phones). Each record is a lit, instanced tile, not a point: a thin plate with real shading, specular highlights and a soft fresnel edge.
- **Every record keeps its identity** through four layouts, and the GPU interpolates between them on scroll:
  1. **Raw information:** six ribbons of records in flight. Each tile is oriented along its path, and each ribbon twists slowly. Records under the cursor lift and catch the light.
  2. **Validation:** a 3D record matrix (60 × 40 × 5 on desktop).
     - A rule wave sweeps across it; passing records light up.
     - About 2.4% are exceptions: they turn amber and step forward out of the matrix.
     - The camera flies inside the matrix behind the wave, then pulls out to show the result.
  3. **Revenue surface:** only validated records aggregate into stacked plates by client segment × month. Exceptions sit in a held-back tray.
  4. **Time series:** the surface unfolds into a readable stacked monthly chart.
     - It has value gridlines and direct segment labels.
     - The anomaly (Banks, Jun Y2) stays amber and is labelled against its own trend.
- **Transitions:**
  - Each record travels on an arc, not a straight line, and the movement sweeps in a meaningful direction: left to right as the matrix assembles, month by month as the surface builds, bottom-up as it unfolds.
  - Orientation and scale interpolate too, so ribbons of plates become cells, then plates, then chart cells.
- **Supporting geometry:** stream guide lines, the matrix frame and the column ticks, a faint light sheet for the rule wave, the surface floor grid, and the chart axes.

## Data honesty
- **Synthetic data:**
  - The dataset is synthetic, seeded and deterministic: six client segments over 24 months, with trend, seasonality, noise and one planted anomaly.
  - Tile counts per cell come from largest-remainder allocation, so the chart is exactly the validated records: every tile is accounted for.
  - The chart's axis values follow from the per-tile value.
- **Labelling:** the page says it is an illustrative model on synthetic data.
- **Approved figures:** 300+ validation rules and roughly 100–150K trade records are labelled as the real framework. The exception count is labelled as belonging to this model.

## Tokens
- **Colour:**
  - Graphite #080B10 → midnight navy #0A1428.
  - Silver #C9D2DC, cool white #EEF3F8.
  - Teal #3FE0D0 for the wave and passing records.
  - Amber for exceptions and the anomaly.
  - Segments use restrained silvers, steel blues and teals.
  - No bloom.
- **Type:** Newsreader for editorial statements; Mona Sans for UI and figures. The hero name is assembled letter by letter.

## Critique and changes
- **Round 1:**
  - The rule-wave light sheet read as teal fog, so it was reduced to a faint edge-lit sheet.
  - Passed records were over-saturated teal; they are now a silvered light.
  - The amber looked yellow from emission, which was lowered.
  - The surface copy collided with the anomaly label, and the chart copy collided with the axis.
  - The chart's exceptions column collided with the direct labels.
- **Round 2:**
  - The surface segment labels were clipped.
  - On phones, the legend replaces the 3D labels.
  - The anomaly label is shortened on phones.
  - The phone chart framing and the phone matrix framing were adjusted.

## Limitations and next steps
- The analytics scene covers two of the six named views (segmentation × revenue surface, and time series with anomaly detection). Regional performance and the dashboard view are next.
- Scenes 4–7 (automation, leadership, career, L//IOS) are not built yet.
- Headless software GL runs at about 7 fps, so frame rate must be measured on a real device. The pixel ratio adapts down if frames run slow.
