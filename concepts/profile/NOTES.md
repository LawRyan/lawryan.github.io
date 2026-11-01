# Profile: a resume with a short record-engine intro

Built on 31 Oct from Intelligence Engine v3, after the direction changed to "a profile showcase/resume" and "don't make up stuff".

## What's real
- **Resume sections:** every section (profile, results, selected work, experience, skills, L//IOS, education, contact) is rendered at build time from `src/content.ts` by `render.ts`. Nothing is retyped.
- **Intro figures:** the intro shows only approved figures: 300+ validation rules, roughly 100–150K trade records, and 95% less manual reporting.
- **Removed from v3:** the synthetic dataset (client segments, revenue, the anomaly), the exception details and the run counts.

## The intro, three moves
1. The data architecture (records in tables).
2. The validation matrix: rules run in groups, and breaks are held in a queue, then resolved. No counts are shown.
3. 100 blocks of reporting effort: 95 fall away and 5 remain, the 95% result drawn literally.

The canvas then fades out and the resume takes over on solid graphite.

## Resume
- **Header:** the navigation highlights the current section.
- **Experience:** a timeline with the current role marked.
- **L//IOS:** tabs with real screenshots and the disclaimer.
- **PDF:** "Save as PDF" prints a clean one-column resume through the print stylesheet.

## Limitations
- Headless software GL runs at about 7 fps, so frame rate must be checked on real devices.
- The PDF comes from the browser's print dialog rather than a pre-made file.

## Polish pass (31 Oct, evening)
- Section headings no longer span 20 grid rows, which had added about 600 px of blank space under every section.
- Print: a two-page A4 resume with a header line (name, title, email, LinkedIn, GitHub, site). Case studies, L//IOS feature lists and the current-role box are left out of print because they repeat the experience section.
- L//IOS: image thumbnails replace numbered buttons; they wrap on phones.
- Phone: the L//IOS panel no longer overflows the right edge.

## Review pass (31 Oct, late)
- **three.js removed.** The intro only needs one instanced shader, a sky quad and three line sets, so `gl.js` (a 90-line WebGL layer with the camera math) replaces it. The script went from 552 KB to 20 KB (8.6 KB gzipped). The shaders and choreography are unchanged; the render is identical.
- **No-WebGL fallback fixed.** The header never appeared (the `ready` class was only added on the WebGL path) and the intro copy blocks overlapped. It is now a still hero followed by the resume, with no entrance delays.
- **One `h1`.** The print header's name is no longer a second heading.
- **Phone intro** shortened from 4.6 to 3.8 screens of scrolling.
- Audit at 1440, 390 and 360: no horizontal overflow, no console errors, every image has alt text, every button and link has a name, no text under 12 px in the resume.

## Content accuracy pass (1 Nov)
Compared the page's text against the live site, line by line.
- **Corrected:** the intro said "Every record checked before it reaches a report". Ryan's correction: the framework validated that the rules were accurate, for audit purposes. The intro now says that.
- **Restored to the live wording:**
  - The 95% note.
  - Case-study labels (Problem, My contribution, Approach, Impact).
  - L//IOS product names: the page had shown internal names such as "L//IOS (desktop)".
- **Restored, because the profile had dropped them:**
  - The section leads from the live page.
  - The "no client, trade or proprietary detail" note.
  - The skills legend.
  - The L//IOS thesis, the "why" question, each app's flow and its proof points.
  - Projects, including the LEI validator and earlier work.
  - The five principles.
  - The contact line, and the "Views are my own" footer.
- **Open:** the validation case study in `src/content.ts` still describes catching errors before reporting. It needs Ryan's wording.
- **95% scene redrawn (1 Nov):** the 10×10 waffle read poorly on phones; its faded blocks almost disappeared. It is now one column of 100 rows (one row = 1% of the manual effort before automation). As you scroll, the top 95 rows drain top-down to faint outlines inside a frame, the bottom 5 stay lit, and labels mark "Before: 100% manual", "95% less" and "5% remains".
