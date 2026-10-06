# Ali & Sugow — homepage prototype

Open `index.html` in a browser. No build step, no dependencies (Figtree loads from Google Fonts).

## Files

```
index.html                         markup
css/styles.css                     layout, type, sections
css/text-animations.css            styles for the three text animations
js/core.js                         shared helpers (window.AS), placeholder links, phone menu — load first
js/text-animations/
  slot-hover.js                    letter-roll hover on menu, footer, expertise and "View all case studies" links
  hero-rolling-line.js             fold 1 line 2 — phrases swap letter by letter
  footer-name.js                   footer firm name — fitted to the card width, letters slide up on arrival
  expertise-reveal.js              fold 2 practice areas slide up one by one as the fold lands
js/animations/
  hero-canvas.js                   scroll-driven canvas behind folds 1–2 (strands → dot → burst), cursor ripple,
                                   fold 1 copy sliding out left
  our-work-reels.js                dark ground transition + matters turning inside the pill as a smooth twisting cuboid (WebGL, CSS-strip fallback) + rolling year
  people-reveal.js                 People portraits slide up as the row enters the screen
  header.js                        header states: logotype after top fold, dark over Our Work, hides at footer
  testimonial-line.js              testimonial cycle + leading line to the client tile
  floating-button.js               "Start a conversation" button that follows the cursor + its leading line
```

Each JS file is a self-contained IIFE and can be removed or replaced on its own. Tuning values
(durations, distances, ripple size) sit as named variables at the top of each file.

## Notes for build

- Links marked `data-stub` are placeholders; `core.js` stops them navigating. Remove the attribute once URLs exist.
- Copy, client names, testimonials and case studies are placeholder content.
- Desktop is the reviewed layout; phone layout is a first pass only.
- Every animation respects `prefers-reduced-motion`.
