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
