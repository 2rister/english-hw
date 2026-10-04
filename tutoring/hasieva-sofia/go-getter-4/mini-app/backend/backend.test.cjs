const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const props = {TG_TOKEN:'123456789:TEST_ONLY',TG_CHAT_ID:'-100999999',TUTORING_TEACHER_CHAT_ID:'12345'};
const delivered = [];
let book, failTelegram=false;
const sheet = name => ({name,rows:[],appendRow(row){this.rows.push(row);return this;},getDataRange(){return {getValues:()=>this.rows.map(row=>[...row])};},getRange(row,col){return {setValues:values=>{this.rows[row-1]=values[0];},setValue:value=>{this.rows[row-1][col-1]=value;}};},setName(value){this.name=value;return this;}});
const context = vm.createContext({Date,JSON,Number,String,Object,Array,Number,Math,
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>{props[key]=value;}})},
  Utilities:{formatDate:()=> '2026-10-01',newBlob:value=>({getBytes:()=>Buffer.from(value)}),computeHmacSha256Signature:(value,key)=>[...crypto.createHmac('sha256',Buffer.from(key)).update(Buffer.from(value)).digest()]},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  SpreadsheetApp:{create:()=>{book={sheets:[sheet('Sheet1')],getId:()=> 'private-book',getSheets(){return this.sheets;},insertSheet(name){const s=sheet(name);this.sheets.push(s);return s;},getSheetByName(name){return this.sheets.find(s=>s.name===name);}};return book;},openById:id=>{assert.equal(id,'private-book');return book;},flush(){}},
  UrlFetchApp:{fetch:(url,options)=>{if(failTelegram)throw new Error('Synthetic delivery failure');assert.ok(!url.includes('TEST_ONLY/sendMessage') || JSON.parse(options.payload).chat_id>0);delivered.push(JSON.parse(options.payload));return {getContentText:()=>JSON.stringify({ok:true,result:{}})};}}
});
vm.runInContext(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),context);
function login(id,username='learner',age=0){
  const fields={auth_date:String(Math.floor(Date.now()/1000)-age),user:JSON.stringify({id,username,first_name:'Synthetic'})};
  const check=Object.keys(fields).sort().map(key=>key+'='+fields[key]).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(props.TG_TOKEN).digest();
  fields.hash=crypto.createHmac('sha256',secret).update(check).digest('hex');
  return new URLSearchParams(fields).toString();
}
const state={xp:10,badges:[],days:{day1:{complete:true,completedAt:'2026-10-01T12:00:00Z',index:1,correct:1,answers:[{q:'Synthetic',correct:true,firstTry:true}]}}};
assert.throws(()=>context.tutoringUser_(login(111).replace('Synthetic','Tampered')),/verified/);
assert.throws(()=>context.tutoringUser_(login(111,'learner',86401)),/reopen/);
assert.throws(()=>context.tutoringUser_(login(111)+'&user=bad'),/Duplicate/);
let result=context.tutoringCall({action:'load',unit:'street-style',initData:login(111)});
assert.equal(result.state,null);
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:0,state});
assert.equal(result.saved,true);assert.equal(result.delivery,'sent');assert.equal(delivered.length,1);assert.equal(delivered[0].chat_id,12345);
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:1,state});
assert.equal(result.saved,true);assert.equal(delivered.length,1);assert.equal(book.getSheetByName('Results').rows.length,2);
assert.equal(context.tutoringCall({action:'load',unit:'street-style',initData:login(222)}).state,null);
assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:0,state}).conflict,true);
assert.equal(props.TG_CHAT_ID,'-100999999');
delete props.TUTORING_TEACHER_CHAT_ID;context.tutoringUser_(login(333,'nebutton'));assert.equal(props.TUTORING_TEACHER_CHAT_ID,'333');assert.throws(()=>context.tutoringUser_(login(444,'nebutton')),/already bound/);
failTelegram=true;assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(555),revision:0,state}).delivery,'pending');
failTelegram=false;context.tutoringCall({action:'load',unit:'street-style',initData:login(333,'nebutton')});assert.equal(book.getSheetByName('Results').rows.at(-1)[6],'sent');assert.equal(props.TG_CHAT_ID,'-100999999');
props.TUTORING_LEARNER_USERNAME='sonic_xxy';props.TUTORING_LEARNER_NAME='Configured learner';
context.tutoringUser_(login(666,'someone_else'));assert.equal(props.TUTORING_LEARNER_ID,undefined);
assert.equal(context.tutoringUser_(login(777,'sonic_xxy')).first_name,'Configured learner');assert.equal(props.TUTORING_LEARNER_ID,'777');
assert.throws(()=>context.tutoringUser_(login(888,'sonic_xxy')),/already bound/);
assert.equal(context.tutoringUser_(login(777,'new_handle')).first_name,'Configured learner');
assert.equal(props.TUTORING_TEACHER_CHAT_ID,'333');assert.equal(props.TG_CHAT_ID,'-100999999');
console.log('PASS: verified learner binding, renamed handle, impersonation rejection; previous checks.');
console.log('PASS: signed identity, tampering, expiry, duplicate fields, user isolation, revision conflict, idempotent private delivery, eHW unchanged.');

context.tutoringCall({action:'save',unit:'street-style',initData:login(777,'new_handle'),revision:0,state:{xp:0,days:{},badges:[]}});
assert.equal(props.TUTORING_LEARNER_LAST_PRACTICE_DAY,undefined);
context.tutoringCall({action:'save',unit:'street-style',initData:login(777,'new_handle'),revision:1,state:{xp:10,days:{day1:{index:1,complete:false}},badges:[]}});
assert.equal(props.TUTORING_LEARNER_LAST_PRACTICE_DAY,'2026-10-01');
console.log('PASS: simple login/save does not suppress reminders; actual answer progress does.');
