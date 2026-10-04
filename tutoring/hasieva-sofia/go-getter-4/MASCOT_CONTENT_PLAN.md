# Mascot Content Plan — Go Getter 4 Mini App

## Purpose and decision

Create an original, consistent mascot system for Sofia's private Go Getter 4 Mini App: a chubby ginger Munchkin cat. The mascot is an emotional learning cue and backstage creative companion, not a second game, teacher, evaluator, or persistence mechanism.

It must preserve the existing Street Style Quest identity: editorial backstage-fashion call sheet, paper/ink/acid-green palette, concise English, one clear next action, seven authored missions, local-first audio and progress boundaries.

This document is a plan only. It authorizes no image generation, UI integration, notification changes, or deployment.

## Non-negotiable design constraints

- Original character and original asset library. Do not use Duolingo/Pixar names, images, screenshots, poses, copy, colour roles, or character references in prompts or source material.
- Production language: `warm, original stylized 3D animated character`; never `in the style of Pixar`.
- The cat never shames, threatens, guilt-trips, evaluates the learner as a person, claims to hear local audio, claims a tutor reviewed work, or claims data was saved before a verified save result.
- The question, answer choices/input, feedback, and primary action remain more prominent than the mascot.
- One mascot instance at most per viewport. No mascot in the active reading, choosing, typing, or speaking area.
- Static local assets only in v1. No runtime image generation, third-party image URLs, auto-loop video, sound, or data-collection expansion.

## Character bible v1 — approval gate P0

### Working concept

Working name: **Miso** (hold as `Quest Cat` in student-facing copy until the name is approved).

Role: a quiet backstage creative companion. Miso notices useful language details, supports one small next action, and treats a mistake as information. He is teen-respectful, observant, calmly funny, and fashion-aware without judging appearance.

### Canonical visual traits

- Upright, bipedal character stance: Miso stands on two short hind legs as legs, with the front paws free to gesture, hold a prop, or rest naturally. He is never depicted as a four-legged pet in product-facing art.
- Compact round ginger Munchkin body; visibly short legs; large readable head and a soft curved tail.
- Warm orange tabby fur, cream muzzle/chest, three restrained forehead stripes, ringed tail, amber-green eyes, dark-rose nose, short white whiskers.
- Four approved invariant traits must be selected from the above after the concept round and recorded in the final bible. They are the identity test for every later asset.
- Soft toy-like fur, warm studio light, clean silhouette, clear expressive ears and tail. The two-legged silhouette must remain readable at 64 px.
- Neutral base: no clothing. A single small cream collar/tag is permitted. Street Style variants add one prop only: a garment tag, notebook, headphones, patch, scarf, or styling tape.
- No text, letters, numbers, logos, watermarks, photorealism, human-like hands, extra limbs, or cropped anatomy unless a crop is expressly approved.

### Character and copy boundaries

| Attribute | In-product behaviour | Prohibited behaviour |
| --- | --- | --- |
| Curious | invites the next mission or clue | distracts inside a question card |
| Calmly persistent | offers a small retry | counts absence, pressures a streak |
| Precise | names a linguistic next step | generic praise or vague failure |
| Privacy-aware | reinforces true device-only audio or confirmed save | says it listened, read, sent, or reviewed when it did not |
| Fashion-aware | uses sparing words such as `detail`, `fit`, `patch`, `route` | judges appearance, gender, bodies, or style choices |

### P0 proof of done

1. One-page `Mascot Bible v1.0` is approved before state production.
2. The bible records name decision, role, palette, four invariants, allowed props, forbidden motifs, and a 64 px silhouette check.
3. A reviewer can identify the character without any branded comparison.
4. All future prompts refer to this description and approved references only.

## Asset-production pipeline — approval gate P1

### 1. Canonical reference pack

Do not create the emotional library first. Select one stable character and then make a master pack:

| Pack | Minimum content | Acceptance test |
| --- | --- | --- |
| `01-turnaround` | front, 3/4, profile, back, seated | anatomy and markings match |
| `02-expression` | neutral, curious, thinking, proud, gentle-oops, celebration | ears, tail and eyes read each state |
| `03-silhouette` | 5–6 poses on plain background | recognisable at 64 px |
| `04-material-palette` | fur, cream zones, eyes, nose, lighting notes | colour drift is visible to QA |
| `05-ui-scale-proof` | 64, 96, 144, 240 px placements | no clutter or unreadable emotion |

### 2. Higgsfield workflow

