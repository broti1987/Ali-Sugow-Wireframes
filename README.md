# Ali & Sugow — website prototype

Open `index.html` (homepage), `about.html` (About Us) or `expertise.html` (Expertise) in a browser. No build step, no dependencies
(Figtree loads from Google Fonts).

## Files

```
index.html                         homepage markup
about.html                         About Us markup
expertise.html                     Expertise markup
css/styles.css                     layout, type, sections (shared: header, get in touch, footer)
css/about.css                      About Us page layout
css/expertise.css                  Expertise page layout
css/text-animations.css            styles for the text animations
js/core.js                         shared helpers (window.AS), placeholder links, phone menu — load first
js/text-animations/
  slot-hover.js                    letter-roll hover on menu, footer, expertise and "View all case studies" links
  hero-rolling-line.js             fold 1 line 2 — phrases swap letter by letter
  footer-name.js                   footer firm name — fitted to the card width, letters slide up on arrival
  expertise-reveal.js              fold 2 practice areas slide up one by one as the fold lands
  about-copy.js                    About: each fold's copy fades fold to fold, scrubbed by scroll
js/animations/
  hero-canvas.js                   scroll-driven canvas behind folds 1–2 (strands → dot → burst), cursor ripple,
                                   fold 1 copy sliding out left
  our-work-reels.js                dark ground transition + matters turning inside the pill as a smooth twisting cuboid (WebGL, CSS-strip fallback) + rolling year
  people-reveal.js                 People portraits slide up as the row enters the screen
  header.js                        header states: logotype after top fold, dark over Our Work, hides at footer
  testimonial-line.js              testimonial cycle + leading line to the client tile
  floating-button.js               "Start a conversation" button that follows the cursor + its leading line
  about-canvas.js                  About: one pinned canvas across five folds — reverse prism (three curves in,
                                   one waved line out, straight cursor-led centre line) → line reels into a knot →
                                   six layered triangles with a dot → seven turning triangles → broken
                                   construction lines → logomark outline; cursor ripple throughout
  about-geometry.js                About: shape data for about-canvas.js (Figma frame space, generated)
  expertise-nav.js                 Expertise: side index that follows the six disciplines, case-study filters,
                                   dark header over the case studies
  expertise-waves.js               Expertise: wave-warped lines — scroll hint, hero index on hover, the rule
                                   above each discipline (settles in on arrival, moves on hover)
```

Each JS file is a self-contained IIFE and can be removed or replaced on its own. Tuning values
(durations, distances, ripple size) sit as named variables at the top of each file. The About
scroll timeline (how long each fold holds and each turn takes) is the `SEG` list in about-canvas.js.

## Notes for build

- Links marked `data-stub` are placeholders; `core.js` stops them navigating. Remove the attribute once URLs exist.
- Copy, client names, testimonials and case studies are placeholder content.
- Desktop is the reviewed layout; phone layout is a first pass only.
- Every animation respects `prefers-reduced-motion`.
