const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const props = {TG_TOKEN:'123456789:TEST_ONLY',TG_CHAT_ID:'-100999999',TUTORING_TEACHER_CHAT_ID:'12345'};
const delivered = [], logs = [];
let book, failTelegram=false, failEdit=false;
const sheet = name => ({name,rows:[],appendRow(row){this.rows.push(row);return this;},getDataRange(){return {getValues:()=>this.rows.map(row=>[...row])};},getRange(row,col){return {setValues:values=>{values[0].forEach((value,offset)=>{this.rows[row-1][col-1+offset]=value;});},setValue:value=>{this.rows[row-1][col-1]=value;}};},setName(value){this.name=value;return this;}});
const context = vm.createContext({Date,JSON,Number,String,Object,Array,Number,Math,
  Logger:{log:value=>logs.push(String(value))},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>{props[key]=value;},deleteProperty:key=>{delete props[key];}})},
  Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:()=> '2026-10-01',newBlob:value=>({getBytes:()=>Buffer.from(value)}),computeHmacSha256Signature:(value,key)=>[...crypto.createHmac('sha256',Buffer.from(key)).update(Buffer.from(value)).digest()]},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  SpreadsheetApp:{create:()=>{book={sheets:[sheet('Sheet1')],getId:()=> 'private-book',getSheets(){return this.sheets;},insertSheet(name){const s=sheet(name);this.sheets.push(s);return s;},getSheetByName(name){return this.sheets.find(s=>s.name===name);}};return book;},openById:id=>{assert.equal(id,'private-book');return book;},flush(){}},
  UrlFetchApp:{fetch:(url,options)=>{if(failTelegram)throw new Error('Synthetic delivery failure');const method=url.split('/').at(-1),payload=JSON.parse(options.payload);if(failEdit && method==='editMessageText')return {getContentText:()=>JSON.stringify({ok:false,description:failEdit==='not-modified'?'Bad Request: message is not modified':'Bad Request: message to edit not found'})};assert.ok(method !== 'sendMessage' || payload.chat_id>0);delivered.push({method,...payload});return {getContentText:()=>JSON.stringify({ok:true,result:{message_id:100+delivered.length}})};}}
});
vm.runInContext(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),context);
function login(id,username='learner',age=0){
  const fields={auth_date:String(Math.floor(Date.now()/1000)-age),user:JSON.stringify({id,username,first_name:'Synthetic'})};
  const check=Object.keys(fields).sort().map(key=>key+'='+fields[key]).join('\n');
  const secret=crypto.createHmac('sha256','WebAppData').update(props.TG_TOKEN).digest();
  fields.hash=crypto.createHmac('sha256',secret).update(check).digest('hex');
  return new URLSearchParams(fields).toString();
}
const state={xp:10,badges:[],days:{day1:{complete:true,completedAt:'2026-10-01T12:00:00Z',index:1,correct:1,answers:[{q:'Synthetic',correct:true,firstTry:false,wrong:['Incorrect'],expected:'Correct'}]}}};
assert.throws(()=>context.tutoringUser_(login(111).replace('Synthetic','Tampered')),/verified/);
assert.throws(()=>context.tutoringUser_(login(111,'learner',86401)),/reopen/);
assert.throws(()=>context.tutoringUser_(login(111)+'&user=bad'),/Duplicate/);
let result=context.tutoringCall({action:'load',unit:'street-style',initData:login(111)});
assert.equal(result.state,null);
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:0,state});
assert.equal(result.saved,true);assert.equal(result.delivery,'sent');assert.equal(delivered.length,1);assert.equal(delivered[0].chat_id,12345);
assert.match(delivered[0].text,/Задание: Synthetic/);assert.match(delivered[0].text,/Её попытки: Incorrect/);assert.match(delivered[0].text,/Правильный ответ: Correct/);
assert.match(delivered[0].text,/I chose “Incorrect” because ___/);assert.match(delivered[0].text,/I can use “Correct” in this sentence: ___/);
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:1,state});
assert.equal(result.saved,true);assert.equal(delivered.length,1);assert.equal(book.getSheetByName('Results').rows.length,2);
assert.equal(book.getSheetByName('Recovery').rows.length,3);assert.equal(book.getSheetByName('Recovery').rows[1][2],1);assert.equal(book.getSheetByName('Recovery').rows[2][2],2);
const partial={xp:10,badges:[],days:{day1:{complete:false,index:1,correct:1,attempts:2,answers:[{q:'In progress',correct:true,firstTry:false,wrong:['Wrong'],expected:'Right'}]}}};
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(223),revision:0,state:partial});
assert.equal(result.delivery,'sent');assert.equal(delivered.at(-1).method,'sendMessage');assert.equal(book.getSheetByName('Results').rows.length,3);
const updated=JSON.parse(JSON.stringify(partial));updated.days.day1.index=2;updated.days.day1.correct=2;updated.days.day1.answers.push({q:'New answer',correct:true,firstTry:true,wrong:[],expected:'New answer'});
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(223),revision:1,state:updated});
assert.equal(result.delivery,'sent');assert.equal(delivered.at(-1).method,'editMessageText');assert.equal(book.getSheetByName('Results').rows.length,3);
failEdit=true;const replacement=JSON.parse(JSON.stringify(updated));replacement.days.day1.index=3;replacement.days.day1.answers.push({q:'Replacement',correct:true,firstTry:true,wrong:[],expected:'Replacement'});
result=context.tutoringCall({action:'save',unit:'street-style',initData:login(223),revision:2,state:replacement});failEdit=false;
assert.equal(result.delivery,'sent');assert.equal(delivered.at(-1).method,'sendMessage');assert.notEqual(book.getSheetByName('Results').rows[2][7],103);
assert.equal(context.tutoringCall({action:'load',unit:'street-style',initData:login(222)}).state,null);
assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(111),revision:0,state}).conflict,true);
assert.equal(props.TG_CHAT_ID,'-100999999');
delete props.TUTORING_TEACHER_CHAT_ID;context.tutoringUser_(login(333,'nebutton'));assert.equal(props.TUTORING_TEACHER_CHAT_ID,'333');assert.throws(()=>context.tutoringUser_(login(444,'nebutton')),/already bound/);
failTelegram=true;assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(555),revision:0,state}).delivery,'pending');
assert.match(logs.at(-1),/private_report_delivery_failed.*transport_or_response_error/);assert.doesNotMatch(logs.at(-1),/Synthetic/);
failTelegram=false;context.tutoringCall({action:'load',unit:'street-style',initData:login(333,'nebutton')});assert.equal(book.getSheetByName('Results').rows.at(-1)[6],'sent');assert.equal(props.TG_CHAT_ID,'-100999999');
assert.match(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),/tutoringFlushPending_\(tutoringWorkbook_\(\)\)/);
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

