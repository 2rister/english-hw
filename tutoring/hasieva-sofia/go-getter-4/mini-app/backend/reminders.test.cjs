const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const props={TG_TOKEN:'TEST_ONLY',TUTORING_LEARNER_ID:'777',TUTORING_TEACHER_CHAT_ID:'333',TUTORING_REMINDERS_ENABLED:'true'};
let hour='19',minute='0',failure=false,triggerCount=0,state={days:{}},payloads=[];
const resultRows=[['Key','Telegram ID','Unit','Day','Completed','Evidence','Private delivery','Teacher message ID']];
const progressRows=[['Telegram ID','Unit','Revision','Saved','State'],['777','street-style',0,new Date(),JSON.stringify(state)]];
const recoveryRows=[['Telegram ID','Unit','Revision','Saved','State']];
const mockSheet=(rows)=>({appendRow:row=>rows.push(row),getDataRange:()=>({getValues:()=>rows.map(row=>row.slice())}),getRange:(row,col)=>({setValue:value=>{rows[row-1][col-1]=value;},setValues:values=>values[0].forEach((value,index)=>{rows[row-1][col-1+index]=value;})})});
const triggers=[];
const context=vm.createContext({Date,JSON,Number,String,Object,Array,Math,Logger:{log(){}},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>{props[key]=value;}})},
 Utilities:{formatDate:(date,tz,format)=>{assert.equal(tz,'Europe/Moscow');return format==='H'?hour:format==='m'?minute:'2026-10-02';}},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='Results'?mockSheet(resultRows):name==='Progress'?{...mockSheet(progressRows),getDataRange:()=>({getValues:()=>{progressRows[1][4]=JSON.stringify(state);return progressRows.map(row=>row.slice());}})}:mockSheet(recoveryRows)}),flush(){ }},
 UrlFetchApp:{fetch:(url,options)=>{if(failure)throw Error('Synthetic Telegram outage');const payload=JSON.parse(options.payload);payloads.push(payload);return{getContentText:()=>JSON.stringify({ok:true,result:{message_id:900}})}}},
 ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this},everyMinutes(value){assert.equal(value,15);return this},create(){triggerCount++;triggers.push({getHandlerFunction:()=>name});}}),deleteTrigger:trigger=>triggers.splice(triggers.indexOf(trigger),1)}
});
props.TUTORING_SHEET_ID='private-book';vm.runInContext(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),context);
context.enableTutoringReminders();context.enableTutoringReminders();assert.equal(triggerCount,1);
resultRows.push(['legacy|grammar','777','grammar-snack-01-error','01',new Date(),JSON.stringify({id:'legacy-error',q:'Legacy pending question',wrong:'wrong',expected:'right',feedback:'Synthetic reason'}),'pending','']);
progressRows.push(['777','grammar-snack-01',0,new Date(),JSON.stringify({kind:'grammar-snack-01',current:{id:'pending-test',variantId:'01',index:1,correct:0,answers:[],errorEvents:[{q:'Pending report question',wrong:'wrong',expected:'right',feedback:'Synthetic reason'}]}})]);
hour='18';context.sendTutoringReminder();assert.equal(payloads.length,1);assert.equal(payloads[0].chat_id,333);assert.match(payloads[0].text,/Pending report question/);assert.match(payloads[0].text,/Legacy pending question/);assert.equal(resultRows[1][6],'superseded');
payloads.length=0;
hour='19';props.TUTORING_LEARNER_LAST_PRACTICE_DAY='2026-10-02';context.sendTutoringReminder();assert.equal(payloads.length,0);
delete props.TUTORING_LEARNER_LAST_PRACTICE_DAY;context.sendTutoringReminder();assert.equal(payloads.length,1);assert.equal(payloads[0].chat_id,777);
assert.equal(payloads[0].reply_markup.inline_keyboard[0][0].web_app.url,'https://2rister.github.io/english-hw/street-style-week/');
context.sendTutoringReminder();assert.equal(payloads.length,1);
delete props.TUTORING_REMINDER_SENT_DAY;state={days:Object.fromEntries([1,2,3,4,5,6,7].map(day=>['day'+day,{complete:true}]))};context.sendTutoringReminder();assert.equal(payloads.length,1);
state={days:{day1:{complete:true},day2:{index:2}}};failure=true;assert.throws(()=>context.sendTutoringReminder(),/outage/);assert.equal(props.TUTORING_REMINDER_SENT_DAY,undefined);
failure=false;context.sendTutoringReminder();assert.match(payloads[1].text,/Continue Street Style, Day 2/);assert.equal(props.TUTORING_REMINDER_SENT_DAY,'2026-10-02');
context.pauseTutoringReminders();assert.equal(triggers.length,0);delete props.TUTORING_REMINDER_SENT_DAY;context.sendTutoringReminder();assert.equal(payloads.length,2);
console.log('PASS: private learner only, schedule window, practice suppression, completed unit stop, once per day, failed-send retry, direct Mini App button, idempotent trigger, pause.');
