# Ryan Law V4: visual reinvention

The positioning stays (the builder: curious, independent, practical). The visual foundation changes completely: no record tiles, no WebGL data geometry, no validation grids. The new rule for every visual: it has to work in flat ink on paper before any effect is added.

## Four hero concepts (sketches in `concepts/v4-heroes/`)

| | Concept | Palette | What makes it original | How it moves |
|---|---|---|---|---|
| A | **Rearrange**: kinetic type | Paper and ink, one burnt-amber word | The headline is the sculpture. The sentence starts as a spilled heap of loose type in mixed faces and assembles itself into the line. Typography is the material he builds with. | Letters leave the heap in reading order on springs. The cursor nudges nearby letters. "Take it apart" scatters them and "Put it together" rebuilds them. Any letter can be pulled out and springs home. No WebGL. |
| B | **Exploded drawing** | Graphite drafting grid, white line, amber notes | An engineer's figure: an isometric object is taken apart, annotated part by part, reduced (the duplicate and unused modules are crossed out and leave) and rebuilt with fewer parts ("6 parts → 4"). | Scroll-scrubbed in three phases (take apart, reduce, rebuild). Labels sit on leader lines and parts highlight on hover. SVG only. |
| C | **Pieces**: a construction kit | Warm off-white, charcoal, silver, one teal, one amber | Bauhaus poster energy. Nine flat geometric pieces tumble in and lock into one composed tile, which reads as "assembling simple parts into something resolved". Playful, tactile, very un-corporate. | Pieces drop in one by one on springs. Every piece can be dragged and thrown, and it finds its way home. |
| D | **One line** | Near-black, a single off-white line, an amber pen point | One continuous hand-drawn line starts as a knot (the complex problem). Scrolling untangles it until it becomes the underline of "simpler." The whole thesis in a single stroke. | The line draws itself in. Scroll untangles it from the far end. The cursor can tug the thread. Canvas 2D, 1,400 points. |

**Recommendation:**
- **A, Rearrange**, for the hero. It is the most personal and the most distinctive, it's light and editorial (contrast with the darker chapters), and its one interaction carries the meaning: take it apart, put it together.
- **B's language**, the exploded drawing, for chapter 02 How I think, generalised beyond finance. It is literally "deconstruct and rebuild".
- **D's single line** is an optional thread for the closing chapter: the knot returns, already untangled.

## Storyboard (recommended direction)

Light and dark alternate so that each chapter changes the room.

| # | Chapter | Ground | Visual metaphor | Interaction | Motion tier |
|---|---|---|---|---|---|
| 01 | The curious mind | Paper, light | The headline assembles from a heap of loose type | Take apart / put together; pull a letter | Cinematic, on load |
| 02 | How I think | Graphite drafting grid, dark | An exploded drawing of a generic contraption (a lamp with too many parts): take apart → label each part → cross out what doesn't belong → rebuild with fewer parts → a final "measure" tick shows it works better. No trade data. | Scroll-scrubbed; hover a part for its note | Cinematic, scroll |
| 03 | What I can do | Paper, editorial white space | Four small working tools, each on its own "index card" | Real input, real output | Interactive |
| | 03.1 Understand complexity | | **Untangle**: paste any messy list or CSV. It profiles the data: columns, types, blanks, duplicates, outliers, in plain sentences. | Paste or pick a sample | |
| | 03.2 Automate the repetitive | | **Rule it**: pick rules from plain-language chips and run them over a messy sample (contacts: names, emails, dates). It fixes or flags each row, then shows the minutes saved per hundred rows. Synthetic and labelled. | Toggle rules, run | |
| | 03.3 Make information useful | | **Ask the table**: one small public-style dataset (synthetic, labelled). Pick a question and the right chart draws itself with a one-line answer. | Pick a question | |
| | 03.4 Build working products | | A doorway into the workshop (chapter 04) | Click through | |
| 04 | The workshop: L//IOS | Deep charcoal, product stage | A software launch: the L//IOS mark, then the real screenshots at large scale in a device frame. Three domains (Analyst, Markets, Health), each a full-bleed screen with two lines of copy. Independent project, no RBC link. | Horizontal scroll-snap gallery; tabs by domain; screenshot zoom | Cinematic reveal, then editorial |
| 05 | Beyond the work | Warm paper | Text-led, set like a magazine contents page: tech and AI, markets and investing, fitness, sports and pickleball, travel, creative experiments. Each has one sentence and a small line-drawn glyph. Photo slots only if Ryan supplies photos. | Hover reveals a sentence | Editorial |
| 06 | What's next | Ink, dark | The hero's letters return, already in order. One line: "There's always something worth figuring out." Then contact. | Contact links | Cinematic, quiet |
| — | Experience & background | Paper | A compact two-column CV (roles, leadership, education); a print view gives a résumé | — | None |

## Type
- **Display:** Instrument Serif (editorial, high contrast; italic for the one emphasised word).
- **Text:** Instrument Sans.
- **Annotations and figures:** Geist Mono (lowercase, a draughtsman's notes).

No all-caps eyebrows. This replaces V3's Mona Sans/Newsreader so that V4 doesn't look inherited.

## Colour
Paper #EDEBE6, ink #0E1013, graphite #16191E, silver #A9B3BF; burnt amber #B8661A on paper (#F2A33A on dark); teal is reserved for L//IOS only, so the product has its own identity.

## Honesty rules carried over
- Real figures (95%, 300+, roughly 100–150K) appear only as text annotations in 03.2 and the experience section.
- All demo data is synthetic and labelled.
- L//IOS is shown with real screenshots only and no RBC association.
- Open verification items are unchanged from DIRECTION.md.