// Preview: the bound tutor can read the learner's progress, and only the tutor can.
const previewSource = context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).state;
const preview = context.tutoringCall({action:'preview',unit:'street-style',initData:login(333)});
assert.equal(preview.preview,true);assert.equal(preview.readOnly,true);assert.equal(preview.learner.id,777);
assert.deepEqual(preview.state,previewSource);
assert.throws(()=>context.tutoringCall({action:'preview',unit:'street-style',initData:login(777)}),/tutor account/);
assert.deepEqual(context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).state,previewSource,'preview must not change the learner state');

// Browser preview link: the tutor gets a token, the token reads her state and can do nothing else.
const linkPreview = context.tutoringCall({action:'preview',unit:'street-style',initData:login(333)});
assert.ok(String(linkPreview.browserToken).length > 20, 'the tutor is handed a shareable link token');
const viaToken = context.tutoringCall({action:'preview',unit:'street-style',previewToken:linkPreview.browserToken});
assert.equal(viaToken.preview,true); assert.deepEqual(viaToken.state,previewSource);
assert.equal(viaToken.browserToken,undefined,'a token request must not hand out another token');
assert.throws(()=>context.tutoringCall({action:'preview',unit:'street-style',previewToken:'0'.repeat(64)}),/not valid/);
// the shared link: anyone holding it can read, and it cannot do anything else
const shared = /TUTORING_PREVIEW_LINK = '([^']+)'/.exec(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'))[1];
assert.equal(linkPreview.browserToken,shared,'the tutor is handed the shareable link');
const sharedView = context.tutoringCall({action:'preview',unit:'street-style',previewToken:shared});
assert.equal(sharedView.preview,true);assert.deepEqual(sharedView.state,previewSource);assert.equal(sharedView.readOnly,true);
assert.throws(()=>context.tutoringCall({action:'save',unit:'street-style',previewToken:shared,revision:0,state:{xp:0,days:{},badges:[]}}),/read-only/);
assert.throws(()=>context.tutoringCall({action:'load',unit:'street-style',previewToken:shared}),/read-only/);
assert.throws(()=>context.tutoringCall({action:'preview',unit:'street-style',previewToken:shared.slice(0,-1)+'x'}),/not valid/);
assert.throws(()=>context.tutoringCall({action:'save',unit:'street-style',previewToken:linkPreview.browserToken,revision:0,state:{xp:0,days:{},badges:[]}}),/read-only/);
assert.throws(()=>context.tutoringCall({action:'load',unit:'street-style',previewToken:linkPreview.browserToken}),/read-only/);
assert.deepEqual(context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).state,previewSource,'the token path must not change the learner state');

