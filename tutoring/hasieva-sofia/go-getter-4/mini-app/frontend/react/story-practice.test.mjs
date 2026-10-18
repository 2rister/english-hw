import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../../../supabase/functions/_shared/vocab/unit2.json' with {type:'json'};
import {stories,storyParts,chooseStory,repairWords} from './story-practice.mjs';
import {createVocabController} from './vocab-controller.mjs';
import {summary} from './vocab-ports.mjs';

test('four fresh stories have 25 unique gaps each, five per paragraph, and cover all 81 topic items',()=>{
  const covered=new Set();
  assert.equal(stories.length,4);
  for(const story of stories){
    const paragraphs=storyParts(story,bank),gaps=paragraphs.flat().filter(part=>part.itemId);
    assert.equal(paragraphs.length,5);assert.equal(gaps.length,25);assert.equal(new Set(gaps.map(part=>part.itemId)).size,25);
    for(const paragraph of paragraphs) assert.equal(paragraph.filter(part=>part.itemId).length,5);
    gaps.forEach((part,index)=>{
      covered.add(part.itemId);assert.equal(part.number,index+1);
      const word=bank.items.find(item=>item.id===part.itemId).english;
      assert.equal(part.cue[0],word[0]);assert.equal((part.cue.match(/_/g)||[]).length,(word.match(/[a-z]/gi)||[]).length-1);
    });
  }
  assert.equal(covered.size,81);
});

test('least-practised selection visits all four stories before repeating',()=>{
  const events=[],visited=new Set();
  for(let n=0;n<4;n++){
    const round=chooseStory(bank,events);visited.add(round.storyId);
    events.push(...round.ids.map(itemId=>({itemId,sessionId:'story-'+n,mode:'exam',correct:true,hinted:true})));
  }
  assert.equal(visited.size,4);
});

test('a supported correction keeps a spelling in repair until an independent answer succeeds',()=>{
  const wrong={itemId:'u2-001',mode:'exam',correct:false,hinted:true};
  assert.deepEqual(repairWords([wrong,{...wrong,correct:true}]),['u2-001']);
  assert.deepEqual(repairWords([wrong,{...wrong,correct:true,hinted:false,mode:'listen'}]),[]);
});

async function setup(player, saveGate=()=>{}){
  let saved={events:[],session:null,day:1};
  const c=createVocabController({tg:null,events:new EventTarget(),navigation:{hash:''},confirmStart:()=>true,
    pageDocument:{hidden:false,documentElement:{style:{setProperty(){}}},addEventListener(){},removeEventListener(){}},
    request:async url=>({ok:true,json:async()=>url==='unit2.json'?bank:{endpoint:''}}),
    createPlayer:()=>player||({pause(){},play:async()=>{},addEventListener(){},removeEventListener(){}}),
    storeOpen:async()=>({load:async()=>structuredClone(saved),save:async state=>{saveGate(state);saved=structuredClone(state);return saved;}}),
    makeSync:()=>({flush:async()=>{}})});
  await c.boot();return c;
}

test('story answers persist with assistance flagged, exactly 25 delayed results, and zero independent mastery',async()=>{
  const c=await setup();
  try{
    await c.start('exam',false,{story:true});
    const ids=[...c.getSnapshot().state.session.ids];assert.equal(ids.length,25);
    for(const id of ids){
      await c.submitAnswer(bank.items.find(item=>item.id===id).english);
      const s=c.getSnapshot().state.session;assert.equal(s.feedback,null);assert.equal(s.results.at(-1).hinted,true);
    }
    const state=c.getSnapshot().state;assert.equal(state.session.index,25);assert.equal(state.events.length,25);
    assert.equal(summary(bank,state.events).written,0);
  }finally{c.dispose();}
});

test('independent short checks have 25 distinct items and repair includes guided-story mistakes',async()=>{
  const c=await setup();
  try{
    await c.start('exam',false,{story:true});const itemId=c.getSnapshot().state.session.ids[0];
    await c.submitAnswer('misspelling');
    for(const id of c.getSnapshot().state.session.ids.slice(1)) await c.submitAnswer(bank.items.find(item=>item.id===id).english);
    await c.start('listen',false,{repair:true});
    assert.deepEqual(c.getSnapshot().state.session.ids,[itemId]);
    await c.start('exam',false,{limit:25});const session=c.getSnapshot().state.session;
    assert.equal(session.ids.length,25);assert.equal(new Set(session.ids).size,25);assert.equal(session.storyId,undefined);
    await c.submitAnswer(bank.items.find(item=>item.id===session.ids[0]).english);
    assert.equal(c.getSnapshot().state.session.results[0].hinted,false);
  }finally{c.dispose();}
});

