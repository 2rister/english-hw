import {test} from 'node:test';
import assert from 'node:assert/strict';
import {flightQuestion,flightAnswer,flightStats} from './grammar-space.mjs';
test('flight courses preserve stable IDs, exact grammar answers and reload order',()=>{
 const item={id:'7',prompt:'She **(works / is working)** now.'};
 const q=flightQuestion(item,'same-attempt');
 assert.deepEqual(q,flightQuestion(item,'same-attempt'));
 assert.deepEqual(q.options.map(o=>o.text).sort(),['is working','works']);
 assert.equal(new Set(q.options.map(o=>o.id)).size,2);
 for(let i=0;i<q.options.length;i++)assert.equal(flightAnswer(q,i),q.options[i].text);
 assert.equal(flightAnswer(q,99),null);
});
test('sentence tasks become courses and meteor damage counts each question once',()=>{
 assert.equal(flightQuestion({id:'9',type:'affirmative',prompt:'Complete: Sofia ___ (study).',answer:'studies'},'run').options.length,2);
 const result=flightStats({answers:[{firstTry:false,correct:true,wrong:['a','b']},{firstTry:true,correct:true},{firstTry:true,correct:true}]});
 assert.deepEqual(result,{hull:95,hits:1,streak:2});
});

import {readFileSync} from 'node:fs';
import {parseBank,matches} from './grammar-data.mjs';
test('all 200 original tasks have exactly one valid course and no missing answer',()=>{
 const variants=parseBank(readFileSync(new URL('../../../grammar-snack-01/CONTENT_BANK.md',import.meta.url),'utf8'));
 for(const variant of variants)for(const item of variant.items){
  const q=flightQuestion(item,variant.id);
  assert.equal(q.options.length,2,variant.id+':'+item.id);
  assert.equal(q.options.filter(option=>matches(option.text,item.answer)).length,1,variant.id+':'+item.id);
  assert(q.options.every(option=>option.text.length>0));
 }
});
