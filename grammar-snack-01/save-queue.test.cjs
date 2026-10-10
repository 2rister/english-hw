const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createRevisionedSaveQueue,mergeGrammarState}=require('./revisioned-save-queue.js');

test('merges server events and local answers without losing either side',()=>{
  const local={variantIndex:2,history:[],current:{id:'a',index:2,correct:1,answers:[{id:'q1',wrong:['x']}],errorEvents:[{id:'e2'}]}};
  const merged=mergeGrammarState(local,{variantIndex:1,history:[{id:'old'}],current:{id:'a',index:1,correct:1,answers:[{id:'q1',wrong:['y']}],errorEvents:[{id:'e1'}]}});
  assert.deepEqual(merged.current.errorEvents.map(event=>event.id),['e1','e2']);
  assert.deepEqual(merged.current.answers[0].wrong,['y','x']);
  assert.equal(merged.current.index,2);assert.equal(merged.variantIndex,2);
  assert.equal(merged.history[0].id,'old');
});

test('serializes rapid saves and retries conflicts from the latest local state',async()=>{
  let revision=0, state={current:{id:'attempt-1',index:0,correct:0,answers:[],errorEvents:[]}};
  let active=0,maxActive=0,server=structuredClone(state),firstResolve;
  const saved=[];
  const queue=createRevisionedSaveQueue({
    getState:()=>structuredClone(state),getRevision:()=>revision,setRevision:value=>{revision=value;},
    save:async(snapshot,expected)=>{
      active++;maxActive=Math.max(active,maxActive);
      if(saved.length===0)await new Promise(resolve=>{firstResolve=resolve;});
      active--;
      if(expected!==revision)return {conflict:true};
      server=structuredClone(snapshot);revision++;saved.push(snapshot);return {revision};
    },
    load:async()=>({revision,state:structuredClone(server)}),
    mergeState:remote=>{state=mergeGrammarState(state,remote);},onSaved:()=>{},onError:error=>{throw error;}
  });
  const first=queue.enqueue();
  state.current.errorEvents.push({id:'e1',wrong:'am knowing'});
  const second=queue.enqueue();
  state.current.errorEvents.push({id:'e2',wrong:'is go'});state.current.index=1;
  const third=queue.enqueue();
  await Promise.resolve();
  firstResolve();
  await Promise.all([first,second,third]);
  assert.equal(maxActive,1,'only one revision write may be in flight');
  assert.deepEqual(server.current.errorEvents.map(event=>event.id),['e1','e2']);
  assert.equal(server.current.index,1,'later local progress must survive earlier queued snapshots');
  assert.equal(revision,3,'each queued save must acknowledge the next revision');
});
