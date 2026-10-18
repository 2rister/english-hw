import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roundOutcome,randomEffect,EFFECTS} from './block-result.mjs';
const session=(correct,total=25,props={})=>({mode:'exam',storyId:'guided',ids:Array.from({length:total},(_,i)=>String(i)),index:total,results:Array.from({length:total},(_,i)=>({itemId:String(i),correct:i<correct,hinted:true})),...props});
test('85% threshold uses the true ratio: 21/25 fails, 22/25 passes, 17/20 passes',()=>{
 assert.equal(roundOutcome(session(21)).passed,false);assert.equal(roundOutcome(session(22)).passed,true);
 assert.equal(roundOutcome(session(17,20)).percent,85);assert.equal(roundOutcome(session(17,20)).passed,true);
 assert.equal(roundOutcome(session(25)).percent,100);assert.equal(roundOutcome(session(0)).passed,false);
});
test('incomplete, assisted independent and paper results cannot fabricate a pass',()=>{
 assert.equal(roundOutcome(session(25,25,{index:24})).passed,false);
 assert.equal(roundOutcome(session(25,25,{storyId:undefined})).passed,false);
 assert.equal(roundOutcome(session(25,25,{mode:'paper'})).passed,false);
 assert.equal(roundOutcome(session(0,0)).passed,false);
});
test('retries do not turn first-attempt errors into an inflated percentage',()=>{
 const s=session(7,9,{storyId:undefined,mode:'listen'});s.results=s.results.map(e=>({...e,hinted:false}));
 s.ids.push('8');s.index++;s.results.push({itemId:'8',correct:true,hinted:false});
 assert.deepEqual(roundOutcome(s),{correct:7,total:9,percent:77,supported:false,passed:false});
});
test('all four random effects are reachable and two adjacent celebrations never repeat',()=>{
 assert.deepEqual(EFFECTS.map((_,i)=>randomEffect(undefined,()=>i/4)),EFFECTS);
 for(const prior of EFFECTS) for(const random of [0,.4,.99]) assert.notEqual(randomEffect(prior,()=>random),prior);
});
