# Concept C: Intelligence Operating System

## Design plan
- **Idea.** The site is a calm, physical, daylight operating system that belongs to Ryan. You arrive at his lock screen, open it, and his work is already on the desktop as windows. His personal project, L//IOS, lives in a second space. Moving into that space changes the time of day.
- **Tokens.**
  - Fog wallpaper runs from #C9D2D7 to #E8ECEC, with grain and one soft light falloff.
  - Surface #FBFBFA; ink #15191C; secondary text #5D666D; hairlines rgba(21,25,28,.1); accent teal #0F6E6A.
  - L//IOS: dusk #1B1640 to #3A2F8F with a warm horizon glow, violet #7B6CFF, and dark smoked windows (rgba(21,17,44,.94), mostly opaque rather than glass).
  - Corner radii follow hierarchy: window 14, control 8, chip 999, icon tile 27% of its size, phone 44.
- **Type.**
  - Mona Sans for the lock-screen name. Its width axis opens from 78 to 125 as the screen wakes, which is the only motion nobody triggers. It is also used for the L//IOS wordmark and the Results numerals.
  - Instrument Sans for the UI.
  - Newsreader for document content: the About document, the Career reading pane and the Contact lede.
- **Motion.**
  - A single damped-spring integrator (`spring()`) plus a wall-clock `tween()` for counters. Every animated state is a spring target.
  - Gestures hand their velocity to the springs: lock drag, window throw, space scrub and phone swipe.
  - With reduced motion, every spring jumps to its end state.
- **Space switch, the main transition.**
  - One progress value `p` drives everything, and it can be scrubbed with a horizontal trackpad swipe or by dragging the wallpaper.
  - In order:
    1. The plane slides.
    2. The Work space recedes (it scales down and dims).
    3. Dusk falls from the top of the wallpaper (a mask edge moves down).
    4. The daylight falloff sinks and fades.
    5. The menu bar re-tints, staggered slightly after the wallpaper (`--pb`).
    6. The warm horizon glow rises.
    7. The dock re-tints (`--pc`).
  - At p > 0.88 on first entry, the L//IOS widget's lines settle in and Analyst grows out of its launcher row.
  - The transition reverses exactly.
- **Navigation.**
  - Menu bar: active app name, a Go menu, the Spaces control, Overview, Search and a clock.
  - Dock: apps open out of their icon and minimize back into it.
  - Overview (F3, Ctrl+↑ or the menu-bar button): a spring-driven FLIP into a tiled layout with titles.
  - Command bar (⌘K, Ctrl+K or /): searches apps, Analyst, Markets and Health screens, the 7 roles, About sections and actions, then really navigates to them.
- **Phone (760px and narrower).** A home screen with two pages, Work and L//IOS. Each page has one widget and an icon grid. Swiping between pages scrubs the same environment change. Apps zoom out of their icon (clip-path inset plus content scale) and close with Home, Esc, or a swipe down on the header.

## Critique rounds
1. **First build.**
   - Career sat behind Results with its title hidden, which looked messy. I moved Career top-right with its title bar visible and dropped Results below it.
   - The lock name's descender touched the role line; I added space.
   - The lock sheet's rounded bottom showed at rest. It now rounds only while it lifts.
   - The focus ring on the auto-focused About window was heavy; I softened it.
   - The Analyst window floated high with empty space below; it is now vertically balanced.
2. **Second pass.**
   - The Results counters lagged on slow frames and showed wrong figures (such as "94%") for too long. Counters now run on wall-clock time and start as the window arrives.
   - The Health inspector was translucent over Analyst, so text showed through; it is now opaque.
   - The phone was too tall, so its caption hit the dock; I shrank it.
   - On the phone, the unlock tap was swallowed by pointer capture. Capture now starts only once a drag begins.
   - Opening from search no longer scrolls home pages first.
3. **Third pass.**
   - The space spring had a long settle tail, and the L//IOS reveal waited for it. On slow machines the space looked empty for seconds. The reveal now fires as p crosses 0.88, and the spring is a little stiffer.

4. **Fourth pass (after watching the recording).**
   - In software rendering the lock lift crawled for about 30 s, and the first desktop video ran to 96 s. The causes were full-screen repaints: the mask-image dusk edge, `filter: brightness` on the wallpaper, blend-mode grain and an animated border-radius on the lock.
   - Dusk is now a tall gradient sheet moved with `transform`. Dimming is an opacity overlay, the grain uses no blend mode, and the lock sheet has a fixed radius hidden below the fold. The recording dropped to 36 s with the same script.
   - Opening Health or Markets from Work let the first-visit auto-open of Analyst land on top of them. Auto-open now happens only when the visitor switched spaces on purpose.
   - The focused-window shadow was drawing around the transparent Health box.
   - At 360 px the phone app sheets overflowed sideways because the grid track grew to fit the tab strip.

## Limitations
- Windows cannot be resized. The Health window is a phone frame even on a phone, so it reads as a device inside a device. Overview only shows the current space, with buttons to switch spaces.
- Crossing the 760px breakpoint reloads the page, because desktop and phone are different shells over the same window DOM.
- Ctrl+←/→ and Ctrl+↑ collide with macOS Mission Control shortcuts. The menu-bar controls, F3 and the command bar are the dependable paths.
- The wallpaper uses `color-mix()` with `calc()` percentages and CSS masks. These need current Chromium, Safari 16.2+ or Firefox 113+; older browsers get a static day theme.
- The Markets "Research" screenshot has no alt text in `src/content.ts`. I wrote one that describes only what is visible in the image.
- Health shows the six screens that have alt text in content.ts. The fitness, orbit and init screens are not used.
- The 8.5 s auto-unlock, which helps visitors who do nothing, is disabled with `?still` for captures. `?rm` forces reduced motion for testing.
