# V4: visual reinvention, development log

Direction: docs/builder/V4-STORYBOARD.md. Ryan picked hero A (Rearrange) on 1 Nov 2026. Branch `profile`; not deployed; noindex.

## Built from scratch (nothing reused from V3's engine)
- No WebGL. Kinetic type (DOM + springs), an SVG exploded drawing, three working tools, CSS-only product staging.
- 01 Hero (paper): the sentence assembles from a heap of loose type; take apart / put together; pull any letter; the cursor nudges letters; scrolling away loosens the sentence.
- 02 How I think (graphite drafting grid): a 7-part contraption is taken apart and labelled; the copy, the workaround and the unread report are crossed out and leave; four parts are rebuilt in line ("the same step, now automatic") and measured against the original. Scroll-scrubbed and reversible; hover a part to highlight it.
- 03 What I can do (paper): Untangle (CSV profiler: types, blanks, mixed date formats, spelling variants, typos, outliers, duplicates); Rule it (seven toggleable rules on the same list, with fixes counted and rows held for a person; the time saving uses a stated 10 s/fix assumption); Ask the table (four questions on a synthetic coffee roaster's year; the chart and the sentence are computed in code). All of it runs client-side.
- 04 Workshop (night, teal reserved for L//IOS): the wordmark, tabs for Analyst/Markets/Health, real screenshots in a window frame or phone frames that settle into place on scroll, plus principles and the disclaimer. All copy comes from src/content.ts.
- 05 Beyond (warm paper): a contents-page list of six interests with line glyphs. **Draft copy, for Ryan to review.**
- Background (paper): roles, education and expertise from content.ts. No résumé file published.
- 06 Close (ink): the closing line assembles when it scrolls in and loosens when it leaves; then contact.

## Checks run
- Packed file: no console errors; no horizontal overflow at 1440, 360 and 390 px; reduced motion loads; every button and link has an accessible name; fonts load inline.
- Tool outputs verified in Node against the sample (the findings list matches the planted issues).
- Refinement passes: (1) the hero now loosens upward, not over the paragraph; drawing labels de-overlapped; removed parts leave up and to the right, fading fully after the rebuild; the dimension moved off the copy. (2) Exploded drawing no longer cropped under the header on desktop or phone; phone dimension labels shortened; horizontal overflow from loose letters clipped.

## Needs Ryan's review
- Beyond the work: all six sentences are drafts (pickleball, travel, creative experiments especially).
- "After hours, I build my own software" (hero) and "Eleven years at RBC Capital Markets" (background heading).
- Existing open items from DIRECTION.md still stand (Malaysia, share-of-wallet, crypto, record counts, validation wording in content.ts).
