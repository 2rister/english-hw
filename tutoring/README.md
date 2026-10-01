# My Learning — personal tutoring Mini App

The catalog is `/english-hw/tutoring/`. The available unit is Street Style; its existing seven-day content is reused from `../street-style-week/`.

Add future units to `window.TUTORING.units` in `../street-style-week/tutoring.js`: `id`, `title`, `subtitle`, `description`, `available`, and a relative `href` for another unit page. Only available units are interactive.

The backend validates Telegram `initData` and keys progress by Telegram ID and unit. Tutoring snapshots and answer evidence use a separate private workbook. Tutor messages use `TUTORING_TEACHER_CHAT_ID`, never the shared eHW sender or queue. The teacher destination is bound from the verified teacher login.

The original standalone Street Style URL retains browser storage. Telegram uses a separate per-user cache; browser work is not automatically attributed to a signed-in person. Audio stays on-device. Written answers and drafts are stored; writing and speaking remain teacher-reviewed/self-reported, not exam grades.

Backend source and tests are in the private Teaching checkout `_hw-engine/tutoring/`; credentials and pupil data are not published here.