1. Generate 12–20 neutral 3/4 concept portraits from the character bible, without borrowed brand/style names.
2. Select one canonical direction by identity stability and small-scale readability—not by spectacle.
3. Produce turnarounds and expressions using the canonical references.
4. Create and record the applicable Higgsfield Character/Soul ID only after confirming the selected account and tool permit the intended reference workflow for an AI-created character.
5. Build a separate internal moodboard from original, non-character style material: soft 3D light, toy-like fur, paper surfaces, restrained backstage details. Do not add Duo or other third-party characters.
6. Generate each production asset with the same reference hierarchy: Character/Soul ID → canonical image → moodboard → state/pose brief → UI crop and palette constraints.
7. Use Popcorn only for related 4–8 frame concept variations when useful. It is not a substitute for independent identity QA.

### 3. Prompt registry

Every candidate and approved asset records:

```text
asset ID · UI state · canonical reference IDs · Character/Soul ID · moodboard version
prompt · negative prompt · model · ratio · date · generator workspace · selector · QA status
```

Base character lock (to be finalized only after P0 approval):

```text
Original LearnCore mascot: chubby ginger Munchkin cat with very short legs,
round body, warm orange tabby fur, cream muzzle and chest, three subtle forehead
stripes, ringed tail, amber-green eyes, dark rose nose, white whiskers.
Friendly, clever, quietly encouraging. Original stylized 3D animated character,
soft toy-like fur, clean silhouette, gentle studio lighting. No text or logo.
```

Each asset then adds a short state, pose, composition, background, and UI-role block.

### 4. Rights and safety register

For every approved asset, retain generation date, account/workspace, source references, plan/terms snapshot or URL, prompt owner, human selection/editing record, and any required school AI-use disclosure. Do not upload Sofia's photos, Telegram identity, work, recordings, or other private learner data as references.

### P1 proof of done

- At least two approved canonical references exist: neutral 3/4 and full-body.
- No asset is generated without canonical references after approval.
- Every approved state passes: same identity, no borrowed brand traits, upright two-hind-leg stance with visible Munchkin anatomy, no artefact/text/logo, emotion legible at 96 px, and no CTA overlap.
- Production score: at least 90/100, with no failed mandatory gate. Score weights: identity 35, emotion 20, small-scale readability 15, anatomy/cleanliness 15, UI fit 10, originality screen 5.

## Content library and state registry — P1/P2

### v1 priority set: make eight before integrating any UI

| ID | State | Existing learning moment | Copy direction | Must not appear |
| --- | --- | --- | --- | --- |
| `MAS-HOME-01` | curious welcome | home/next mission | `Your next fitting is ready.` | inside day cards |
| `MAS-THINK-01` | thinking together | hint opened | `Use this clue, then choose.` | answer options |
| `MAS-CORRECT-01` | proud spark | correct answer | `That structure fits.` | for an unverified answer |
| `MAS-TRY-01` | gentle oops | first incorrect attempt | `Not yet. Check the verb form.` | repeated wrong attempts as pressure |
| `MAS-COMEBACK-01` | recovery proud | correct after hint/retry | `You recovered it.` | before an answer is checked |
| `MAS-WRITE-01` | writing companion | writing checklist | `Draft first. Polish next.` | implying automatic marking |
| `MAS-VOICE-01` | calm voice coach | Voice Booth ready | `Record, listen, improve.` | implying audio upload/listening |
| `MAS-DAY-01` | patch celebration | day complete at existing mastery threshold | `Today’s patch is earned.` | before the real completion result |

### v1.1 expansion

| ID | State | Existing event | Rule |
| --- | --- | --- | --- |
| `MAS-RETURN-01` | warm return | home after a break | no guilt, specific next step |
| `MAS-SAVE-01` | calm keeper | confirmed save | small status mark only |
| `MAS-ROUTE-01` | supportive practice | day complete below threshold | reinforce retry, no red/shame scene |
| `MAS-WEEK-01` | full celebration | all seven days complete | show after primary summary action |
| `MAS-REMINDER-01` | portrait crop | authorized private reminder | text-first until delivery QA is proven |

### Copy microtone

- Student-facing copy remains English, A2–B1, 3–9 words by default.
- One action or one verified observation per message.
- Prefer `spot`, `check`, `choose`, `say`, `build`, `repeat`, `notice`.
- Error feedback names a next move; it never judges the learner.
- At most one exclamation mark, only in celebration. None in error, privacy, save, or persistence messages.
- Fashion language is garnish, never required vocabulary.

Examples:

