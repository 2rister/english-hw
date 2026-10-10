# Backlog — Хасиева Софья · Go Getter 4 Mini App

## Now — verify the published Miso interaction

- [x] Publish the catalog Miso interaction to GitHub Pages: base colour alignment, expressive reaction and the same transition played in reverse for the return to the book pose. Public cache-busted catalog route is available at `tutoring/?v=miso-catalog-motion-v5-20261010#catalog`.
- [x] Re-pair the catalog Miso frames after measuring the mismatch: the base is now `miso-studying-book.png`, from the same render batch as the three reactions, so a tap no longer resizes or relights the cat; the `brightness/saturate` hack is removed and the frames ship as 840px WebP derivatives. Table and rules: `street-style-week/assets/mascot/study/ASSET_NOTES.md`.
- [x] Build the reel so a tap performs all three expressions in sequence (surprise → side-eye → wink, held, then the same path back) and add the idle breath. Layer model, timings and the `offset: 1` rule are recorded in `ASSET_NOTES.md` under Motion.
- [ ] On Sonya's actual iPhone 14 and in Telegram WebView, open `tutoring/?v=miso-motion-v7-20261010#catalog` and confirm: the reel reads as a performance rather than a flicker, the phases are not too slow on a phone, the idle breath is pleasant rather than distracting, the press feedback feels immediate, the derivative frames look sharp, and no cached v5/v6 assets appear. This must be observed on-device; browser verification is not a substitute.
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
- [x] Published the Street Style app to GitHub Pages as a series of focused, verified commits (v6–v14) and synced the working tree's app files with `main`, so the knowledge graph and the scout index now describe what Pages actually serves. Remaining local drift is limited to the older clients (`mini-app/frontend`, `street-style-quest`) and unrelated in-flight docs.
- [ ] Complete one synthetic, non-learner completion after publication and confirm the private tutor report shows: task, learner's wrong attempt, and correct answer. Do not send a test message to the learner or alter her saved progress.
- [ ] Ask Sonya to reopen `@CheckUphw_bot → My learning` on the same device, wait for `Progress saved.`, then read-only verify her Day 1 in `Progress`/`Results`. Do not reset or ask her to repeat the task.

## Housekeeping — notes for the next session

- [ ] The repository's root `.clasp.json` points at the school project (`1CqPdMU9sMh78mGPusCuGOdaC8k5-8qZlci8YiMMUA9mVfB4E06r5z4CO`), while the tutoring backend lives in `1K4jBheCLSH7LWVbN96pb2_Mytz6ThQbrs18-HkhMDANBgG_uIfpqS2Os`. The release script targets the right one; running `clasp` by hand from the wrong directory silently touches the other project.
- [x] Knowledge graph and scout index refreshed after v13. `graphify-out/` was rebuilt (78 files · 1224 nodes · 2103 edges · 92 communities, from working-tree commit `851bb41`) and `.project-knowledge/` hashes, inventory and last-update were regenerated with the nine changed files. Both are local-only (untracked, never published to Pages). Community labels still carry names from the earlier run — `graphify label` needs an LLM key, so refresh the wording from the assistant with `/graphify --update`.
- [ ] `mini-app/backend` release scripts require `rg` (ripgrep), which is not installed on this machine; the v12/v13 backend releases ran through a `grep` shim with identical fixed-string semantics. Run `brew install ripgrep` if the scripts should work unshimmed.

## Now — verify the sheet holds her work

- [x] Removed the lock-out: when the bridge is unreachable the catalog opens, the unit card stays enabled and answers are kept locally until a save gets through (first handshake now waits 8 s, not 20). What remains is the on-device receipt.

