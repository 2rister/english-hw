# Tutoring Mini App changelog

## 2026-10-01 — Personal tutoring Telegram Mini App

- Published the My Learning catalog at https://2rister.github.io/english-hw/tutoring/ with one available Street Style unit. Future units are registry entries and separate pages.
- Existing @CheckUphw_bot My learning menu configured. Public commits 7850f5b and 6390ab5; existing backend endpoint updated to v41 from pristine v38. School submission and eHW sender paths preserved.
- Added server-verified Telegram identity, separate owner-only Progress/Results workbook, per-user/unit snapshots, revision conflict protection, private-only report routing and retryable delivery. The teacher destination binds once from a verified @nebuttton Mini App login; it is not bound yet and actual personal Telegram delivery is unverified.
- Persisted writing drafts/text, wrong retries and hint recovery. Writing remains TEACHER_PENDING and speech SELF_REPORTED. Accepted answers persist before Continue, preventing answer loss/repeated XP on reload.
- Verified JavaScript syntax; signed identity/tampering/expiry/duplicate field/user isolation/revision conflict/delivery dedupe/teacher-ID immutability/pending retry mocks; existing Day 1 regression; catalog navigation, writing draft reload, answer-before-Continue reload and widths 375/390/844/1024. Live signed synthetic login saved to Sheets and restored XP in a fresh browser context; no completed days or real Telegram messages in the live test.
- Incremental source graph updated: 155 nodes /181 edges, four changed files. CSS was unclassified; document/image extraction and community-label refresh remain outside this code-only update.

## 2026-10-01 — Native Telegram loading fix
- Published e10713f: ready() runs before auth/UUID/network; secure UUID fallback; vendored official Telegram SDK fetched 2026-10-01; immediate catalog while restore is protected from edits; Telegram launch hash opens catalog.
- Backend v41 unchanged. Observed recent live tutoringCall executions completed in 1.7–4.1 seconds with no failed statuses; native screenshot showed Telegram splash. Exact client failure is not proved by backend logs.
- startup.e2e.cjs PASS: empty auth, missing randomUUID, blocked Telegram CDN, blocked backend; web_app_ready emitted, catalog visible, bounded status error and zero JS exceptions. Catalog regression PASS. Native Telegram retest pending.

## 2026-10-01 — Verified private completion delivery
- Authorized synthetic completion submitted through public Mini App TUTORING bridge to live backend: saved true, revision 8, initial delivery pending. No real learner progress modified.
- Owner getChat verified latest real visitor as @nebutton; previously supplied @nebuttton was a typo, preventing automatic binding. Corrected verified-username guard; immutable positive private-ID binding retained.
- Owner verification bound that exact private account and flushed pending synthetic result; Telegram sendMessage accepted and private Results status sent at 22:24:53 Europe/Moscow. Test report explicitly labelled TEST. eHW route not used.
- Backend regression PASS. Client receipt/read still requires human observation; API acceptance confirmed.
- Corrected core sources published as live backend v42; temporary owner diagnostic removed by authoritative six-file upload.
- Fresh published Mini App retest against v42 returned saved true, delivery sent, revision 10; repeated same completion key without duplicate report. Settings-page property list appears cached; live API confirms destination remains active.

## 2026-10-01 — Private learner account registration
- Backend v43: owner-configured learner username and display name; verified Mini App login binds immutable positive learner ID. Known visits can be matched with Telegram getChat. Learner display name in reports follows that ID even after username change.
- Backend tests PASS: other handles cannot bind; verified handle binds; different ID with same handle rejected; renamed handle preserves profile; teacher destination and school channel unchanged.
- Owner-run configureTutoringLearner returned profileConfigured true, learnerReady true, teacherReady true at 22:30:05 Europe/Moscow; existing verified private visitor matched, no learner progress changed or messages sent.

## 2026-10-01 — B1 learner reminders
- Backend v44 published. Owner enabled a single sendTutoringReminder time-driven trigger (every15minutes, guarded to 19:00–19:29 Europe/Moscow); live setup log enabled true / triggerCount 1 at22:49:11. First expected message 2026-10-02 around19:00 if no practice that date.
- Rotating light-humour B1 English messages, earliest unfinished day, continuation wording, direct Street Style Telegram web_app button. Positive verified learner ID only; private teacher destination/eHW untouched.
- Server observes changes to answer/draft day state instead of login/save; practising that Moscow date suppresses message. Completed seven-day route stops notifications; accepted send marks date under script lock; failed send can retry within evening window.
- reminders.test.cjs and backend.test.cjs PASS: schedule window, no duplicate, complete route, practice suppression, idle login, retry, private target, button, idempotent install, pause; prior HMAC/isolation/delivery tests retained. Initial reminder test lacked fake bot token; fixture corrected.
- No live learner notification sent during setup (outside evening window). Scheduled real delivery not yet observed.
- Manifest now additionally requests script.scriptapp for owner trigger installation. Existing web-app deployment ID unchanged.
- Trigger page independently shows exactly one time-driven sendTutoringReminder trigger. Final tests rerun PASS from correct private backend cwd.

## 2026-10-01 — Distinct notifications v45
- Published backend v45: seven event reasons, B1 light-humour templates; progress-aware start/continue/return after two calendar days. Evening schedule retained, return notification replaces usual prompt.
- New completion queues private learner congratulations; week completion produces one weekly event rather than day+week. Events deduped by learner/day/type; Notifications private sheet stores pending/sent, retries by same server timer during08:00–21:59 Moscow. Notification error cannot reject an acknowledged progress save.
- Owner-only ready-feedback and real-published-unit announcements validate actual payload; absent content sends nothing. Neither announcements nor retrospective completion messages sent during activation. Owner all-notification pause provided.
- notifications.test.cjs/backend.test.cjs/reminders.test.cjs PASS: same-event save/retry, private routing, final-week dedupe, downtime retry, absent announcements, actual-content validation, start/continue/inactivity, prior auth/revision/isolation and practice suppression. New actual event receipt remains unobserved.
- Live owner activation at23:02:16 Moscow confirmed notificationsEnabled true / types7 / retroactiveMessages false and existingtriggerCount1.
