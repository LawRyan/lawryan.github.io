# Concept A: Monolith

## Idea
One original physical object carries the whole story. It's a tall slab of 44 machined laminations, like a ledger stood on end, split down the middle by a lit seam, with its top cut back at an angle. It is lit like a car launch: black stage, one overhead key light, cool and warm rim lights, and a pool of light on the floor. The light inside is the only colour.

Scroll choreographs it, chapter by chapter:
1. **Ryan Law.** The object stands closed. The lights come up on load, and the name is set wide and light beneath it.
2. **Layers.** The laminations fan out into a twisted stack: data that doesn't agree.
3. **Checked.** The stack separates into four bands, and a frame of light passes down through it. Four flagged layers slide out amber as the gate passes, then return corrected (300+ validation rules).
4. **Automated.** Everything aligns and the seam opens a little. Light runs up the front edges of every layer (95% less manual reporting).
5. **Career.** The object separates into seven bands, sized by time in each role. The camera climbs it, lighting each role as it passes.
6. **Interlude.** The object is gone, and leadership is set as type on graphite.
7. **L//IOS, the transition.** The object returns closed, splits open along the seam, and the camera flies into the light. A white flash, then a white room: a completely different environment. The real Analyst, Markets and Health screens stand on the floor like products. A spec sheet runs across the bottom, with tabs and screen buttons that change the screen in 3D.
8. **Contact.**

**Navigation:** "strata". The index on the right is drawn as the object's own 44 laminations; chapter names sit on it at their real positions and show on hover. On phones it becomes a strip at the bottom of the screen.

## Tokens
- **Colour:**
  - Stage: black #000. Text: #ECECE8 and #8E8E89.
  - Inner light: #FFE3B8. Exception amber: #FFB547.
  - White room: #ECEDEA, with text in #111.
- **Type:** Mona Sans only. Wide (125%) and light (300) for display, normal width for reading. No eyebrows, no mono.
- **Motion:** every movement is the object's: fan, band, scan, align, separate, split. One load sequence; nothing loops except the light running up the stack.

## Critique and changes
- **Round 1:**
  - Point lights inside the seam blew out into glowing balls; I moved them behind the seam and cut them back.
  - The key light burned a white hole in the floor; I made it softer and the floor rougher.
  - The 95% copy sat over the object, so the object was reframed left.
  - In the white room, bloom was hazing the screens and was turned off there.
  - The camera never reached Health; the products now hold, then travel.
- **Round 2:**
  - The scan plane read as a solid white slab, so it became a thin frame of light.
  - Phone framing: the screens sat on top of the spec sheet, and the career labels ran off the edge.
  - The phone stood on a monitor stem, so it now rests on a plinth.

## Limitations
- The canvas is fixed behind the two acts, because the object has to persist through Act I. It is hidden behind the interlude and contact, and rendering pauses there. This is the closest of the three concepts to the rejected structure, but the subject is a physical object, not a data visualization.
- WebGL with bloom: frame rate on mid-range phones still needs measuring. The pixel ratio adapts down when frames run slow.
- Without WebGL, the chapters fall back to a plain readable page.
