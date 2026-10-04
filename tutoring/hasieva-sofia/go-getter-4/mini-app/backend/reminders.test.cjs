const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const props={TG_TOKEN:'TEST_ONLY',TUTORING_LEARNER_ID:'777',TUTORING_TEACHER_CHAT_ID:'333',TUTORING_REMINDERS_ENABLED:'true'};
let hour='19',minute='0',failure=false,triggerCount=0,state={days:{}},payloads=[];
const triggers=[];
const context=vm.createContext({Date,JSON,Number,String,Object,Array,Math,Logger:{log(){}},
 PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>{props[key]=value;}})},
 Utilities:{formatDate:(date,tz,format)=>{assert.equal(tz,'Europe/Moscow');return format==='H'?hour:format==='m'?minute:'2026-10-02';}},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getDataRange:()=>({getValues:()=>[['header'],['777','street-style',0,new Date(),JSON.stringify(state)]]})})})},
 UrlFetchApp:{fetch:(url,options)=>{if(failure)throw Error('Synthetic Telegram outage');const payload=JSON.parse(options.payload);payloads.push(payload);return{getContentText:()=>JSON.stringify({ok:true,result:{message_id:900}})}}},
 ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this},everyMinutes(value){assert.equal(value,15);return this},create(){triggerCount++;triggers.push({getHandlerFunction:()=>name});}}),deleteTrigger:trigger=>triggers.splice(triggers.indexOf(trigger),1)}
});
props.TUTORING_SHEET_ID='private-book';vm.runInContext(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),context);
context.enableTutoringReminders();context.enableTutoringReminders();assert.equal(triggerCount,1);
hour='18';context.sendTutoringReminder();assert.equal(payloads.length,0);
hour='19';props.TUTORING_LEARNER_LAST_PRACTICE_DAY='2026-10-02';context.sendTutoringReminder();assert.equal(payloads.length,0);
delete props.TUTORING_LEARNER_LAST_PRACTICE_DAY;context.sendTutoringReminder();assert.equal(payloads.length,1);assert.equal(payloads[0].chat_id,777);
assert.equal(payloads[0].reply_markup.inline_keyboard[0][0].web_app.url,'https://2rister.github.io/english-hw/street-style-week/');
context.sendTutoringReminder();assert.equal(payloads.length,1);
delete props.TUTORING_REMINDER_SENT_DAY;state={days:Object.fromEntries([1,2,3,4,5,6,7].map(day=>['day'+day,{complete:true}]))};context.sendTutoringReminder();assert.equal(payloads.length,1);
state={days:{day1:{complete:true},day2:{index:2}}};failure=true;assert.throws(()=>context.sendTutoringReminder(),/outage/);assert.equal(props.TUTORING_REMINDER_SENT_DAY,undefined);
failure=false;context.sendTutoringReminder();assert.match(payloads[1].text,/Continue Street Style, Day 2/);assert.equal(props.TUTORING_REMINDER_SENT_DAY,'2026-10-02');
context.pauseTutoringReminders();assert.equal(triggers.length,0);delete props.TUTORING_REMINDER_SENT_DAY;context.sendTutoringReminder();assert.equal(payloads.length,2);
console.log('PASS: private learner only, schedule window, practice suppression, completed unit stop, once per day, failed-send retry, direct Mini App button, idempotent trigger, pause.');
