import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createGrammarController } from "./grammar-controller.mjs";
import { parseBank, choices, matches } from "./grammar-data.mjs";
const require2 = createRequire(import.meta.url), { createRevisionedSaveQueue, mergeGrammarState } = require2("../../../../../../grammar-snack-01/revisioned-save-queue.js");
const bank = readFileSync(new URL("../../../grammar-snack-01/CONTENT_BANK.md", import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));
function setup({ authenticated = false, preview = false, remote = {}, saved = true } = {}) {
  const stored = /* @__PURE__ */ new Map(), calls = [], timers = /* @__PURE__ */ new Map(), statuses = [];
  let counter = 0, writes = 0;
  const storage = { getItem: (k) => stored.get(k) || null, setItem(k, v) {
    writes++;
    stored.set(k, v);
  } };
  const tutoring = { authenticated, preview, userId: 123, saving() {
  }, setStatus: (status) => statuses.push(status), async call(action, ...args) {
    calls.push(action);
    return action === "save" ? { saved, revision: 2 } : { revision: 1, state: remote };
  } };
  const clock = { setTimeout(fn) {
    const id = ++counter;
    timers.set(id, fn);
    return id;
  }, clearTimeout: (id) => timers.delete(id) };
  const c = createGrammarController({ tutoring, storage, request: async () => ({ ok: true, text: async () => bank }), createQueue: createRevisionedSaveQueue, mergeState: mergeGrammarState, clock });
  return { c, calls, stored, statuses, writes: () => writes, tick() {
    const [id, fn] = timers.entries().next().value || [];
    if (fn) {
      timers.delete(id);
      fn();
    }
  } };
}
test("all ten original equivalent variants contain exactly twenty graded items", () => {
  const variants = parseBank(bank);
  assert.equal(variants.length, 10);
  assert(variants.every((v) => v.items.length === 20));
  assert(matches("a, b", "a;b"));
  assert(!matches("a", "a;b"));
  assert.deepEqual(choices({ q: "**(walks / is walking)**" }), ["walks", "is walking"]);
});
test("mastery preserves errors, advances once per answer, and keeps one completed attempt", async () => {
  const x = setup();
  await x.c.boot();
  x.c.startAttempt();
  const items = x.c.getSnapshot().variants[0].items;
  x.c.answer("synthetic wrong");
  assert.equal(x.c.getSnapshot().state.current.errorEvents.length, 1);
  for (const item of items) {
    x.c.answer(item.answer);
    x.c.answer(item.answer);
    x.tick();
  }
  const s = x.c.getSnapshot().state;
  assert.equal(s.current.correct, 20);
  assert.equal(s.current.score, 100);
  assert.equal(s.current.answers[0].firstTry, false);
  assert.equal(s.history.length, 1);
  x.c.answer(items[0].answer);
  assert.equal(s.history.length, 1);
  x.c.dispose();
});
test("server restore does not replace a completed theory step with fresh local state", async () => {
  const x = setup({ authenticated: true, remote: { kind: "grammar-snack-01", theoryDone: true, theoryStep: 5, current: null, history: [], variantIndex: 0 } });
  await x.c.boot();
  assert.equal(x.c.getSnapshot().state.theoryDone, true);
  assert.equal(x.c.getSnapshot().theoryIndex, 5);
  x.c.dispose();
});
test("an unacknowledged server result never becomes a saved confirmation", async () => {
  const x = setup({ authenticated: true, saved: false });
  await x.c.boot();
  x.c.answerTheory("synthetic wrong");
  await settle();
  assert(x.c.getSnapshot().error.includes("not confirmed"));
  assert(!x.statuses.some((status) => status.startsWith("Saved ·")));
  x.c.dispose();
});
test("Grammar teacher preview never writes local progress or calls save", async () => {
  const x = setup({ authenticated: true, preview: true });
  await x.c.boot();
  x.c.answerTheory("synthetic wrong");
  await x.c.save();
  await settle();
  assert.equal(x.writes(), 0);
  assert.deepEqual(x.calls, ["preview"]);
  x.c.dispose();
});
