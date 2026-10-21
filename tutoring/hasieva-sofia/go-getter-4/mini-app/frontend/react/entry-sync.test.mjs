import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {mountEntrySync} from './entry-sync.mjs';
const queue=createRequire(import.meta.url)('../../../../../../grammar-snack-01/revisioned-save-queue.js');
const bank=await readFile(new URL('../../../grammar-snack-01/CONTENT_BANK.md',import.meta.url),'utf8');
for(const vocabFails of [false,true])test('catalog entry syncs inactive Grammar and Vocab, aggregate failure='+vocabFails,async()=>{
 const values=new Map([['grammar-snack-01-v1:101',JSON.stringify({kind:'grammar-snack-01',theoryStep:3,history:[]})]]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 let remote=null,revision=0,grammarSaves=0,streetStarts=0,vocabOwner;
 const statuses=[],registered=new Map(),timers=[];
 const tutoring={authenticated:true,userId:101,browserCredential:()=> 'a'.repeat(64),setStatus:text=>statuses.push(text),saving(){},call:async(action,state,expected,unit,dump)=>{
  if(action==='deviceDump')return {ok:true,saved:dump.length};
  if(action==='load')return {ok:true,revision,state:remote};
  if(action==='save'){grammarSaves++;remote=structuredClone(state);return {saved:true,revision:++revision};}
 }};
 const stop=mountEntrySync({tutoring,storage,controller:{key:'street-style-quest-v1:101',start:async()=>{streetStarts++;},syncProgress:async()=>true,getSnapshot:()=>({restored:true})},
  events:{addEventListener:(key,fn)=>registered.set(key,fn),removeEventListener:key=>registered.delete(key)},pageDocument:{addEventListener(){},removeEventListener(){}},
  baseUrl:'https://test.invalid/tutoring/',createQueue:queue.createRevisionedSaveQueue,mergeState:queue.mergeGrammarState,
  clock:{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}},
  storeOpen:async owner=>{vocabOwner=owner;if(vocabFails)throw Error('Device unavailable');return {load:async()=>({events:[],session:null,day:1}),save:async state=>state,close(){}};},
  request:async(url,options)=>{
   if(options)return {ok:true,json:async()=>({ok:true,events:[]})};
   return {ok:true,text:async()=>bank,json:async()=>String(url).endsWith('config.json')?{endpoint:'https://sync.invalid'}:{id:'vocab',items:[]}};
  },
 });
 for(let i=0;i<30&&statuses.length<2;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(streetStarts,1);assert.ok(grammarSaves>=1);assert.equal(remote.theoryStep,3);assert.equal(vocabOwner,'telegram:101');
 assert.equal(tutoring.entrySyncPending,vocabFails);assert.match(statuses.at(-1),vocabFails?/waiting to sync/:/All saved results confirmed/);
 assert.equal(timers.length,vocabFails?1:0);stop();assert.equal(registered.size,0);
});