// A state that lost a finished day is rebuilt from the learner's own Recovery history.
const rich = {xp:150,badges:['gap'],days:{day1:{index:20,correct:18,attempts:20,complete:true,score:90,completedAt:'2026-10-09T10:00:00Z',runs:[{at:'2026-10-09T10:00:00Z',score:90,correct:18,total:20}],answers:[{q:'Synthetic',correct:true,expected:'Correct'}]}}};
const liveRevision = context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).revision;
assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(777),revision:liveRevision,state:rich}).ok,true);
const wiped = {xp:10,badges:[],days:{day1:{index:0,correct:0,attempts:0,complete:false,answers:[]}}};
assert.equal(context.tutoringCall({action:'save',unit:'street-style',initData:login(777),revision:liveRevision+1,state:wiped}).ok,true);
const healed = context.tutoringCall({action:'load',unit:'street-style',initData:login(777)});
assert.equal(healed.state.days.day1.complete,true,'a finished day must survive a wiping save');
assert.equal(healed.state.days.day1.score,90);
assert.equal(healed.state.xp,150);
assert.ok(healed.recovered>=1,'the tutor is told how many days were restored');
assert.ok(healed.history.snapshots>=2,'her snapshots are reported');
const teacherView = context.tutoringCall({action:'preview',unit:'street-style',initData:login(333)});
assert.equal(teacherView.state.days.day1.complete,true,'the preview sees the healed state too');
assert.ok(teacherView.progressRow.days.day1.complete!==true,'the raw Progress row is reported separately');
assert.equal(context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).state.days.day1.complete,true,'healing is stable on the next load');

// deviceDump: the learner's whole device storage is snapshotted to the private workbook on open.
const dumpResult = context.tutoringCall({action:'deviceDump',unit:'street-style',initData:login(777),dump:JSON.stringify({street_style:'{"days":{"day4":{"complete":true}}}'})});
assert.equal(dumpResult.ok,true);
assert.throws(()=>context.tutoringCall({action:'deviceDump',unit:'street-style',initData:login(777),dump:'x'.repeat(45001)}),/too large/);
const dumpSheet = book.getSheetByName('DeviceDumps');
assert.ok(dumpSheet, 'DeviceDumps sheet is created');
const teacherDump = context.tutoringCall({action:'preview',unit:'street-style',initData:login(333)});
assert.equal(teacherDump.deviceDumps.count>=1,true,'the preview reports the device dump');
assert.match(String(teacherDump.deviceDumps.latest.dump),/day4/);
console.log('PASS: simple login/save does not suppress reminders; actual answer progress does.');

