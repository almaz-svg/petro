# ORYZO reference correction — implementation record

User requests the design and animation of oryzo.ai with mosque-360.glb replacing the original object. Spec: ../specs/2026-10-09-oryzo-motion.md. Preserve original local assets and Three.js 0.186.1.

- [x] Inspect live site HTML/CSS, scroll motion and complete-loader screenshots in Chrome.
- [x] Rewrite layout: fixed canvas, hero brand/card, side copy and scroll tracks.
- [x] Add dimension-aware camera keyframes, easing, transient drafting desk and contact shade.
- [x] Integrate scroll progress, line reveal, active navigation and final free-view controls.
- [x] Keep reduced-motion, GIF fallback, pause, keyboard focus and lifecycle cleanup.
- [x] Run server/trajectory tests and local model parsing.
- [x] Run actual Chrome desktop/mobile/reduced-motion/fallback checks.

Verification artifacts: docs/verification/*.png and browser-results.json. Tests: 4 node tests, local model parser and browser checks. Visual refinements after screenshots: full-bleed desk, correct line breaks, clear right-side margin and pause only for free view/fallback.
