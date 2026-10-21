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
  let server = { xp:20,days:{},badges:[] }, serverRevision = 1;
  const tutoring = { authenticated, userId: 123, preview, previewToken: preview ? "synthetic-preview" : null, units: [], saving() {
  }, setStatus: (t) => statuses.push(t), back() {
  }, async call(...args) {
    calls.push(args);
    if(args[0]==="deviceDump") return {saved:args[4].length};
    if(call) return call(...args);
    if(args[0]==="save") {server=structuredClone(args[1]);serverRevision++;return {saved:true,revision:serverRevision};}
    return {revision:serverRevision,state:server};
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
  const x = setup({ authenticated: true, stored: { "unrelated-homework": "private-other-app" }, call: async (action) => action === "save" ? ++saves === 1 ? { conflict: true } : { saved: true, revision: 4 } : action === "load" ? { revision: saves >= 2 ? 4 : 3, state: { xp: 100, days: { day1: { complete: true, score: 100, index: 3, answers: [], runs: [{ at: "synthetic", score: 100 }] } }, badges: ["one"] } } : {} });
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

test("Street entry uploads local completed results and excludes anonymous practice", async()=>{
 const key='street-style-quest-v1:123', local={xp:25,days:{day1:{complete:true,index:3,answers:[],runs:[{at:'synthetic-local',score:80}]}},badges:['one']};
 const x=setup({authenticated:true,stored:{[key]:JSON.stringify(local),'street-style-quest-v1':'anonymous-qa'}});
 assert.equal(await x.c.start(),true);
 assert.equal(x.calls[0][0],'deviceDump');assert(!x.calls[0][4].includes('anonymous-qa'));
 assert.deepEqual(x.calls.map(call=>call[0]),['deviceDump','load','save','load']);
 assert.equal(x.c.getSnapshot().state.days.day1.runs[0].at,'synthetic-local');x.c.dispose();
});

test("Street startup load failure retains local results and retries on reconnection",async()=>{
 const key='street-style-quest-v1:123', raw=JSON.stringify({xp:20,days:{day1:{index:1,answers:[{q:'Where?',correct:true}]}},badges:[]});
 let offline=true, server={},revision=1;
 const x=setup({authenticated:true,stored:{[key]:raw},call:async(action,state)=>{
   if(offline)throw Error('Synthetic load offline');
   if(action==='save'){server=structuredClone(state);return {saved:true,revision:++revision};}
   return {state:server,revision};
 }});
 await x.c.start();assert.equal(x.c.getSnapshot().restored,false);assert.equal(x.map.get(key),raw);
 assert([...x.timers.values()].some(timer=>timer.ms===15000));
 offline=false;assert.equal(await x.c.syncProgress(),true);
 assert.equal(server.days.day1.answers[0].q,'Where?');x.c.dispose();
});

test("Street save acknowledgement without read-back never clears its pending marker",async()=>{
 const x=setup({authenticated:true,call:async(action)=>action==='save'?{saved:true,revision:2}:{state:{days:{}},revision:1}});
 assert.equal(await x.c.start(),false);
 assert.equal(x.map.get(x.c.key+':pending'),'1');assert(x.statuses.some(status=>status.includes('read-back')));
 assert(!x.statuses.includes('Progress saved.'));x.c.dispose();
});

test("Street same-ID read-back losing writing or wrong-answer evidence remains pending",async()=>{
 const key='street-style-quest-v1:123', local={days:{day1:{index:1,answers:[{q:'Where?',correct:true,firstTry:false,wrong:['table']},{q:'Write',text:'Synthetic writing'}],drafts:{1:'Synthetic writing'}}}};
 let server={},revision=1;
 const x=setup({authenticated:true,stored:{[key]:JSON.stringify(local)},call:async(action,state)=>{
  if(action==='save'){server=structuredClone(state);server.days.day1.answers[0].wrong=[];server.days.day1.drafts={};return {saved:true,revision:++revision};}
  return {state:server,revision};
 }});
 assert.equal(await x.c.start(),false);assert.equal(x.map.get(key+':pending'),'1');assert(x.statuses.some(status=>status.includes('read-back')));x.c.dispose();
});
