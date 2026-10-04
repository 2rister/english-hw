# Personal tutoring Mini App

Public catalog: https://2rister.github.io/english-hw/tutoring/
Bot: @CheckUphw_bot. My learning menu opens the catalog. Registry: published street-style-week/tutoring.js. Current unit: Street Style, seven-day authored content unchanged.

Private server source: backend/TutoringHomework.js and backend/TutoringBridge.html. The live Apps Script deployment extends pristine v38 with a doGet bridge dispatcher; unrelated staged migration code was not deployed. Original school doPost and Telegram sender are preserved.

Storage: a new owner-only workbook created by the server, ID in TUTORING_SHEET_ID. Progress rows keyed by verified Telegram ID + unit with optimistic revisions. Results include written text, wrong retries and hint recovery; writing is TEACHER_PENDING, speaking SELF_REPORTED. Practice completion is not an exam grade. Private reports target TUTORING_TEACHER_CHAT_ID, bound from signed @nebutton login. They never use TG_CHAT_ID or PENDING. Failed private delivery remains pending in the Results tab and retries on the learner's next save or the teacher's next verified app login. The bound teacher ID cannot be replaced merely by another account adopting the same username.

Telegram login: raw initData HMAC with existing bot token, strict freshness and per-request verification. Bridge postMessage restricted to GitHub origin and a per-load nonce. No tokens or private results in public assets. Normal browser mode remains local-only and retains its original storage key. Telegram uses a separate per-user cache. Offline unsynced work is retained and revision conflicts halt automatic overwrite.

Run `node _hw-engine/tutoring/backend.test.cjs`, `node _hw-engine/tutoring/catalog.e2e.cjs`. Live signed synthetic roundtrip: TUTORING_LIVE_TEST=1; creates only an empty test progress record and sends no messages. Original day-1 regression remains in the quest tests folder. Node syntax checks apply to the modified scripts.

Future units: add catalog metadata with relative href, implement the unit page, register its ID in TUTORING_UNITS and route its client requests to that ID. Content and learner progress are separate from catalog layout.

### Reminders
Owner-run enableTutoringReminders installs only the sendTutoringReminder trigger; pauseTutoringReminders disables it and removes only that trigger. Daily Moscow19:00 window, expected first poll around19:00–19:15 (scheduler delays possible). One accepted message/date, skip on actual practice or complete unit. Messages target only TUTORING_LEARNER_ID and never shared school/teacher destination. Deployment manifest requires script.scriptapp scope in addition to existing scopes.

### Event notifications (v45)
Seven reasons: start, continue, return_after_break, day_complete, unit_complete, feedback, new_unit. Evening reminders select start/continue/return_after_break; >=2 calendar days since practice or enrollment selects return, replacing the usual reminder. Day/week congratulations queue only on new completion for the enrolled verified learner; week completion replaces the final day message.
Notifications sheet deduplicates events and tracks delivery. Saves flush learner events; existing quarter-hour timer retries queued events08:00–21:59 Moscow. Immediate completion follows learner action even outside these retry hours. enableTutoringNotifications enables event policy and existing reminder timer; pauseTutoringNotifications stops both.
Feedback/new-unit are owner-driven. Set TUTORING_READY_FEEDBACK to JSON {"id":"unique-feedback-id","text":"actual approved feedback"}, then run notifyTutoringFeedback. Set TUTORING_READY_UNIT to {"id":"unique-unit-id","title":"actual title","url":"https://2rister.github.io/english-hw/published-slug/"}, then run notifyTutoringNewUnit after adding the page, catalog entry and backend unit support. A missing ready payload sends nothing; new-unit URL must be a published HTTPS page on the homework host. Repeat event IDs do not resend. No announcements are fabricated on activation.
