# Проверка ORYZO-адаптации

2026-10-09

- node --test: 4 pass, 0 fail.
- node scripts/check-project.mjs: syntax pass, Three r186; provided GLB 510 meshes / 48215 vertices, valid finite bounds.
- python scripts/browser-check.py: desktop, mobile, reduced motion, failed-load fallback, direct #explore before load — passed.
- Browser console page errors in successful desktop/mobile: none.
- Source review: direct #explore camera transfer defect fixed, follow-up reviewer verdict addressed.
- Screenshot review: full-bleed table, top-down model, isolated model, text margins and line breaks checked.

GPU screenshot tolerance: SwiftShader repeated static captures differ only by colour rounding, max channel difference 1/255 and mean .022/255. The stability assertions accept max1/255 and mean<.1/255; zoom/rotation must differ by mean>1/255.

Browser results and screenshots are adjacent to this file. Screenshot geometry rendering verified, no hardware FPS claim.
