import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSync,createCommitter,flushVocabOnEntry} from '../../../../../../vocab-space/progress.mjs';
function fixture(events) {
 let persisted={events,session:{index:3,draft:'unfinished answer'},day:2};
 const remote=new Map(),calls=[],notices=[];let offline=false,wrongAck=false,missingReadback=false;
 function client() {
  const state=structuredClone(persisted);
  return createSync({endpoint:'https://synthetic.invalid',browserSession:'a'.repeat(64),bank:{id:'test'},state,commit:createCommitter(state,{save:async next=>{persisted=structuredClone(next);return next;}}),notify:(...args)=>notices.push(args),request:async(_,options)=>{
   const data=JSON.parse(options.body);calls.push(data.action);if(offline)throw Error('Offline');
   if(data.action==='load')return {ok:true,json:async()=>({ok:true,events:missingReadback&&calls.includes('attempt')?[]:[...remote.values()]})};
   const event={...data.event,confirmed:true};if(!wrongAck)remote.set(event.requestId,event);
   return {ok:true,json:async()=>({ok:true,event:wrongAck?{...event,requestId:'wrong'}:event})};
  }});
 }
 return {client,remote,calls,notices,get persisted(){return persisted;},set offline(v){offline=v;},set wrongAck(v){wrongAck=v;},set missingReadback(v){missingReadback=v;}};
}
const event={requestId:'one',answer:'wardrobe',confirmed:false};
test('entry repairs stale confirmed flags and verifies remote readback',async()=>{
 const f=fixture([{...event,confirmed:true}]);assert.equal(await f.client().flush(),true);
 assert.deepEqual(f.calls,['load','attempt','load']);assert.equal(f.remote.get('one').answer,'wardrobe');
 assert.deepEqual(f.notices.at(-1),['Progress confirmed by the server.',true]);assert.equal(f.persisted.session.draft,'unfinished answer');
});
test('offline entry retains durable outbox across reload and next entry retries idempotently',async()=>{
 const f=fixture([event]);f.offline=true;assert.equal(await f.client().flush(),false);assert.equal(f.persisted.events.length,1);
 f.offline=false;assert.equal(await f.client().flush(),true);assert.equal(await f.client().flush(),true);
 assert.equal(f.remote.size,1);assert.equal(f.calls.filter(x=>x==='attempt').length,1);
});
test('wrong acknowledgment cannot delete original answer',async()=>{
 const f=fixture([event]);f.wrongAck=true;assert.equal(await f.client().flush(),false);
 assert.equal(f.persisted.events[0].requestId,'one');assert.equal(f.persisted.events[0].confirmed,false);
 f.wrongAck=false;assert.equal(await f.client().flush(),true);assert.equal(f.remote.size,1);
});
test('missing final readback cannot announce success or discard evidence',async()=>{
 const f=fixture([event]);f.missingReadback=true;assert.equal(await f.client().flush(),false);
 assert.equal(f.persisted.events[0].requestId,'one');assert.equal(f.notices.at(-1)[1],false);
 f.missingReadback=false;assert.equal(await f.client().flush(),true);assert.equal(f.remote.size,1);
});
test('catalog helper excludes anonymous and teacher preview stores',async()=>{
 for(const tutoring of [{authenticated:false},{authenticated:true,userId:101,preview:true},{authenticated:true,userId:0}]) {
  const denied=()=>{throw Error('Must not read another profile');};
  assert.equal(await flushVocabOnEntry({tutoring,baseUrl:'https://test.invalid/tutoring/',request:denied,storeOpen:denied}),false);
 }
});

test('unconfirmed remote history cannot replace local outbox or announce saved',async()=>{
 const f=fixture([event]);f.remote.set('one',{...event,confirmed:false});
 assert.equal(await f.client().flush(),false);assert.equal(f.persisted.events[0].answer,'wardrobe');
 assert.equal(f.persisted.events[0].confirmed,false);assert.equal(f.notices.at(-1)[1],false);
});