| Moment | Use | Avoid |
| --- | --- | --- |
| correct | `That structure fits.` | `You’re a genius!` |
| error | `Not yet. Check the word’s job.` | `Wrong again.` |
| hint | `Start with the subject.` | `Here’s the answer.` |
| return | `Your next step is waiting.` | `You abandoned your quest.` |
| voice | `Record, listen, improve.` | `Miso listened to you.` |

## Integration plan — P2

### Placement rules

1. Home and catalog: one small neutral/welcome image beside the next actionable mission.
2. Mission introduction: optional themed crop in the header, never larger than the mission title/action hierarchy.
3. Questions: no character inside MC/type/writing/speaking working area. Feedback/hint may use a 96–128 px reaction beside text.
4. Completion: full-body art permitted only after the actionable summary and completion result exist.
5. Persistence/auth/conflict failures: plain factual text first; no mascot.
6. Telegram events: text-first. Add art only after the event type, recipient isolation, and real delivery are verified.

### One-screen pilot

Integrate only five moments before commissioning the full set:

1. home welcome;
2. first incorrect answer;
3. hint opened;
4. correct after recovery;
5. day completion.

The pilot validates scale, copy, mood, performance, and learning focus. It changes neither the seven authored days nor scoring, persistence, audio storage, backend schema, or notification schedule.

### Accessibility and performance gates

- Decorative art is `alt=""`/hidden from assistive technology. Meaningful state feedback is in DOM text/status, not only image alt.
- All semantic success/error meaning survives when imagery is disabled.
- Respect `prefers-reduced-motion`; v1 uses static art. Any later motion is limited to 160–220 ms transform/opacity and has a static equivalent.
- No sound by default.
- At 390×844, primary text and 44 px action targets remain visible and the image cannot cause layout shift in the question zone.
- Use local WebP with alpha for UI (512 px normally; 768–1024 px completion); retain PNG source/fallback. Never use live generator URLs.
- Check normal, reduced-motion, and Telegram WebView layouts.

## Content operations and governance — P3

### Repository structure

```text
mini-app/assets/mascot/
  README.md
  character-bible/
  references/approved/
  references/rejected/
  moodboard/
  source/
  ui/webp/
  ui/png/
  manifests/mascot-assets.v1.json
  manifests/prompt-registry.v1.json
  manifests/rights-register.v1.md
```

Suggested file name:

```text
lc-mascot-ginger-munchkin-[state]-[pose]-[view]-v01.webp
```

Examples: `lc-mascot-ginger-munchkin-gentle-oops-sit-3q-v01.webp` and `lc-mascot-ginger-munchkin-day-complete-patch-full-v01.webp`.

### Changelog and backlog policy

- `CHANGELOG.md`: approved bible version, added/replaced asset IDs, shipped UI placements, completed QA, and verified live delivery only.
- `BACKLOG.md`: unapproved states, production/rights checks, unrun QA, and future module variants.
- Do not record a generation, model test, or accepted job as published or learner-delivered without the corresponding UI/live verification.

### Learning-value evaluation

After one usable week, compare against an available baseline and record only aggregate/authorized observation:

- distributed Day 1–7 completion/return rate;
- median retries and hint recoveries;
- first-try versus post-hint accuracy;
- writing checklist and Voice Booth completion;
- time per mission (must remain close to the 20–25 minute design target);
- tutor/learner qualitative verdict: helpful, neutral, or childish/distracting.

## Release sequence

1. **P0 — approve the bible:** final name decision, visual invariants, restrictions, and 6–12 concept options.
2. **P1 — lock identity:** canonical reference pack, Character/Soul workflow confirmation, moodboard, and eight v1 assets.
3. **P1 QA — approve assets:** identity/originality/scale/rights gates and manifest records.
4. **P2 — pilot integration:** five states only, no curriculum/backend/notification scope changes.
5. **P2 QA:** desktop and 390×844, reduced motion, screen reader, asset load/layout stability, existing mission tests, and a learner pilot.
6. **P3 — expand with evidence:** writing, voice, return, save, full-week, and approved private reminders only if the pilot supports expansion.

## Definition of done for the first mascot release

- An approved original Miso/Quest Cat bible and canonical reference pack exist.
- The eight v1 asset states have prompt/rights/QA records and local optimised exports.
- The five-state pilot preserves all existing curriculum, persistence, privacy, and learning interactions.
- Existing automated checks pass; visual/accessibility QA covers home, wrong/hint/recovery, writing, voice, low/high completion, return, and reduced motion.
- A short learner/tutor pilot result is recorded before expanding the library.
- `CHANGELOG.md` contains only proven release facts; `BACKLOG.md` contains remaining work.
