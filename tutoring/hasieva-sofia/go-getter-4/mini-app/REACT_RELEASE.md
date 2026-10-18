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