test('successful short checks reach every topic word before settling into review',async()=>{
  const c=await setup(),covered=new Set();
  try{
    await c.start('exam',false,{story:true});
    for(const id of c.getSnapshot().state.session.ids) await c.submitAnswer(bank.items.find(item=>item.id===id).english);
    for(let round=0;round<4;round++){
      await c.start('exam',false,{limit:25});
      const ids=[...c.getSnapshot().state.session.ids];
      for(const id of ids){covered.add(id);await c.submitAnswer(bank.items.find(item=>item.id===id).english);}
    }
    assert.equal(covered.size,81);
  }finally{c.dispose();}
});


test('audio exposes loading, supports cancellation and ignores an old play promise',async()=>{
  const pending=[],handlers={};
  const player={pause(){},play:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener(){}};
  const c=await setup(player);
  try{
    c.play(bank.items[0]);assert.equal(c.getSnapshot().audioStatus,'loading');
    c.stop();pending[0].resolve();await Promise.resolve();assert.equal(c.getSnapshot().audioStatus,'idle');
    c.play(bank.items[0]);c.play(bank.items[1]);pending[1].reject(Error('stale playback'));await Promise.resolve();
    assert.equal(c.getSnapshot().audioStatus,'loading');assert.equal(c.getSnapshot().playing,`${bank.items[1].id}:false:0`);
    pending[2].resolve();await Promise.resolve();assert.equal(c.getSnapshot().audioStatus,'playing');
    handlers.ended();assert.equal(c.getSnapshot().audioStatus,'idle');
    c.play(bank.items[0]);pending[3].reject(Error('unavailable'));await Promise.resolve();
    assert.equal(c.getSnapshot().audioStatus,'idle');assert.match(c.getSnapshot().message.text,/Could not play/);
    c.play(bank.items[0]);handlers.error();pending[4].resolve();await Promise.resolve();
    assert.equal(c.getSnapshot().audioStatus,'idle');assert.equal(c.getSnapshot().playing,null);
  }finally{c.dispose();}
});


test('independent check is controller-gated until a complete story reaches 85%, including after a failed story',async()=>{
 const c=await setup();
 try{
  await c.start('exam',false,{limit:25});assert.equal(c.getSnapshot().state.session,null);
  await c.start('exam',false,{story:true});const original=c.getSnapshot().state.session;
  for(let i=0;i<25;i++) await c.submitAnswer(i<21?bank.items.find(item=>item.id===original.ids[i]).english:'misspelling');
  assert.equal(c.getSnapshot().completedNow,original.id);
  await c.start('exam',false,{limit:25});assert.equal(c.getSnapshot().state.session.id,original.id);
  await c.start('exam',false,{story:true});assert.equal(c.getSnapshot().state.session.storyId,original.storyId);
  const retry=c.getSnapshot().state.session;
  for(let i=0;i<25;i++) await c.submitAnswer(i<22?bank.items.find(item=>item.id===retry.ids[i]).english:'misspelling');
  await c.start('exam',false,{story:true});assert.notEqual(c.getSnapshot().state.session.storyId,original.storyId);
  await c.start('exam',false,{limit:25});assert.equal(c.getSnapshot().state.session.storyId,undefined);
 }finally{c.dispose();}
});


test('a failed final checkpoint cannot claim a completion; retry emits only after durable save',async()=>{
 let fail=true;
 const c=await setup(undefined,state=>{if(fail&&state.session?.index===25) throw Error('Synthetic storage failure');});
 try{
  await c.start('exam',false,{story:true});const ids=c.getSnapshot().state.session.ids;
  for(const id of ids.slice(0,24)) await c.submitAnswer(bank.items.find(item=>item.id===id).english);
  const last=bank.items.find(item=>item.id===ids[24]).english;
  await c.submitAnswer(last);assert.equal(c.getSnapshot().completedNow,null);assert.equal(c.getSnapshot().state.session.index,24);
  fail=false;await c.submitAnswer(last);assert.equal(c.getSnapshot().completedNow,c.getSnapshot().state.session.id);
  assert.equal(c.getSnapshot().state.events.length,25);
 }finally{c.dispose();}
});
