# Backlog — Хасиева Софья · Go Getter 4 Mini App

## Now — verify the published Miso interaction

- [x] Publish the catalog Miso interaction to GitHub Pages: base colour alignment, expressive reaction and the same transition played in reverse for the return to the book pose. Public cache-busted catalog route is available at `tutoring/?v=miso-catalog-motion-v5-20261010#catalog`.
- [x] Re-pair the catalog Miso frames after measuring the mismatch: the base is now `miso-studying-book.png`, from the same render batch as the three reactions, so a tap no longer resizes or relights the cat; the `brightness/saturate` hack is removed and the frames ship as 840px WebP derivatives. Table and rules: `street-style-week/assets/mascot/study/ASSET_NOTES.md`.
- [ ] On Sonya's actual iPhone 14 and in Telegram WebView, open `tutoring/?v=miso-motion-v6-20261010#catalog`, tap Miso several times, and confirm that the cat keeps its size and lighting, that the return reads as the reverse transition, that the derivative frames look sharp, and that no cached v5 assets appear. This must be observed on-device; browser verification is not a substitute.
- [ ] If a future expression still reads as different lighting rather than one character moving, regenerate that frame from the approved study-pose reference in one generation batch before adding it, and re-check it against the frame table in `ASSET_NOTES.md`. Do not replace the canonical ginger Munchkin identity.

## Now — verify the next learner reminder receipt

- [x] Prepare seven unique humorous English reminders for 2026-10-12–18 and deploy them as Personal Tutoring Apps Script v11. Existing schedule, private learner destination, daily duplicate guard, practice suppression, and app button are unchanged.
- [ ] After the first scheduled send, confirm receipt from the actual Telegram delivery/log state; deployment readiness alone does not prove that Sonya received a reminder.

## Now — publish and confirm detailed tutor reports

- [x] Gradually roll out Personal Tutoring v10: migrate pending Grammar Snack legacy errors into the aggregate report, persist before superseding, make retries idempotent, and guard the production E2E. Backend tests pass; same endpoint reports `tutoring-ready`. Real Telegram receipt remains unverified.
- [x] Publish the guarded Personal Tutoring-only backend update to the existing deployment (`@9`); verify bridge readiness and retain active v8/source backups. No learner login, message, progress write, or frontend/content deployment was used.
- [x] Add a guarded Apps Script release helper: read-only preflight by default, backup first, verify active endpoint/project and source drift, and require `--publish` before external writes.
- [x] Resolve both distinct tutoring endpoints: top-level Grammar Snack uses Personal Tutoring deployment `AKfycbyT5… @8`; nested Mini App client uses Gateway deployment `AKfycbx9… @55`. Record the mapping in `mini-app/RELEASING.md`.
- [x] Publish the isolated Grammar Snack save-queue fix through a focused PR to `main` (#1); do not merge the dirty supplementary branch wholesale.
- [x] Publish `01g — Grammar Snack` frontend to GitHub Pages and confirm the public page plus its 10-variant content bank return HTTP 200.
- [x] Confirm Grammar Snack immediate error-event route is present in Personal Tutoring v7; update the same deployment to v8 with safe failure-category logging, preserving reminder and learner flows.
- [x] Fix the Grammar Snack frontend save race: serialize revision writes, merge server conflict state without rolling back local progress, and use unique error-event IDs. Regression tests cover rapid saves and conflict merges.
- [x] Publish the frontend save-queue fix to the authoritative GitHub Pages source and verify the public index, queue script, and app bundle return HTTP 200 with the fix.
- [ ] Verify an authenticated synthetic Grammar Snack wrong answer produces the detailed CheckUp event without changing Sonya's state. This requires a safe test identity/receipt; do not use Sonya's account or progress for the test.
- [ ] After publication, verify a synthetic theory error and a mastery error appear together in one editable CheckUp report. No learner account or state may be used.
- [ ] Add a privacy-bounded retention policy for append-only `Recovery` snapshots before long-term use; current local implementation saves complete accepted revisions in the private workbook.
- [x] Add a behavioral scheduler test with a real synthetic pending report row; the existing scheduler delivers it to the teacher target without sending a learner reminder.
- [ ] Decide whether pending report retries should continue while learner reminders are paused; current behavior stops the scheduler when reminders are paused, while the report remains pending for the next teacher load/save.
- [x] Confirm the live-progress report implementation already exists in the deployed backend source; a real synthetic partial-save/edit receipt remains unverified.
- [ ] Publish the still-local Street Style frontend updates to GitHub Pages through a reviewed integration of the complete feature branch.
- [ ] Complete one synthetic, non-learner completion after publication and confirm the private tutor report shows: task, learner's wrong attempt, and correct answer. Do not send a test message to the learner or alter her saved progress.
- [ ] Ask Sonya to reopen `@CheckUphw_bot → My learning` on the same device, wait for `Progress saved.`, then read-only verify her Day 1 in `Progress`/`Results`. Do not reset or ask her to repeat the task.

## Now — mascot assets only

- [x] Regenerate the iPhone-first Halloween boot asset using the approved authentic ginger Miso reference. The accepted local asset passed identity QA; white-coat and embedded-text candidates are rejected. Still required: GitHub Pages publication and a real iPhone 14 Telegram-WebView check.
- [ ] Approve Miso's concept: original bipedal ginger Munchkin, short legs, no human hands.
- [ ] Confirm Higgsfield commercial-use/credit availability and create the canonical reference pack.
- [ ] Produce and retain the v1 emotion set with prompt, rights and QA records.

## Paused — requires an explicit decision

- [ ] Integrate mascot assets into UI/Telegram only after the emotion library is approved.

## Later — platform checks

- [ ] Verify Apps Script version/URL, signed-`initData` E2E and a real scheduled-delivery receipt.
- [ ] Add the next Go Getter 4 mission; expand semantic Graphify indexing when a provider is configured.
