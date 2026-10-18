# Vocab Space / Unit 2

Three-day preparation for the supplied Home & Housework paper dictation. Includes all 81 source units, 162 authored context sentences, 243 locally synthesised British-English MP3s, independent listening/spelling, scaffolded spelling, delayed-feedback 81-item assessment and a self-reported handwriting check.

## Runtime and data boundaries

The catalog entry is in `../street-style-week/tutoring.js`; its `independent` flag makes the link usable without waiting for the legacy Apps Script restore. This module does not import the legacy tutoring bridge or write its results to localStorage. IndexedDB retains immutable pending answer IDs and the current session. App mutations and background sync share a serialized commit queue; atomic IndexedDB merges retain answer evidence from simultaneous handles/tabs. The latest local session checkpoint wins between separate tabs; do not interpret this as multi-device session coordination.

The canonical content and pure exercise engine are in `../tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/vocab/`. Frontend and Edge Function use that same version. The additive migration seeds the same bank and independently checks exact answers in PostgreSQL. Letter scaffolds, hints, pasted text and paper self-reports do not establish independent spelling. Confirmed retention requires server-received successful independent answers on different Moscow dates with at least 12 hours spacing since the last independent error. The three-day target is preparation, not proof of long-term retention.

Paper checks are explicitly self-reported; no claim of verified handwriting is made. The website cannot prevent inspecting source, using another device or using keyboard assistance supplied by an operating system. The exam UI closes the dictionary and withholds feedback until all 81 answers are submitted. An interrupted exam must finish or be discarded before the dictionary opens.

## Configuration and staged release

`config.json` currently has an empty `endpoint`. This is deliberate: no cloud project was created or production route changed. With an empty endpoint, the UI explicitly says that results remain on the device and gives no server confirmation. Browser previews use a separate `preview` IndexedDB profile; Telegram recovery uses a per-user device namespace. Server identity always comes from verified raw initData, never initDataUnsafe.

After explicit approval to connect the backend:

1. Use an isolated local/test Supabase instance and apply the core migration plus `202610150001_vocab_space.sql`.
2. Set server secrets outside Git: `TELEGRAM_BOT_TOKEN`, Supabase credentials, `HASIEVA_APP_ORIGIN`, and `HASIEVA_VOCAB_LEARNER_IDS`. The learner allowlist defaults to empty. Do not put private Telegram IDs in public config.
3. Serve/deploy `hasieva-vocab`, first with synthetic identities; check attempt → read-back, stable request ID replay, unauthorized users and cross-learner denial. Do not send reports or reminders.
4. Set only the public function URL in `config.json`. No service-role key or bot token goes into the browser.
5. Review the actual UI and verify native Telegram keyboard, audio, BackButton and persistence before making learner-readiness claims. Production connection is a separate action from local tests.

Teacher feedback and least-privilege teacher assignments have separate tables. Delivery remains separate through the existing outbox/log model; this module schedules or sends no messages. A full teacher report UI and automatic reminders are not included in this change.

## Reproducible verification

Run from the Git publish root (`english-hw`):

```sh
node --test vocab-space/tests/engine.test.mjs
node vocab-space/tests/e2e.cjs
node --test tutoring/hasieva-sofia/go-getter-4/mini-app/backend/backend.test.cjs
npm --prefix tutoring/hasieva-sofia/go-getter-4/mini-app run test:e2e
deno test tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/telegram_test.ts tutoring/hasieva-sofia/go-getter-4/supabase/functions/hasieva-vocab/handler_test.ts
```

Browser checks use the project's existing playwright-core and installed Google Chrome. For SQL checks without a Docker daemon, use test-only PGlite (no browser/runtime dependency):

```sh
npm install --prefix /tmp/learncore-vocab-db --no-audit --no-fund @electric-sql/pglite@0.5.10
PGLITE_MODULE=/tmp/learncore-vocab-db/node_modules/@electric-sql/pglite/dist/index.js node --test vocab-space/tests/database.test.mjs
```

The SQL harness executes both migrations on PostgreSQL in WebAssembly with synthetic roles and auth helper functions. It skips only the unused pgcrypto extension declaration because gen_random_uuid is already built in. It covers actual SQL answer evaluation, idempotency, paper/hint exclusion, delayed evidence and learner/teacher RLS. It does not prove hosted Supabase/PostgREST configuration or real Telegram receipt.

The `simplify` skill was not present in the installed skill directories. The implementation was manually reviewed for unnecessary dependencies and duplication; no claim is made that this missing skill ran. FSRS and H5P were investigated as reference options but are not dependencies or vendored code: this fixed three-day workflow uses a small auditable exercise engine. PGlite is used only for development verification.

## Audio provenance

Word forms and meanings come from the supplied Unit 2 workbook. The 162 contexts were authored for this module, rather than copied from the final paper test. Speech files were synthesised locally using the installed Daniel British-English system voice at 145 words/minute, encoded to mono 24 kHz MP3. File presence, source text correspondence, sample durations and browser loading were checked; a native-device listening check remains a release gate.
