# Grammar Snack 01 — QA Report

## Scope and pass result

Audited: `CONTENT_BANK.md`, ten final-test variants for Present Simple vs Present Continuous. Source mechanics followed: forms, uses, negatives, questions, contrast, non-progressive/state verbs, revision-style correction and mixed context. Wording and examples are original; no Oxford exercise text is reproduced.

**Verdict: PASS for content-bank integration.** All 200 items are closed-response or exact sentence-production items with one intended standard-English answer.

## Blueprint verification

| Variant | total | meaning | affirmative + spelling | negative | yes/no + Wh questions | error correction | mixed B1 context | result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 01 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 02 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 03 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 04 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 05 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 06 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 07 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 08 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 09 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |
| 10 | 20 | 4 | 3 | 3 | 4 | 3 | 3 | PASS |

Automated table scan found 200 task rows and no duplicated **exact prompt** strings. Item numbers are 1–20 in every variant and each variant follows the same type order.

## Pedagogical coverage

| Required point | Coverage | QA finding |
|---|---|---|
| Habit/fact/timetable vs action now/temporary situation | Every variant | Present in meaning and mixed-context slots; not only in a single-choice format. |
| Third-person spelling and `-ing` spelling | Every variant | Includes `-ies`, `-es`, doubling and deletion/replacement patterns: studies, carries, tries, washes, fixes, running, sitting, shopping, lying, tying, beginning. |
| Affirmative, negative and question forms | Every variant | At least three affirmative, three negative and four question items; question set contains both yes/no and Wh forms. |
| Mixed sentences | Every variant | Slots 18–20 contrast a routine/state with a temporary/current action in the same context. |
| Stative/non-progressive verbs | Every variant | Uses know, think (opinion), need, want, have (possession), understand, believe, remember, belong, hear, seem, recognize, own, contain. No item requires a nonstandard continuous form. |
| `always` + Present Continuous | Every variant | One controlled item per variant uses a time limiter such as `this week`, `these days` or `this term` plus an irritation context, so the intended meaning is clear. |
| Current arrangements | Multiple variants | `tonight`, `this weekend`, `this month`, and near departure are used only with explicit current-plan context. |

## Ambiguity and key audit

1. **State verbs are context-labelled.** `think`, `have`, `taste`, `see` and `hear` can have action meanings in other sentences. Each item fixes the meaning explicitly: opinion, possession, describing food, understanding a point, or passive hearing. That makes the Simple answer unambiguous.
2. **`Always` is controlled.** Ordinary “always” can take Present Simple. These items add a short temporary time frame and a complaint signal (`You ...!`, `this week`, `these days`) to test the B1 expressive use of Present Continuous rather than a neutral habit.
3. **Questions have one valid auxiliary.** Prompts distinguish routines (`usually`, `every day`, timetable) from ongoing situations (`now`, `at the moment`, `this week`). Production keys accept capitalization and terminal-punctuation differences only; they should not accept a different tense.
4. **Correction items have one target repair.** The source sentence contains one intended tense/form error. A future app should render the expected key or use a normalized matcher, not an unconstrained “write anything” grader.
5. **No identical prompt string repeats.** Repeated mechanics are deliberate but use different people, verbs, contexts and spelling patterns. This supports re-testing below 90% without replaying the same test.

## Integration safeguards

- Store `variantId`, `itemId`, `type`, learner response, expected answer, and feedback with every submitted response. Those fields are sufficient to send an immediate CheckUp report with the exact sentence context, the learner’s choice, the correct form, and the A2-English explanation.
- Score exactly one point per item. Passing threshold is `18 / 20` (90%). On a non-pass, choose an unseen variant first; do not reuse the same variant until all nine alternatives have been offered.
- Before production release, run a browser/device pass for answer normalization and report delivery. This audit validates the content data; it does not claim that Telegram delivery is already wired or live.
