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
