const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const props={TG_TOKEN:'TEST_ONLY',TUTORING_SHEET_ID:'private',TUTORING_LEARNER_ID:'777',TUTORING_NOTIFICATIONS_ENABLED:'true'};
const payloads=[],logs=[];let fail=false;
const sheet=name=>({name,rows:[],appendRow(row){this.rows.push(row);return this},getDataRange(){return{getValues:()=>this.rows.map(row=>[...row])}},getRange(row,col){return{setValue:value=>{this.rows[row-1][col-1]=value}}}});
const book={sheets:{},getSheetByName(name){return this.sheets[name]},insertSheet(name){return this.sheets[name]=sheet(name)}};
const context=vm.createContext({Date,JSON,Number,String,Object,Array,Math,
 Logger:{log:value=>logs.push(value)},PropertiesService:{getScriptProperties:()=>({getProperty:key=>props[key],setProperty:(key,value)=>props[key]=value})},
 SpreadsheetApp:{openById:()=>book},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 UrlFetchApp:{fetch:(url,options)=>{if(options&&options.method==='post'){if(fail)throw Error('Synthetic send failure');const payload=JSON.parse(options.payload);assert.equal(payload.chat_id,777);payloads.push(payload);return{getContentText:()=>JSON.stringify({ok:true,result:{message_id:payloads.length}})}}return{getResponseCode:()=>200}}}
});
vm.runInContext(fs.readFileSync(__dirname+'/backend/TutoringHomework.js','utf8'),context);
const day={complete:true,completedAt:'2026-10-02T12:00:00Z',index:1,correct:1};const first={days:{day1:day}};
context.tutoringQueueCompletions_({id:888},first,null);assert.equal(payloads.length,0);
context.tutoringQueueCompletions_({id:777},first,null);assert.equal(payloads.length,1);assert.match(payloads[0].text,/Day 1 is done/);
context.tutoringQueueCompletions_({id:777},first,null);context.tutoringQueueCompletions_({id:777},first,first);assert.equal(payloads.length,1);
const week={days:Object.fromEntries([1,2,3,4,5,6,7].map(number=>['day'+number,day]))};
context.tutoringQueueCompletions_({id:777},week,first);assert.equal(payloads.length,2);assert.match(payloads[1].text,/Seven days done/);
const second={days:{day1:day,day2:day}};fail=true;context.tutoringQueueCompletions_({id:777},second,first);assert.equal(book.sheets.Notifications.rows.at(-1)[5],'pending');
fail=false;context.tutoringFlushNotifications_();assert.equal(payloads.length,3);assert.equal(book.sheets.Notifications.rows.at(-1)[5],'sent');
assert.equal(context.tutoringReminderPlan_({days:{}},'2026-10-03',null,null,'2026-10-01').type,'return_after_break');
assert.equal(context.tutoringReminderPlan_({days:{day1:{index:1}}},'2026-10-02',null,null,'2026-10-01').type,'continue');
assert.equal(context.tutoringReminderPlan_({days:{}},'2026-10-02',null,null,'2026-10-01').type,'start');
context.notifyTutoringFeedback();context.notifyTutoringNewUnit();assert.equal(payloads.length,3);
props.TUTORING_READY_FEEDBACK=JSON.stringify({id:'feedback-1',text:'Great work with your new words!'});context.notifyTutoringFeedback();context.notifyTutoringFeedback();assert.equal(payloads.length,4);assert.match(payloads[3].text,/Great work with your new words/);
props.TUTORING_READY_UNIT=JSON.stringify({id:'unit-2',title:'Test published unit',url:'https://2rister.github.io/english-hw/test-unit/'});context.notifyTutoringNewUnit();assert.equal(payloads.length,5);assert.equal(payloads[4].reply_markup.inline_keyboard[0][0].web_app.url,'https://2rister.github.io/english-hw/test-unit/');
props.TUTORING_READY_FEEDBACK='{}';assert.throws(()=>context.notifyTutoringFeedback(),/stable ID/);
props.TUTORING_READY_UNIT=JSON.stringify({id:'bad',title:'No',url:'https://example.com/'});assert.throws(()=>context.notifyTutoringNewUnit(),/Published/);
assert.equal(book.sheets.Notifications.rows.length,6);
console.log('PASS: seven distinct reasons, private target, day/week completion without double reward, event dedupe/retry, no fabricated announcements, published-unit validation, inactivity priority and continue/start variants.');