const grammarState={kind:'grammar-snack-01',variantIndex:1,history:[],current:{id:'v01-synthetic',variantId:'01',index:1,correct:1,complete:false,answers:[{id:'1',type:'stateVerb',q:'Synthetic grammar prompt',wrong:['am knowing'],expected:'know',feedback:'Know is a state verb. Use the Present Simple.'}],errorEvents:[{id:'theory-1',type:'theory',q:'Every day, Mia walks to college.',wrong:'is walking',expected:'walks',feedback:'Every day shows a habit, so use Present Simple.'},{id:'1',q:'Synthetic grammar prompt',wrong:'am knowing',expected:'know',feedback:'Know is a state verb. Use the Present Simple.'}]}};
const grammarSendsBefore=delivered.filter(item=>item.method==='sendMessage'&&/Grammar Snack 01/.test(item.text)).length;
result=context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(777,'new_handle'),revision:0,state:grammarState});
assert.equal(result.saved,true);assert.equal(result.delivery,'sent');
assert.equal(delivered.filter(item=>item.method==='sendMessage'&&/Grammar Snack 01/.test(item.text)).length,grammarSendsBefore+1);
const grammarInitial=delivered.filter(item=>/Grammar Snack 01/.test(item.text)).at(-1).text;
assert.match(grammarInitial,/Synthetic grammar prompt/);assert.match(grammarInitial,/✗ am knowing → ✓ know/);assert.match(grammarInitial,/Know is a state verb/);assert.match(grammarInitial,/Every day, Mia walks to college/);assert.match(grammarInitial,/✗ is walking → ✓ walks/);
assert.equal(book.getSheetByName('Results').rows.filter(row=>row[1]==='777'&&row[2]==='grammar-snack-01-error').length,0);
const theoryOnly={kind:'grammar-snack-01',variantIndex:0,history:[],theoryStep:0,theoryDone:false,current:{id:'theory-only-synthetic',variantId:'01',phase:'theory',index:0,correct:0,answers:[],errorEvents:[{id:'theory-error-1',type:'theory',q:'Every day, Mia walks to college.',wrong:'is walking',expected:'walks',feedback:'Every day shows a habit, so use Present Simple.'}],complete:false}};
const sentBeforeTheory=delivered.filter(item=>item.method==='sendMessage').length;
props.TUTORING_LEARNER_ID='779';
result=context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(779,'theory_only'),revision:0,state:theoryOnly});
assert.equal(result.saved,true);assert.equal(result.delivery,'sent');
assert.equal(delivered.filter(item=>item.method==='sendMessage').length,sentBeforeTheory+1);
assert.equal(delivered.filter(item=>/Grammar Snack · новая ошибка/.test(item.text)).length,0);
const theorySummary=delivered.filter(item=>/Grammar Snack 01/.test(item.text)).at(-1).text;
assert.match(theorySummary,/0\/0/);assert.match(theorySummary,/Every day, Mia walks to college/);assert.match(theorySummary,/✗ is walking → ✓ walks/);assert.match(theorySummary,/Every day shows a habit/);
const resultsSheet=book.getSheetByName('Results');
resultsSheet.appendRow(['780|grammar-snack-01|legacy|error|legacy-1','780','grammar-snack-01-error','01',new Date(),JSON.stringify({id:'legacy-1',q:'Legacy question',wrong:'legacy wrong',expected:'legacy right',feedback:'Legacy rule'}),'pending','']);
const legacyAttempt={kind:'grammar-snack-01',variantIndex:1,history:[],current:{id:'legacy-migration',variantId:'01',index:0,correct:0,answers:[],errorEvents:[{id:'new-legacy-test',q:'New question',wrong:'wrong',expected:'right',feedback:'New rule'}],complete:false}};
const legacySendsBefore=delivered.filter(item=>item.method==='sendMessage'&&/Grammar Snack 01/.test(item.text)).length;
props.TUTORING_LEARNER_ID='780';
context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(780,'legacy_student'),revision:0,state:legacyAttempt});
assert.equal(delivered.filter(item=>item.method==='sendMessage'&&/Grammar Snack 01/.test(item.text)).length,legacySendsBefore+1);
assert.match(delivered.filter(item=>/Grammar Snack 01/.test(item.text)).at(-1).text,/Legacy question/);
assert.equal(resultsSheet.rows.find(row=>row[0]==='780|grammar-snack-01|legacy|error|legacy-1')[6],'superseded');
let migrated=context.tutoringCall({action:'load',unit:'grammar-snack-01',initData:login(780,'legacy_student')}).state;
assert.ok(migrated.current.errorEvents.some(event=>event.id==='legacy-1'));
context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(780,'legacy_student'),revision:1,state:migrated});
migrated=context.tutoringCall({action:'load',unit:'grammar-snack-01',initData:login(780,'legacy_student')}).state;
assert.ok(migrated.current.errorEvents.some(event=>event.id==='legacy-1'));
assert.equal(delivered.filter(item=>/Grammar Snack · новая ошибка/.test(item.text)).length,0);
const grammarUpdated=JSON.parse(JSON.stringify(grammarState));grammarUpdated.current.index=2;grammarUpdated.current.correct=2;grammarUpdated.current.answers.push({id:'2',type:'meaning',q:'Second synthetic prompt',wrong:[],expected:'works',feedback:'Use the Present Simple for routines.'});
props.TUTORING_LEARNER_ID='777';
result=context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(777,'new_handle'),revision:1,state:grammarUpdated});
assert.equal(result.saved,true);assert.equal(delivered.at(-1).method,'editMessageText');
assert.equal(book.getSheetByName('Results').rows.filter(row=>row[1]==='777'&&row[2]==='grammar-snack-01').length,1);
const currentGrammarProgress=book.getSheetByName('Progress').rows.find(row=>row[0]==='777'&&row[1]==='grammar-snack-01');
const currentGrammarReport=book.getSheetByName('Results').rows.find(row=>row[1]==='777'&&row[2]==='grammar-snack-01');
currentGrammarReport[6]='pending';failEdit='not-modified';
assert.equal(context.tutoringDeliver_(book.getSheetByName('Results'),{id:777,first_name:'Synthetic'},JSON.parse(currentGrammarProgress[4]),'grammar-snack-01'),'sent');
failEdit=false;assert.equal(currentGrammarReport[6],'sent');
assert.throws(()=>context.tutoringCall({action:'save',unit:'grammar-snack-01',initData:login(777,'new_handle'),revision:2,state:{kind:'grammar-snack-01'}}),/Invalid grammar progress/);
const allWrong={variantId:'10',index:20,correct:0,complete:true,score:0,errorEvents:Array.from({length:25},(_,i)=>({q:'Context sentence '+(i+1),wrong:['wrong '+(i+1)],expected:'correct '+(i+1),feedback:'Use the correct grammar rule.'}))};
const compactReport=context.tutoringGrammarReport_({first_name:'Synthetic'},allWrong);
assert.ok(compactReport.length <= 4096);assert.match(compactReport,/Context sentence 1/);assert.match(compactReport,/Context sentence 25/);assert.match(compactReport,/✗ wrong 25 → ✓ correct 25/);
const overflowReport=context.tutoringGrammarReport_({first_name:'Synthetic'},{...allWrong,errorEvents:[...allWrong.errorEvents,{q:'Context sentence 26',wrong:'wrong 26',expected:'correct 26',feedback:'Use the correct grammar rule.'}]});
assert.match(overflowReport,/Показаны 25 ошибок из 26; полный контекст сохранён в Recovery\./);assert.doesNotMatch(overflowReport,/Context sentence 26/);
const mixedHistory=context.tutoringGrammarReport_({first_name:'Synthetic'},{variantId:'01',index:2,correct:0,answers:[{q:'Old wrong answer',wrong:['went'],expected:'go',feedback:'Use the base form.'},{q:'Repeated event',wrong:['is knowing'],expected:'know'}],errorEvents:[{q:'Repeated event',wrong:'is knowing',expected:'know'}]});
assert.match(mixedHistory,/Old wrong answer/);assert.equal((mixedHistory.match(/Repeated event/g)||[]).length,1);
console.log('PASS: Grammar Snack combines theory and mastery errors in one editable report, migrates legacy rows, and bounds reports to 25 errors.');

