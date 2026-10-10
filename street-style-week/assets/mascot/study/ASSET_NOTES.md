# Study Miso — frame set

Canonical frames for the interactive catalog mascot (`#catalogMiso` in `street-style-week/index.html`
and `tutoring/index.html`). All four are crops of **one render batch**, so they keep the same
silhouette, scale and lighting and can be cross-faded without the cat appearing to resize or relight.

| Role | Master (PNG) | UI derivative (WebP, 840px) |
| --- | --- | --- |
| Study pose (base) | `miso-studying-book.png` — 1084×1451 | `miso-studying-book-840.webp` |
| Reaction — side eye | `reactions/miso-annoyed-side-eye.png` | `reactions/miso-annoyed-side-eye-840.webp` |
| Reaction — wink | `reactions/miso-annoyed-wink.png` | `reactions/miso-annoyed-wink-840.webp` |
| Reaction — surprise | `reactions/miso-annoyed-surprise.png` | `reactions/miso-annoyed-surprise-840.webp` |

## Why the `-cutout` files are not the base frame

`miso-studying-book-cutout.png` (896×1200) is a **different render**, not a tighter matte of the
same one. Measured with a ginger-coat mask (alpha > 200, `r-g` > 35, `r-b` > 60):

| Frame | Coat height / frame height | Coat width / frame width | Mean lit colour |
| --- | --- | --- | --- |
| `miso-studying-book-cutout.png` | 0.71 | 0.56 | (93, 53, 31) |
| `miso-studying-book.png` | 0.89 | 0.67 | (157, 103, 71) |
| `reactions/miso-annoyed-*.png` | 0.88–0.92 | 0.67–0.68 | (161–165, 103–111, 71–80) |

Pairing the cutout with the reaction frames made the cat grow ~25 %, sit ~8 % higher and change
lighting on every tap. The `filter:brightness(1.1) saturate(1.12) contrast(1.02)` rule that used to
sit on `.catalog-miso__base` only partly masked that, and is what made the resting pose look washed
out. It has been removed. The `reactions/*-cutout.png` variants are colour-damaged as well (white
cloak, washed subject) and are not used.

## Rules

- Before adding or replacing a frame, check it against the table above: coat height 0.87–0.92,
  coat width 0.66–0.68, frame 1084×1451 or an exact same-aspect resize.
- Regenerate only from the approved ginger Munchkin reference. Never restyle the identity.
- UI derivatives are 840px wide (a 280px mascot at 3×) at WebP quality 88; the PNG masters stay in
  the tree as the fallback for clients without WebP.

## Motion

A tap runs a three-beat reel; `mountCatalogMiso()` in `street-style-week/app.js` owns the timelines and
the markup carries four stacked layers (the study pose inside `<picture>`, then one `<img>` per reaction).

| Beat | Frame | Fully in at | Dominant for | Notes |
| --- | --- | --- | --- | --- |
| 1 | `surprise` | 170 ms | ~210 ms | The shock answers the tap, so it starts rising immediately |
| 2 | `side-eye` | 500 ms | ~210 ms | "who, me?" |
| 3 | `wink` | 840 ms | 660 ms | Punchline: it settles to rest and holds |

- `CLIP` 1200 ms covers all three beats, then `HOLD` 300 ms on the wink and `RELEASE` 220 ms back into
  the study pose over the same path. Total ~1.7 s per tap.
- Each layer is parked, rises over `RISE` (120 ms) ending at its arrive point, holds while the next one
  rises, then dissolves out over the next rise. Coverage is continuous: exactly one expression is
  always at full opacity, so the panel never flashes the background.
- Beat order lives in `REEL` (`[2, 0, 1]` = surprise, side-eye, wink) and is deliberately separate from
  the asset order, so frames can be re-ordered without touching the markup.
- **Every layer needs an explicit keyframe at `offset: 1`.** A short keyframe list makes the browser fill
  the end of the animation from the underlying value; that is how the study pose once bled back through
  the reel as a double exposure.
- The idle breath is CSS on `.catalog-miso__stage` (`miso-breathe`, 3.6 s, ~1% vertical stretch, origin on
  the ground contact). Curves come from the shared `--ease-out` / `--ease-in-out` tokens, read by the JS
  with `getComputedStyle` so there is one source of truth.
- Press feedback is `pointerdown` → 130 ms scale; `pointerup`/`pointercancel`/`pointerleave` always
  release it. Reduced motion swaps straight to the wink, holds, and returns with no movement or breath.
- To re-check the choreography without a device: screencast the page and trace
  `getComputedStyle(layer).opacity` per `requestAnimationFrame`, then read the table of arrivals.
