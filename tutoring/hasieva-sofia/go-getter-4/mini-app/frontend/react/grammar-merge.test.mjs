import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {mergeGrammarState:merge}=createRequire(import.meta.url)('../../../../../../grammar-snack-01/revisioned-save-queue.js');
test('remote mission survives stale local theory and fresh browser state',()=>{
  const remote={theoryDone:true,theoryStep:5,current:{id:'mission',variantId:'01',index:9,answers:[]},history:[{id:'old',score:95}]};
  for(const current of [null,{id:'theory',phase:'theory'}]){
    const result=merge({theoryDone:false,theoryStep:0,current,history:[]},remote);
    assert.deepEqual(result.current,remote.current);
    assert.equal(result.theoryDone,true);assert.equal(result.theoryStep,5);
    assert.deepEqual(result.history,remote.history);
  }
});
test('same attempt preserves repaired correctness and prior wrong evidence in both merge directions',()=>{
  const older={current:{id:'mission',index:9,correct:9,answers:[{id:'10',correct:false,firstTry:false,wrong:['mistake']}],flight:{itemId:'10',remainingMs:500}}};
  const newer={current:{id:'mission',index:10,correct:10,answers:[{id:'10',correct:true,firstTry:true,wrong:[]}],flight:{itemId:'11',remainingMs:17000}}};
  for(const [local,remote] of [[older,newer],[newer,older]]){
    const result=merge(local,remote).current;
    assert.equal(result.index,10);assert.equal(result.answers[0].correct,true);
    assert.equal(result.answers[0].firstTry,false);assert.deepEqual(result.answers[0].wrong,['mistake']);
    assert.equal(result.flight.itemId,'11');
  }
});
test('farther progress cannot inherit previous sector countdown',()=>{
  const result=merge({current:{id:'mission',index:9,flight:{itemId:'10',remainingMs:10}}},{current:{id:'mission',index:10}});
  assert.equal(result.current.flight,undefined);
});
test('distinct active attempts do not mix answer rows or lose completed history',()=>{
  const local={current:{id:'new',variantId:'02',index:1,answers:[{id:'1',correct:true}]},history:[{id:'done2',score:90}]};
  const remote={current:{id:'old',variantId:'01',index:9,answers:[{id:'9',correct:true}]},history:[{id:'done1',score:95}]};
  const result=merge(local,remote);
  assert.deepEqual(result.current,local.current);assert.equal(result.history.length,2);
});
