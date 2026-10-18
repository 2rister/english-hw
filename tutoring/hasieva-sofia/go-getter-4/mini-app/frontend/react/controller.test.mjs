import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuestController } from "./controller.mjs";
const data = { days: [{ id: "day1", badge: "one", questions: [{ q: "Where?", type: "mc", options: ["desk", "table"], a: "desk", hint: ["Furniture"] }, { q: "Write", type: "writing", checks: ["Checked"], minWords: 2 }, { q: "Speak", type: "speaking", prompts: ["I spoke"] }] }], badges: [{ id: "one" }, { id: "week" }, { id: "comeback" }] };
const settle = () => new Promise((resolve) => setImmediate(resolve));
function setup({ authenticated = false, preview = false, stored = {}, call } = {}) {
  const map = new Map(Object.entries(stored)), timers = /* @__PURE__ */ new Map(), events = new EventTarget(), calls = [], statuses = [];
  let next = 0, writes = 0;
  const storage = { getItem: (key) => map.get(key) || null, setItem(key, v) {
    writes++;
    map.set(key, v);
  }, removeItem: (key) => map.delete(key) };
  const location = { hash: "#day-1", catalogStart: false };
  const tutoring = { authenticated, userId: 123, preview, previewToken: preview ? "synthetic-preview" : null, units: [], saving() {
  }, setStatus: (t) => statuses.push(t), back() {
  }, async call(...args) {
    calls.push(args);
    return call ? call(...args) : args[0] === "save" ? { saved: true, revision: 2 } : { revision: 1, state: { xp: 20, days: {}, badges: [] } };
  } };
  const clock = { setTimeout(fn, ms) {
    const id = ++next;
    timers.set(id, { fn, ms });
    return id;
  }, clearTimeout: (id) => timers.delete(id) };
  const c = createQuestController({ data, tutoring, storage, location, events, clock });
  return { c, map, calls, statuses, location, events, timers, writes: () => writes };
}
test("legacy keys, wrong answer evidence, hint recovery and reload survive React", async () => {
  const x = setup();
  await x.c.start();
  x.c.answer("table");
  assert.equal(x.c.getSnapshot().state.days.day1.answers[0].correct, false);
  x.c.hint();
  x.c.answer("desk");
  const state = JSON.parse(x.map.get("street-style-quest-v1"));
  assert.equal(state.days.day1.index, 1);
  assert.equal(state.days.day1.answers[0].firstTry, false);
  assert.equal(state.days.day1.answers[0].wrong[0], "table");
  assert.equal(state.hintRecoveries, 1);
  const restored = setup({ stored: Object.fromEntries(x.map) });
  await restored.c.start();
  assert.equal(restored.c.getSnapshot().session.index, 1);
  x.c.dispose();
  restored.c.dispose();
});
test("drafts survive reload; writing validation and speaking status are explicit", async () => {
  const x = setup();
  await x.c.start();
  x.c.answer("desk");
  x.c.advance();
  x.c.draft("Synthetic writing");
  const restored = setup({ stored: Object.fromEntries(x.map) });
  await restored.c.start();
  assert.equal(restored.c.getSnapshot().state.days.day1.drafts[1], "Synthetic writing");
  restored.c.production("Synthetic writing", [false]);
  assert.equal(restored.c.getSnapshot().session.index, 1);
  restored.c.production("Synthetic writing", [true]);
  assert.equal(restored.c.getSnapshot().state.days.day1.answers.find((a) => a.production).status, "TEACHER_PENDING");
  restored.c.production("", [true]);
  assert.equal(restored.c.getSnapshot().state.days.day1.answers.find((a) => a.speaking).status, "SELF_REPORTED");
  x.c.dispose();
  restored.c.dispose();
});
test("preview remains read-only across answers, drafts, sync and online events", async () => {
  const x = setup({ authenticated: true, preview: true });
  await x.c.start();
  x.c.answer("table");
  x.c.answer("desk");
  x.c.advance();
  x.c.draft("Preview draft");
  x.events.dispatchEvent(new Event("online"));
  await x.c.syncProgress();
  assert.equal(x.writes(), 0);
  assert.deepEqual(x.calls.map((c) => c[0]), ["preview"]);
  x.c.dispose();
});
test("server conflict merges old completed history; acknowledged save clears only its pending marker", async () => {
  let saves = 0;
  const x = setup({ authenticated: true, stored: { "unrelated-homework": "private-other-app" }, call: async (action) => action === "save" ? ++saves === 1 ? { conflict: true } : { saved: true, revision: 4 } : action === "load" ? { revision: 3, state: { xp: 100, days: { day1: { complete: true, score: 100, index: 3, answers: [], runs: [{ at: "synthetic", score: 100 }] } }, badges: ["one"] } } : {} });
  await x.c.start();
  await x.c.syncProgress();
  await x.c.syncProgress();
  await settle();
  assert.equal(x.c.getSnapshot().state.days.day1.complete, true);
  assert.equal(x.map.has(x.c.key + ":pending"), false);
  assert.equal(x.map.get("unrelated-homework"), "private-other-app");
  const dump = x.calls.find((c) => c[0] === "deviceDump")[4];
  assert(!dump.includes("unrelated-homework"));
  assert(!dump.includes("private-other-app"));
  x.c.dispose();
});
test("failed save retains pending data, bounded retry and visible unconfirmed status", async () => {
  const x = setup({ authenticated: true, call: async (action) => {
    if (action === "save") throw Error("Synthetic offline");
    return { revision: 1, state: {} };
  } });
  await x.c.start();
  await x.c.syncProgress();
  assert.equal(x.map.get(x.c.key + ":pending"), "1");
  assert(x.statuses.includes("Synthetic offline"));
  assert([...x.timers.values()].some((timer) => timer.ms >= 400));
  assert.equal(x.c.getSnapshot().completion.text, "Saved on this device. Keep the app open to retry.");
  x.c.dispose();
  assert.equal(x.timers.size, 0);
});
test("duplicate correct clicks cannot increase XP or advance a question twice", async () => {
  const x = setup();
  await x.c.start();
  x.c.answer("desk");
  x.c.answer("desk");
  assert.equal(x.c.getSnapshot().state.xp, 10);
  x.c.advance();
  x.c.advance();
  assert.equal(x.c.getSnapshot().session.index, 1);
  x.c.dispose();
});