// Browser handoff reuses the same rows; credentials never encode learner records.
props.TUTORING_LEARNER_ID='777';
assert.throws(()=>context.tutoringCall({action:'browserLink',initData:login(111)}),/enrolled learner/);
assert.throws(()=>context.tutoringCall({action:'browserLink',previewToken:'synthetic'}),/read-only/);
const handoff=context.tutoringCall({action:'browserLink',initData:login(777)});
assert.match(handoff.code,/^[a-f0-9]{64}$/);
assert.ok(!JSON.stringify(props).includes(handoff.code));
const paired=context.tutoringCall({action:'browserExchange',browserCode:handoff.code});
assert.equal(paired.userId,777);
assert.throws(()=>context.tutoringCall({action:'browserExchange',browserCode:handoff.code}),/expired/);
assert.ok(!JSON.stringify(props).includes(paired.browserSession));
assert.equal(context.tutoringCall({action:'browserIdentity',browserSession:paired.browserSession}).userId,777);
const saved=context.tutoringCall({action:'load',unit:'street-style',browserSession:paired.browserSession});
assert.equal(saved.revision,context.tutoringCall({action:'load',unit:'street-style',initData:login(777)}).revision);
const browserSave=context.tutoringCall({action:'save',unit:'street-style',browserSession:paired.browserSession,revision:saved.revision,state:saved.state||{xp:0,days:{},badges:[]}});
assert.equal(browserSave.saved,true);
assert.throws(()=>context.tutoringCall({action:'load',unit:'street-style',browserSession:'0'.repeat(64)}),/expired/);
context.tutoringCall({action:'browserRevoke',browserSession:paired.browserSession});
assert.throws(()=>context.tutoringCall({action:'browserIdentity',browserSession:paired.browserSession}),/expired/);
const expiring=context.tutoringCall({action:'browserLink',initData:login(777)});
const expiringKey='TUTORING_HANDOFF_'+context.tutoringBrowserDigest_(expiring.code);
props[expiringKey]=JSON.stringify({id:'777',expires:Date.now()-1});
assert.throws(()=>context.tutoringCall({action:'browserExchange',browserCode:expiring.code}),/expired/);
const other=context.tutoringCall({action:'browserLink',initData:login(777)});
const otherSession=context.tutoringCall({action:'browserExchange',browserCode:other.code});
props['TUTORING_SESSION_'+context.tutoringBrowserDigest_(otherSession.browserSession)]=JSON.stringify({id:'777',expires:Date.now()-1});
assert.throws(()=>context.tutoringCall({action:'browserIdentity',browserSession:otherSession.browserSession}),/expired/);
console.log('PASS: browser bound mint, digest-only storage, one-use exchange, same-row load/save, invalid/expiry/revoke, preview denied.');

