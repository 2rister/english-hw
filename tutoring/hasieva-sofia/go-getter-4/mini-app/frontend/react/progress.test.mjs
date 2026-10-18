import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress, weeklyItems, buildItems, reviewErrors, freshState } from "./progress.mjs";
const data = { days: [{ id: "day1", questions: [{ q: "Q1", type: "mc", a: "desk" }, { q: "Q2", type: "writing" }] }, { id: "day2", questions: [{ q: "Q3", type: "type", a: "chair" }] }] };
test("merge never loses a completed day, best score, runs, drafts, hints or badges", () => {
  const remote = { xp: 80, badges: ["a"], hintRecoveries: 2, days: { day1: { complete: true, score: 100, index: 3, answers: [{ q: "Q1", correct: true, wrong: ["table"] }], drafts: { 2: "server writing" }, runs: [{ at: "2026-10-01", score: 100 }] } } };
  const local = { xp: 30, badges: ["b"], hintRecoveries: 1, days: { day1: { complete: false, index: 1, answers: [{ q: "Q2", correct: false, wrong: ["desk"] }], drafts: { 1: "local writing" }, runs: [{ at: "2026-10-02", score: 50 }] }, day2: { index: 1, seen: ["Q3"] } } };
  const merged = mergeProgress(remote, local);
  assert.equal(merged.days.day1.complete, true);
  assert.equal(merged.days.day1.score, 100);
  assert.equal(merged.days.day1.runs.length, 2);
  assert.equal(merged.days.day1.answers.length, 2);
  assert.equal(merged.days.day1.drafts[1], "local writing");
  assert.equal(merged.days.day1.drafts[2], "server writing");
  assert.deepEqual(new Set(merged.badges), /* @__PURE__ */ new Set(["a", "b"]));
  assert.equal(merged.xp, 80);
  assert.equal(merged.hintRecoveries, 2);
  assert.equal(merged.days.day2.index, 1);
  assert.equal(merged.days.day1.runs.length, mergeProgress(merged, merged).days.day1.runs.length);
});
test("progress includes evidence and completed questions but never exceeds content count", () => {
  const s = freshState();
  s.days.day1 = { answers: [{ q: "Q1" }, { q: "Q1" }], seen: ["Q2"] };
  assert.deepEqual(weeklyItems(data, s, { day2: 9 }), { done: 3, total: 3, pct: 100 });
});
test("memory sprint and error explanations retain original content IDs", () => {
  assert.equal(buildItems(data, 2)[1].q, "Memory sprint · Q1");
  const state = freshState();
  state.days.day2 = { answers: [{ q: "Memory sprint · Q1", wrong: ["table"], expected: "desk" }] };
  assert.deepEqual(reviewErrors(data, state, 2)[0], { q: "Q1", wrong: ["table"], expected: "desk", hint: [] });
});
