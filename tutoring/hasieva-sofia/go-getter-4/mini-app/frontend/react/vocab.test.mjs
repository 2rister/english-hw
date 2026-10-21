import { test } from "node:test";
import assert from "node:assert/strict";
import { secureId } from "./vocab-controller.mjs";
test("Vocab answer IDs stay secure when randomUUID is absent", () => {
  const id = secureId({ getRandomValues: (bytes) => crypto.getRandomValues(bytes) });
  assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.throws(() => secureId({}), /Secure answer IDs/);
  assert.notEqual(id, secureId());
});

test('paired browser uses the verified Telegram profile namespace and credential for Vocab sync', async () => {
  const { createVocabController } = await import('./vocab-controller.mjs');
  let owner, syncOptions;
  const noop = () => {};
  const controller = createVocabController({
    tutoring:{authenticated:true,userId:101,browserCredential:()=> 'a'.repeat(64)},
    request:async url=>({ok:true,json:async()=>url==='unit2.json'?{id:'synthetic',items:[]}:{endpoint:'https://synthetic.invalid'}}),
    events:{addEventListener:noop,removeEventListener:noop},
    pageDocument:{documentElement:{style:{setProperty:noop}},addEventListener:noop,removeEventListener:noop},
    navigation:{hash:''},confirmStart:()=>true,
    createPlayer:()=>({addEventListener:noop,removeEventListener:noop,pause:noop}),
    storeOpen:async key=>{owner=key;return {load:async()=>({events:[],session:null,day:1}),save:async state=>state};},
    makeSync:options=>{syncOptions=options;return {flush:async()=>{}};},
  });
  await controller.boot();
  assert.equal(controller.getSnapshot().error,'');
  assert.equal(owner,'telegram:101');
  assert.equal(syncOptions.browserSession,'a'.repeat(64));
  assert.equal(syncOptions.initData,undefined);
  controller.dispose();
});