- [x] Browser preview: open `https://t.me/CheckUphw_bot?startapp=preview` once, copy the link the panel offers (`?preview=<token>`), and the same read-only view opens in Chrome for eight days; the token rotates daily, so re-copy it from Telegram when it expires. Token requests cannot read or write anything but the preview.
- [x] Tutor preview is a faithful mirror of her screens: `https://t.me/CheckUphw_bot?startapp=preview` (or `?preview=1`) opens the same Mini App on the learner's sheet row with her labels, her scores, her mistake review and a fitting that can be walked end to end — with every write suppressed (only the `preview` call is ever sent). Backend `preview` action published as Personal Tutoring @12 and gated to the bound tutor account.

- [ ] The clasp route to the workbook is dead (Sheets API disabled in clasp's own GCP project and no permission to enable it; Drive export and `clasp run` both refused). Export `Progress`/`Results`/`Recovery` as CSV, or read it with an OAuth client from a project where the Sheets API is enabled, so the sheet can be read read-only and checked for day 4 (`day4`, Gap Detective: completion time, score, and whether a later revision dropped it). Clasp is authenticated and the workbook is `1B5R_9oRqtYFGyqui-uDt9kVEDwqRJ7OaBVFpjbIJqj8`; the Sheets API call currently returns 403 "has not been used in project".
- [x] Fixed the client-side paths that could make finished work disappear: a re-run no longer un-completes a day (the day object is spread, not replaced), and a revision mismatch merges instead of refusing to restore.
- [ ] Confirm on-device that day 4 shows as complete again in the catalog after the next successful sync, and that its `Results` evidence carries both attempts with their times.

## Now — writes reach the tutor's sheet

- [x] Show every write to the sheet: save bar (queued → sending → confirmed/red), immediate write-through on a completed question, and a gate that sends learners to `@CheckUphw_bot` while `?qa=1` keeps the browser build for review.
- [x] Closed the wrong-answer gap: Street Style records a wrong attempt only inside `day.answers`, and the backend creates a `Results` row only when `day.answers.length > 0` — so a wrong attempt can stay invisible to the tutor until that question is later answered correctly, or forever if she closes the app. Grammar Snack already writes on the first wrong answer. Fixing it means deciding the shape of that record (update the question's entry in place, or add an explicit pending-attempt field the backend surfaces).
- [x] Fixed the `:pending` guard, observed while testing: if local work was never confirmed and the server revision moved, startup refuses to restore progress with "Newer progress exists on another device… contact your tutor", leaving the catalog at "0 of 7 days complete" and the unit card disabled. With the sheet as the source of truth this guard may need to merge and warn instead of refusing.

## Now — mascot assets only

- [x] Regenerate the iPhone-first Halloween boot asset using the approved authentic ginger Miso reference. The accepted local asset passed identity QA; white-coat and embedded-text candidates are rejected.
- [x] Publish the boot asset and fix its timing: the screen used to close before the 1.4 MB PNG had arrived, so the artwork was never seen on a cold mobile connection. It now ships a 102 KB 768px WebP derivative with the PNG master as fallback, and the close timer waits for the art (capped at 4 s). Table and rule: `street-style-week/assets/mascot/halloween/ASSET_NOTES.md`.
- [ ] On Sonya's actual iPhone 14 in Telegram WebView, open the app cold and confirm the boot screen shows the full artwork, that the headline still reads well where it lands under the notch or Telegram's header (the top inset is ignored there on purpose), that the button clears the home indicator, and that the 2 s auto-close after the art appears does not feel rushed. Only the bottom safe area is a real check now.
- [ ] Approve Miso's concept: original bipedal ginger Munchkin, short legs, no human hands.
- [ ] Confirm Higgsfield commercial-use/credit availability and create the canonical reference pack.
- [ ] Produce and retain the v1 emotion set with prompt, rights and QA records.

## Paused — requires an explicit decision

- [ ] Integrate mascot assets into UI/Telegram only after the emotion library is approved.

## Later — platform checks

- [ ] Verify Apps Script version/URL, signed-`initData` E2E and a real scheduled-delivery receipt.
- [ ] Add the next Go Getter 4 mission; expand semantic Graphify indexing when a provider is configured.
