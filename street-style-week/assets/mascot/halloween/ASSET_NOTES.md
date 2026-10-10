# Halloween boot art — asset and timing notes

`#halloween` boot overlay, mounted by `mountHalloweenBoot()` in `street-style-week/app.js` (also reached
from `tutoring/index.html`, because both routes load the same bundle).

| Role | File | Size |
| --- | --- | --- |
| Master | `miso-vampire-autumn-portrait.png` | 768×1376, 1.4 MB |
| UI derivative | `miso-vampire-autumn-portrait-768.webp` | 768×1376, 102 KB |

The derivative is the master at native size (a 390×844 phone at 3× already upscales the 768px source, so
resizing it further would only cost sharpness) at WebP quality 88. `uiAsset()` in `app.js` swaps it in when
the browser supports WebP and falls back to the PNG otherwise.

## Timing rule

`mountHalloweenBoot()` used to arm its 2 s auto-close the moment the overlay was appended. The art is a
1.4 MB request that starts at that same moment, so on a cold mobile connection the overlay closed before a
single pixel of the artwork had arrived and the whole screen was the dark background with the headline.

The close timer now arms only once the art is usable (`complete && naturalWidth`, or its `load`/`error`
event), with a 4 s cap so a dead network cannot trap her behind the overlay. She can always dismiss it
earlier by tapping anywhere, by the button, or with Escape.

## Frame identity

Ginger/orange tabby coat, cream muzzle and chest, three forehead stripes, ringed tail, amber-green eyes,
short hind legs, upright bipedal Munchkin anatomy. The 9:16 portrait keeps the top and bottom bands dark
for the live headline and button. Rejected candidates (`rejected/`) stay rejected: the white-coat render
failed identity, the SeedDream render had UI text baked into the art.
