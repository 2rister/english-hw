# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a Year 7 learner studying English at A2 to B1 level in weekly one-to-one tutoring. She uses the homework mainly on a smartphone between lessons.

## Product Purpose

Street Style Quest turns one week of vocabulary, Use of English, writing, and speaking revision into seven short daily missions. Success means that the learner returns across the week, retrieves target language without translation-only dependence, and can use it aloud and in writing.

## Positioning

The quest combines spaced retrieval, immediate hints, production tasks, and a private on-device voice booth in one continuous weekly route. It is not a points-only quiz: recognition leads to spelling, writing, and spoken retrieval.

## Operating Context

The learner completes one 20 to 25 minute mission per day on a phone. Progress and recordings stay on the device. A tutor reviews the copied weekly summary and follows up orally in the next lesson.

## Capabilities and Constraints

- Preserve all seven authored days, 81 source questions, daily memory sprints, XP, badges, hints, writing checks, voice recording, and localStorage progress.
- Keep the project as static HTML, CSS, and JavaScript hosted at the existing GitHub Pages route.
- The interface must remain usable at 390 by 844 pixels and without an account.
- Student-facing copy stays in English.
- No uploaded audio and no fabricated server-side reporting.

## Brand Commitments

The product name is Street Style Quest. Its tone is direct, encouraging, age-respectful, and fashion-aware. It should feel designed for a teenager, not for a young child and not like a generic school dashboard.

## Evidence on Hand

- Authored curriculum and question set: `content.js`
- Working interaction and persistence logic: `app.js`
- Mobile end-to-end test: `tests/weekly-quest.e2e.cjs`
- Existing public route: `https://2rister.github.io/english-hw/street-style-week/`

## Product Principles

1. One clear next action is more important than showing every feature at once.
2. Recognition must lead to productive language use.
3. Progress should feel earned, visible, and recoverable after mistakes.
4. Fashion gives the experience its cultural vocabulary, while learning remains the task.
5. Privacy claims must match the actual local-only implementation.

## Accessibility & Inclusion

Touch targets must be at least 44 pixels, focus must be visible, text must meet WCAG AA contrast, and reduced-motion preferences must be respected.
