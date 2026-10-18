# React + JavaScript release — 18 October 2026

Canonical frontend sources are `frontend/react/`. Run `npm ci`, then `npm run test:all` to build the three public runtimes and exercise unit, compatibility and browser tests. The build writes the existing catalog, Street Style, Grammar Snack and Vocab Space routes; it does not deploy Apps Script.

Existing Street Style and Grammar storage keys, content IDs and save adapters are retained. Vocab Space retains IndexedDB `learncore-vocab-space-v1`; local pending attempts only become server-confirmed after acknowledgement.

Vocab Space uses the existing LearnCore Supabase project. Apply versioned migrations under `../supabase/migrations/`; deploy `hasieva-vocab` with custom Telegram HMAC verification (`--no-verify-jwt`). Server secrets are TELEGRAM_BOT_TOKEN, HASIEVA_VOCAB_LEARNER_IDS and HASIEVA_APP_ORIGIN; never put their values in this repository. The public endpoint is in `/vocab-space/config.json`.

Verified before release: React logic 15 tests; browser catalog/startup and all three module workflows; Vocab data/PostgreSQL/RLS 16 tests; Edge/HMAC 6 tests. Cloud signed synthetic identity: save, acknowledged read-back, deduplication and auth/isolation/content rejection passed. Synthetic data was deleted and its temporary allowlist entry removed. No existing learner history was imported. Backend mock tests do not send notifications.

Public HTTP, browser rendering, native Telegram rendering and actual learner use are separate checks. A successful synthetic server test does not establish that Sonya opened or completed an exercise. No messages were sent to her.

The build copies the shared server word bank to `/vocab-space/unit2.json`; browsers use this public path because GitHub Pages may omit underscore-prefixed source directories. The public JSON is generated from the same 81-word definition used for server grading.

English UI update: all Vocab labels, instructions, accessible names, confirmations, errors and spelling tips use English. Russian word meanings remain glossary content. IDs, storage keys, grading and server configuration are unchanged. Browser selectors were updated and the three-module browser suite and 15 React tests passed. The Vocab script cache version is react-20261018-en.

## Original 25-gap story practice — 18 October 2026

Four newly written stories each contain 25 numbered gaps, five per paragraph. Together they cover all 81 topic items, rather than a selected assessment word list. Assessment files, original passages, titles and variant orders are not included. All learner instructions are English.

24 original synthetic English audio tracks are included: a whole-story recording and five paragraph tracks per story. Rebuild on macOS using `python3 build-story-audio.py` (Samantha at 145 words/minute, ffmpeg). The PDF is not an input to the audio builder.

Story attempts reuse the existing exam-event contract with `hinted=true`: marks are delayed, the word list is locked and guided success never raises independent mastery. Wrong words remain in repair until an independent correct answer. Short independent checks select 25 distinct weak or unchecked words, then shuffle them; successful checks cover all 81 before routine review. Existing full dictation and other modes remain available. No database, Edge Function, identity, routing or learner-history migration is required.

Verification: 21 unit tests passed; the existing three-module browser regression passed; the new story browser gate passed 51 synthetic events (draft reload, audio HTTP, mobile width, delayed results, dictionary lock, guided score, independent repair and 25-word check). All 24 MP3s decode. Native Telegram rendering and learner receipt are separate evidence.


## Mobile design and Motion — 18 October 2026

Integrated motion@14.3.0 (motion/react) for pointer press feedback, interruptible disclosures, audio loading and a single result entrance. OS Reduce Motion removes those transforms and transitions. Answers and per-word progress do not animate. The primary three-step story route precedes optional progress and extra modes; results lead with the score and one primary action. Whole-story disclosure targets exceed 44px, text tracking is less tight, and paragraph audio sits beside the answer.

The answer input remains mounted for the whole session, with focus retained after Enter and Save. Drafts reset per word without autofocus on reload. Composition, busy-state deduplication, pasted-answer assistance and save-failure recovery remain explicit. Touch uses its normal click action; cancelling pointerdown in WebKit suppresses a touch click. Storage errors always reject with an Error, including WebKit transaction failures with a null transaction.error.

Verification: npm run test:all passed (22 React logic tests, backend mocks, catalog/startup, all three module workflows, 51-event story gate, 50-answer WebKit focus gate and mobile design gate). Final audio error/late-promise guard was additionally rebuilt and passed the 22 logic tests. Standard iPhone 17 WebKit covers 402×681, reduced 402×450 and landscape 756×352; reduced height is a viewport approximation, not a real keyboard test. Visual screenshots were inspected. The mechanical design detector reported one existing accent border, which was replaced with an even outline. Public deployment and physical iPhone/native Telegram evidence remain separate.

## Neon speedometer and 85% story progression — 18 October 2026

Successful automatically graded Vocab rounds now show an original neon racing dashboard: the needle and percentage reach the actual score over 1.2 seconds, followed by one of four particle effects (confetti, stars, fireworks or light rings). Effects vary randomly without an immediate repeat in the running app. Motion React is reused; no particle dependency, game assets, external service or sounds were added. Particles ignore pointer input, expire after 3.3 seconds and never replay on result reload. Reduce Motion renders a static final gauge without particles. The celebration is emitted only after a durable final checkpoint; failed saves cannot celebrate.

The threshold uses the true first-attempt ratio, including the complete denominator: 21/25 fails, 22/25 passes, 17/20 passes exactly. Retried words cannot inflate a round. First-letter and letter-building practice stay visibly supported; paper self-check is not automatically graded and does not trigger the success effect.

The four story blocks now progress sequentially. A complete story at 85% unlocks the next story and the independent 25-word check; below the threshold, the same story remains next and an explicit retry keeps the same words. Repair remains available. Passing history is reconstructed from existing persisted exam events grouped by session and exact story item sets. No new learner record schema, backend migration or identity route is introduced; local pending versus server-confirmed status remains explicit. Existing progress is retained. The rest of the app's day schedules and other modules are unchanged.

Verification: 28 React logic tests including final-save failure/retry, threshold boundaries, first-attempt scoring, random variation and controller-level unlock. Existing three-module browser regression, 51-event story gate, 50-answer iPhone 17 WebKit focus gate and mobile design gate passed. New seven-case WebKit gate covers all four effects, 84/85/88/100%, reload, Reduce Motion and 320/375/402px. SVG needle pivot is checked against the rendered dial centre. Screenshots inspected; one decorative stripe detector warning was resolved. Public deployment and physical iPhone/native Telegram checks remain separate.

## Acceleration and result actions — 19 October 2026

Every graded result now uses the dial, including results below 85%. During the 1.2-second count-up, the needle vibrates subtly and bottom light streaks create acceleration; both settle at the true percentage. Passing rounds retain the random celebration and reveal Continue after the 3.3-second sequence. Below the threshold there are no celebration particles; Try again appears after the dial and streaks settle (1.4 seconds), retrying the same block. Reload/navigation and Reduce Motion display the final score and action immediately. The exact score, 85% access rule, storage and server contracts are unchanged.

Verification: build and 28 logic tests passed; seven-case iPhone 17 WebKit gate verifies vibration, speed streaks, delayed Continue/Try again, all effects, 84/85/88/100%, reduced motion and reload; 51-event story regression passed. Mechanical design detector returned no findings. Public and physical-device checks remain separate.