assert.throws(()=>context.tutoringCall({action:'load',unit:'street-style',initData:login(333)}),/enrolled learner/);
assert.throws(()=>context.tutoringCall({action:'save',unit:'street-style',initData:login(111),state:{}}),/enrolled learner/);
assert.equal(context.tutoringCall({action:'preview',unit:'street-style',initData:login(333)}).readOnly,true);
console.log('PASS: enrolled-only load/save, teacher preview remains read-only.');

context.ContentService={MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})};
vm.runInContext(fs.readFileSync(__dirname+'/backend/Code.js','utf8'),context);
const identityLink=context.tutoringCall({action:'browserLink',initData:login(777)});
const identitySession=context.tutoringCall({action:'browserExchange',browserCode:identityLink.code});
const identityResponse=JSON.parse(context.doPost({postData:{contents:JSON.stringify({action:'browserIdentity',browserSession:identitySession.browserSession,userId:111,url:'https://evil.invalid'})}}).text);
assert.deepEqual(identityResponse,{ok:true,userId:777});
for(const body of ['bad',JSON.stringify({action:'save',state:{}}),JSON.stringify({action:'browserIdentity',browserSession:'0'.repeat(64)})])assert.equal(JSON.parse(context.doPost({postData:{contents:body}}).text).ok,false);
console.log('PASS: HTTP bridge returns verified identity only and rejects unrelated actions or credentials.');
