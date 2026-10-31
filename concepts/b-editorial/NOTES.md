# Concept B: The Ledger (Kinetic Editorial)

The subject is a career spent reconciling, validating and reporting financial data, starting in tax operations with an accounting diploma. So the site is set on **ledger paper**, not newsprint. The typography moves, and nothing in 3D carries the impact.

## Design plan
- **Palette.**
  - Paper `#E4EBE0` with ledger ruling `#B7C8B3`. The ruling is 32px, which is also the body line-height, so the copy sits on the rules.
  - Ink `#000`.
  - Audit red `#C62E2E`, used only for the double margin rule and the tick marks.
  - Forest `#0E3A29` for the inverted 20,000+ spread and the Contents page.
  - L//IOS leaves the paper for night `#07070A`, with violet `#8C7BFF` as its only accent (light, active states, status dots).
- **Type.**
  - Mona Sans variable is the moving face. Its `wdth` 75–125 and `wght` 300–800 axes are driven by pointer, scroll and hover:
    - the cover name lens
    - the figures, which widen as they pass
    - the career years, which open as they cross centre
    - the Contents titles, the tabs and the contact links
  - Newsreader is used for standfirsts, body and captions at 18–21px, measure under 70ch.
  - Tabular figures in the ledger. Proportional figures for the display numerals, because Mona's tabular zero is slashed.
- **Layout.** Every chapter has a different composition:
  - Cover: a fitted full-width name.
  - Reconciliation: a dense wall of rows that drains to one line.
  - 97%: the numeral bleeds off the right edge.
  - 20,000+: an inverted, wide, light numeral bleeding left.
  - 300+: a dense page with 300 tick cells, one per rule, ticked by scroll.
  - 40/30: one sentence carrying two giant numerals.
  - Leadership: an editorial statement with a three-part ledger beneath.
  - Career: a horizontal ledger.
  - L//IOS: a slit reveal into three different feature layouts.
  - Close: a slanted paper edge.
- **Principles.**
  - Reconciliation is the one extraordinary transition. Every other motion is either typographic axis motion or tied to a direct interaction.
  - No fade-up on sections, no tracked caps eyebrows, no mono labels, no "→".
  - The accountant's double rule marks totals: under the 95% headline and under the contact links.

## Mechanics
- One rAF loop with read/write phases. It sleeps when nothing changes and stops when the tab is hidden.
- Pinned chapters use `position: sticky` inside tall wrappers. Progress is computed per section and lightly smoothed.
- **Reconciliation.**
  - Rows are generated to fill the viewport and labelled as illustrative.
  - Rows are processed from the outside in: red tick, then ink strike, then collapse.
  - The survivor row's "95%" and "less manual reporting" cells FLIP into the final headline, with their width and weight axes interpolating. Then the double rule draws and the caption is revealed.
- **L//IOS.**
  - The "//" is drawn as two parallelograms using `clip-path: path()` on the night layer.
  - The parallelograms first run the full height of the page, then widen and merge. They push "L" and "IOS" apart to reveal the full-bleed Analyst screenshot.
  - The screenshot then recedes into a lit frame under the tagline and statement.
  - The product viewers switch screens with a slash-shaped wipe (WAAPI). Captions and alt text are kept from `content.ts`.
- **Folio and Contents.**
  - The folio button is fixed bottom-left and shows the page number and current chapter. It inverts on night.
  - It opens a modal `<dialog>` Contents page: huge Mona Sans titles whose width axis animates on hover and focus. Esc closes it, focus is trapped, and focus returns to the folio.
- **Reduced motion.** No pinning or scrubbing. Final states are shown: the headline, the opened L//IOS environment, and career as a grid. Transitions are disabled.

## Changes after critique
- **Round 1, desktop.**
  - Moved the double rule under "less manual reporting" (it was striking through it).
  - Enlarged 95% and placed the caption top-right to balance the empty right half.
  - Made display numerals proportional (slashed zeros read as code).
  - Shrank 300+ so it stops colliding with the tick grid.
  - Widened the career columns and capped the year width axis at 112 to stop numerals colliding.
  - Enlarged the 40/30 numerals.
- **Round 2, mobile.**
  - Fixed a layout-viewport blow-out: grid `1fr` columns grew to the tab scroller's min-content, which made the folio vanish and the pins misreport. Now `minmax(0,1fr)` plus `overflow-x: clip` on html.
  - Recomposed 97% on phones (caption first, numeral bleeding off the right) and moved the 95% caption up under the headline.
  - Gave the 40/30 numerals larger phone sizes.
- **Round 3.**
  - Fixed the paper's red margin rule showing through the night layer (stacking).
  - Removed a hairline seam where the two slits meet.
  - Toned down one contact line that implied more than the brief states.

## Known limitations
- The reveal's slashes are drawn shapes, not Mona Sans glyphs. The h2 keeps "//" as visually hidden text.
- Cap height comes from canvas `measureText`, with a fallback of 0.72em.
- `clip-path: path()` needs a current Chromium, Safari or Firefox. Very old browsers would show the night layer unclipped during the pin.
- The cover fit has one frame of lag while the lens moves, which is invisible in practice. On touch, the lens is driven by scroll, not pointer.
- The Reconciliation report names, refs and counts are invented and are labelled on the sheet as illustrative and representative, not real data. All results and career facts follow the brief verbatim.
- The Markets viewer is sticky on desktop. On short laptop screens (under about 760px tall), its caption can sit below the fold.
- Video was captured in headless Chromium. Real devices will be smoother.
