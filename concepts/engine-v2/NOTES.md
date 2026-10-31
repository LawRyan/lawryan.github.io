# Intelligence Engine 2.0: the ribbon is replaced

Version 1 stays in `concepts/engine` as the fallback. Version 2 changes only the hero and its hand-off into validation. The motion system, the matrix and the analytics are the same, plus a hover readout on the chart.

## Scene 1: data architecture
- **The composition:** seven tables of records hang at different levels like an exploded data-warehouse diagram. There is a wide base table (two levels deep), partitions above it, and a three-level table at the back.
- **The records:** each record is a flat plate with real thickness, lit from upper left. About 4.5% of slots are empty, as records not yet written.
- **Outlines:** each table has a faint outline, with lineage lines down to the base.
- **Motion, all subtle and purposeful:**
  - Each table breathes at its own phase.
  - Now and then a record is written: it lifts and catches a cyan edge, then settles.
  - A soft query sweep travels across each table.
  - The camera orbits slowly and also turns with scroll.
  - Records under the cursor lift.
- **Intro:** the tables fill level by level, with records settling from above.

## Scene 1 to 2: the transition
- **Order:** the tables peel off one level at a time, from the top down.
- **Path:** each record rises a little (controlled dispersal), then snaps into its matrix cell (magnetic alignment).
- **Rotation:** records rotate a real 90° from lying flat to standing in the matrix. There is no fading; every record keeps its identity.

## Scene 3: an added interaction
In the chart, the month under the pointer lights up and a readout gives its revenue and largest segment. The anomaly month shows its deviation from trend.

## Comparison with version 1
| Criterion | v1 (ribbons) | v2 (architecture) |
|---|---|---|
| Reads as data at a glance | Partly: flowing streams could be any motion graphic | Yes: tables, rows, empty slots and records being written |
| Originality | Ribbons of particles are a common motion-design trope | An exploded warehouse of physical records is specific to the subject |
| Visual sophistication | Thin bands high in the frame, empty lower half | A full composition with depth, layering, real lighting on the plates, and room for the type |
| Continuity into validation | Streams scatter into a cloud, then a grid | Flat records lift and rotate upright into cells, a clearer physical story |
| Interaction | Cursor lift only | Cursor lift in the hero, plus a hover readout in the chart |

## Limitations
- Headless software GL runs at about 7 fps, so smoothness has to be checked on a real laptop and phone.
- Regional performance and the dashboard view are not built yet.
- The hover readout is pointer-only. The chart's numbers are also available as visible labels, but the readout itself is not keyboard reachable yet.
