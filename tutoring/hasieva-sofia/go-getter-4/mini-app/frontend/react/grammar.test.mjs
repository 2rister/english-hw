import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createGrammarController } from "./grammar-controller.mjs";
import { parseBank, choices, matches } from "./grammar-data.mjs";
const require2 = createRequire(import.meta.url), { createRevisionedSaveQueue, mergeGrammarState } = require2("../../../../../../grammar-snack-01/revisioned-save-queue.js");
const bank = readFileSync(new URL("../../../grammar-snack-01/CONTENT_BANK.md", import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));
function setup({ authenticated = false, preview = false, remote = {}, saved = true, initial = {}, call } = {}) {
  const stored = new Map(Object.entries(initial)), calls = [], timers = /* @__PURE__ */ new Map(), statuses = [];
  let counter = 0, writes = 0;
  const storage = { getItem: (k) => stored.get(k) || null, setItem(k, v) {
    writes++;
    stored.set(k, v);
  }, removeItem: key => stored.delete(key) };
  let server = remote, serverRevision = 1;
  const tutoring = { authenticated, preview, userId: 123, saving() {
  }, setStatus: (status) => statuses.push(status), async call(action, ...args) {
    calls.push(action);
    if (call) return call(action, ...args);
    if (action === "deviceDump") return {saved: args[3].length};
    if (action === "save") { if(saved) { server=structuredClone(args[0]);serverRevision++; } return {saved,revision:serverRevision}; }
    return {revision:serverRevision,state:server};
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
  assert.equal(s.current.correct, 19);
  assert.equal(s.current.score, 95);
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

test("meteor repairs cannot inflate final first-try mastery", async()=>{
  const x=setup();await x.c.boot();x.c.startAttempt();
  const items=x.c.getSnapshot().variants[0].items;
  for(const [index,item] of items.entries()){
    if(index<4){x.c.answer('wrong course');x.c.answer('wrong course again');}
    x.c.answer(item.answer);x.tick();
  }
  const state=x.c.getSnapshot().state;
  assert.equal(state.current.correct,16);assert.equal(state.current.score,80);
  assert.equal(state.history[0].score,80);assert.equal(state.current.errorEvents.length,8);
  x.c.dispose();
});

test("flight checkpoint keeps course/time without answering and rejects invalid positions",async()=>{
 const x=setup();await x.c.boot();x.c.startAttempt();
 const id=x.c.getSnapshot().variants[0].items[0].id;
 x.c.checkpointFlight({itemId:id,selectedId:id+':0',remainingMs:12345});
 const state=JSON.parse(x.stored.get(x.c.key));
 assert.deepEqual(state.current.flight,{launched:true,itemId:id,selectedId:id+':0',remainingMs:12345});
 assert.equal(state.current.answers.length,0);
 x.c.checkpointFlight({itemId:'missing',selectedId:'bad',remainingMs:20000});
 assert.equal(x.c.getSnapshot().state.current.flight.remainingMs,12345);
 x.c.checkpointFlight({itemId:id,selectedId:null,remainingMs:Infinity});
 assert.equal(x.c.getSnapshot().state.current.flight.remainingMs,12345);x.c.dispose();
});


test("grammar accepts exact filled sentences and equivalent contractions without extra clauses", () => {
  const item = parseBank(bank)[0].items[9];
  for (const value of ["do not understand", "don't understand", "I do not understand this instruction.", "I don’t understand this instruction!"]) {
    assert(matches(value, item.answer, item.prompt), value);
  }
  for (const value of ["I understand this instruction", "I don't understand this instruction because I am tired", "I do not understand", "do not", "don't understand this instruction"]) {
    assert(!matches(value, item.answer, item.prompt), value);
  }
  assert(matches("They aren't waiting for a taxi", "They are not waiting for a taxi."));
  assert(matches("I'm not staying at home tonight", "I am not staying at home tonight."));
  assert(!matches("They aren't waiting for a bus", "They are not waiting for a taxi."));
  const pair = parseBank(bank)[0].items[18];
  assert(matches("We have lunch at 1 every day, but we aren't having lunch now.", pair.answer, pair.prompt));
  assert(!matches("We are having lunch at 1 every day, but we don't have lunch now.", pair.answer, pair.prompt));
  assert(!matches("I don't understand this instruction", item.answer, "Correct: I am not understanding this instruction."));
});

test("restored legacy mission retains completed theory, sector position and original errors", async () => {
  const remote = { kind: "grammar-snack-01", theoryDone: true, theoryStep: 5, variantIndex: 0, history: [], current: {
    id: "synthetic-legacy", variantId: "01", index: 9, correct: 9, complete: false,
    answers: [{id:"10",firstTry:false,wrong:["previous rejected input"]}], errorEvents: []
  }};
  const x=setup({authenticated:true,remote});await x.c.boot();
  const restored=x.c.getSnapshot();
  assert.equal(restored.theoryIndex,5);assert.equal(restored.state.theoryDone,true);
  assert.equal(restored.state.current.index,9);assert.equal(restored.shown,9);
  x.c.answer("I don't understand this instruction");x.tick();
  const state=x.c.getSnapshot().state;
  assert.equal(state.current.index,10);
  assert.equal(state.current.answers[0].firstTry,false);
  assert.deepEqual(state.current.answers[0].wrong,["previous rejected input"]);
  assert.equal(state.history.length,0);x.c.dispose();
});

test("entry uploads theory and completed history without a current mission, then confirms read-back", async()=>{
  const key='grammar-snack-01-v1:123', local={kind:'grammar-snack-01',theoryStep:5,theoryDone:true,current:null,history:[{id:'synthetic-history',score:85}],variantIndex:1};
  const x=setup({authenticated:true,initial:{[key]:JSON.stringify(local),'grammar-snack-01-v1':JSON.stringify({theoryStep:1})}});
  assert.equal(await x.c.boot(),true);
  assert.deepEqual(x.calls,['deviceDump','load','save','load']);
  assert.equal(x.c.getSnapshot().state.history[0].id,'synthetic-history');
  assert.equal(x.stored.has(key+':pending'),false);x.c.dispose();
});

test("failed startup load preserves raw local state and automatically retries before merge",async()=>{
  const key='grammar-snack-01-v1:123', local=JSON.stringify({theoryDone:true,theoryStep:5,current:null,history:[]});
  let offline=true, remote={}, revision=1;
  const x=setup({authenticated:true,initial:{[key]:local},call:async(action,...args)=>{
    if(action==='deviceDump')return {saved:args[3].length};
    if(offline)throw Error('Synthetic load offline');
    if(action==='save'){remote=structuredClone(args[0]);return {saved:true,revision:++revision};}
    return {state:remote,revision};
  }});
  assert.equal(await x.c.boot(),false);assert.equal(x.stored.get(key),local);
  offline=false;x.tick();await settle();await settle();
  assert.equal(x.c.getSnapshot().error,'');assert.equal(remote.theoryDone,true);
  assert.equal(x.stored.has(key+':pending'),false);x.c.dispose();
});

test("failed grammar save survives reload and never confirms a missing read-back",async()=>{
  const key='grammar-snack-01-v1:123', initial={[key]:JSON.stringify({theoryDone:true,theoryStep:5,current:null,history:[]})};
  const failed=setup({authenticated:true,initial,saved:false});
  assert.equal(await failed.c.boot(),false);assert.equal(failed.stored.get(key+':pending'),'1');
  failed.c.dispose();
  const recovered=setup({authenticated:true,initial:Object.fromEntries(failed.stored)});
  assert.equal(await recovered.c.boot(),true);assert.equal(recovered.stored.has(key+':pending'),false);recovered.c.dispose();
  const stale=setup({authenticated:true,initial,call:async(action,...args)=> action==='deviceDump'?{saved:args[3].length}:action==='save'?{saved:true,revision:2}:{state:{},revision:1}});
  assert.equal(await stale.c.boot(),false);assert.match(stale.c.getSnapshot().error,/read-back/);
  assert(!stale.statuses.some(status=>status.startsWith('Saved ·')));stale.c.dispose();
});

test("large scoped device backup is losslessly chunked under the existing server limit", async()=>{
  const {backupDeviceState}=await import('./device-backup.mjs');
  const values={'grammar-snack-01-v1:123':JSON.stringify({answers:Array(2000).fill('synthetic "answer" with a newline\n')})},sent=[];
  await backupDeviceState({call:async(action,a,b,unit,dump)=>{assert.equal(action,'deviceDump');assert.equal(unit,'grammar-snack-01');assert(dump.length<=45000);sent.push(dump);return {saved:dump.length};}},'grammar-snack-01',values);
  assert(sent.length>1);
  const chunks=sent.map(value=>JSON.parse(value));
  assert.equal(new Set(chunks.map(chunk=>chunk.captureId)).size,1);
  assert.deepEqual(JSON.parse(chunks.map(chunk=>chunk.data).join('')),values);
});

test("grammar read-back with the same IDs but lost wrong-answer evidence remains pending",async()=>{
 const key='grammar-snack-01-v1:123', local={current:{id:'synthetic-partial',variantId:'01',index:1,answers:[{id:'1',correct:true,firstTry:false,wrong:['synthetic wrong']}],errorEvents:[{id:'error1',wrong:'synthetic wrong'}]},history:[]};
 let server={},revision=1;
 const x=setup({authenticated:true,initial:{[key]:JSON.stringify(local)},call:async(action,...args)=>{
  if(action==='deviceDump')return {saved:args[3].length};
  if(action==='save'){server=structuredClone(args[0]);server.current.answers[0].wrong=[];return {saved:true,revision:++revision};}
  return {state:server,revision};
 }});
 assert.equal(await x.c.boot(),false);assert.equal(x.stored.get(key+':pending'),'1');assert.match(x.c.getSnapshot().error,/read-back/);x.c.dispose();
});
