# React + JavaScript release — 18 October 2026

Canonical frontend sources are `frontend/react/`. Run `npm ci`, then `npm run test:all` to build the three public runtimes and exercise unit, compatibility and browser tests. The build writes the existing catalog, Street Style, Grammar Snack and Vocab Space routes; it does not deploy Apps Script.

Existing Street Style and Grammar storage keys, content IDs and save adapters are retained. Vocab Space retains IndexedDB `learncore-vocab-space-v1`; local pending attempts only become server-confirmed after acknowledgement.

Vocab Space uses the existing LearnCore Supabase project. Apply versioned migrations under `../supabase/migrations/`; deploy `hasieva-vocab` with custom Telegram HMAC verification (`--no-verify-jwt`). Server secrets are TELEGRAM_BOT_TOKEN, HASIEVA_VOCAB_LEARNER_IDS and HASIEVA_APP_ORIGIN; never put their values in this repository. The public endpoint is in `/vocab-space/config.json`.

Verified before release: React logic 15 tests; browser catalog/startup and all three module workflows; Vocab data/PostgreSQL/RLS 16 tests; Edge/HMAC 6 tests. Cloud signed synthetic identity: save, acknowledged read-back, deduplication and auth/isolation/content rejection passed. Synthetic data was deleted and its temporary allowlist entry removed. No existing learner history was imported. Backend mock tests do not send notifications.

Public HTTP, browser rendering, native Telegram rendering and actual learner use are separate checks. A successful synthetic server test does not establish that Sonya opened or completed an exercise. No messages were sent to her.
