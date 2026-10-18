/** Local synthetic browser gate. External requests are blocked in every context. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {publishRoot:root,servePublishRoot}=require('./e2e-server.cjs');
const content={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'street-style-week/content.js'),'utf8'),content);const data=content.window.QUEST_DATA;
const bank=JSON.parse(fs.readFileSync(path.join(root,'tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/vocab/unit2.json'),'utf8'));
async function readVocab(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('learncore-vocab-space-v1',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('profiles','readonly'),get=tx.objectStore('profiles').get('preview');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close()}}))}
async function waitVocab(page,predicate){for(let n=0;n<80;n++){const state=await readVocab(page);if(predicate(state))return state;await page.waitForTimeout(25)}throw Error('Synthetic IndexedDB state did not reach expected checkpoint')}
(async()=>{
 const {parseBank,choices,strip,theory}=await import('../frontend/react/grammar-data.mjs');
 const variants=parseBank(fs.readFileSync(path.join(root,'tutoring/hasieva-sofia/go-getter-4/grammar-snack-01/CONTENT_BANK.md'),'utf8'));
 const server=await servePublishRoot(),browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[];
 const dir=path.resolve(__dirname,'../artifacts');fs.mkdirSync(dir,{recursive:true});
 async function context(){const c=await browser.newContext({viewport:{width:390,height:844}});await c.addInitScript(origin=>{if(location.origin===origin)sessionStorage.setItem('learncore:halloween-boot:2026','1')},server.baseUrl);await c.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());c.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));return c}
 try{
  const c=await context(),page=await c.newPage();
  await page.goto(server.baseUrl+'/tutoring/');await page.locator('.unit-card').first().waitFor();assert.equal(await page.locator('#app').getAttribute('data-renderer'),'react');assert.equal(await page.locator('.unit-card').count(),3);
  await page.locator('#catalogMiso').click();await page.waitForTimeout(100);assert(await page.locator('.catalog-miso__reaction').first().getAttribute('src'));
  await page.screenshot({path:path.join(dir,'react-catalog-mobile.png'),fullPage:true});
  await page.locator('.unit-card').filter({hasText:'Street Style'}).click();await page.locator('#dayGrid').waitFor();await page.locator('.day-open').first().click();
  const first=data.days[0].questions[0];await page.getByRole('button',{name:first.options.find(value=>value!==first.a),exact:true}).click();await page.reload();await page.locator('#interaction').waitFor();await page.getByRole('button',{name:first.a,exact:true}).click();
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('street-style-quest-v1')));assert.equal(restored.days.day1.answers[0].firstTry,false);assert.equal(restored.days.day1.answers[0].wrong.length,1);
  await page.locator('#nextButton').click();
  const items=[...data.days[0].questions,...data.days[0].questions.filter(q=>['mc','type'].includes(q.type)).slice(0,6).map(q=>({...q,q:'Memory sprint · '+q.q}))];
  for(let i=1;i<items.length;i++){
   const item=items[i];await page.getByRole('heading',{name:item.q,exact:true}).waitFor();
   if(item.type==='mc'){await page.getByRole('button',{name:item.a,exact:true}).click();await page.locator('#nextButton').click()}
   else if(item.type==='type'){await page.locator('#answerInput').fill(item.a);await page.locator('#checkButton').click();await page.locator('#nextButton').click()}
   else if(item.type==='writing'){await page.locator('#writingBox').fill(Array(item.minWords).fill('synthetic').join(' '));for(const input of await page.locator('[data-check]').all())await input.check();await page.locator('#nextButton').click()}
   else{for(const input of await page.locator('[data-check]').all())await input.check();await page.locator('#nextButton').click()}
  }
  await page.locator('.completion').waitFor();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('street-style-quest-v1')));assert.equal(saved.days.day1.complete,true);assert.equal(saved.days.day1.runs.length,1);assert.equal(saved.days.day1.answers.length,items.length);
  await page.screenshot({path:path.join(dir,'react-street-completion.png'),fullPage:true});await page.reload();await page.locator('.attempt-list').waitFor();assert.equal(await page.locator('.attempt-list li').count(),1);await page.locator('#tryAgain').click();await page.locator('.review-answer.wrong').waitFor();assert.equal(await page.locator('.review-answer.ok').innerText(),first.a);
  const firstDay=saved.days.day1;
  for(const type of ['writing','speaking']){
   const dayIndex=data.days.findIndex(day=>day.questions.some(item=>item.type===type)),day=data.days[dayIndex],index=day.questions.findIndex(item=>item.type===type),item=day.questions[index];
   await page.evaluate(({id,index})=>{const state=JSON.parse(localStorage.getItem('street-style-quest-v1'));state.days[id]={index,correct:0,attempts:0,answers:[]};localStorage.setItem('street-style-quest-v1',JSON.stringify(state))},{id:day.id,index});
   await page.goto(server.baseUrl+'/street-style-week/#day-'+(dayIndex+1));await page.reload();await page.getByRole('heading',{name:item.q,exact:true}).waitFor();assert.equal(await page.locator('#nextButton').isDisabled(),true);
   if(type==='writing'){
    const draft=Array(item.minWords).fill('synthetic').join(' ');await page.locator('#writingBox').fill(draft);await page.reload();await page.locator('#writingBox').waitFor();assert.equal(await page.locator('#writingBox').inputValue(),draft);assert.equal(await page.locator('#nextButton').isDisabled(),true);
   }else await page.locator('#recordButton').waitFor();
   for(const input of await page.locator('[data-check]').all())await input.check();await page.locator('#nextButton').click();
   saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('street-style-quest-v1')));const answer=saved.days[day.id].answers.find(answer=>answer.q===item.q);assert.equal(answer.status,type==='writing'?'TEACHER_PENDING':'SELF_REPORTED');assert.equal(answer[type==='writing'?'production':'speaking'],true);assert.equal(saved.days[day.id].index,index+1);assert.deepEqual(saved.days.day1,firstDay);
   if(type==='writing'){assert.equal(answer.words,item.minWords);assert.equal(answer.text,Array(item.minWords).fill('synthetic').join(' '))}
  }
  console.log('PASS React Street Style: old-key restore, wrong evidence through reload, full day and sprint, history/review, authentic writing draft reload, speaking self-report, preserved first-day history.');
  await page.goto(server.baseUrl+'/grammar-snack-01/');await page.getByRole('heading',{name:'Present Simple vs Present Continuous'}).waitFor();assert.equal(await page.locator('#app').getAttribute('data-renderer'),'react');
  for(const item of theory){await page.getByRole('heading',{name:strip(item.q),exact:true}).waitFor();await page.getByRole('button',{name:item.answer,exact:true}).click()}
  await page.getByRole('button',{name:'Start mastery test →',exact:true}).click();
  const variant=variants[0];
  for(let i=0;i<variant.items.length;i++){
   const item=variant.items[i];await page.waitForFunction(index=>document.querySelector('.task-meta')?.textContent.includes('· '+(index+1)+' / 20'),i);
   const options=choices(item);
   if(i===0&&options){await page.getByRole('button',{name:options.find(value=>value!==item.answer),exact:true}).click();await page.reload();await page.getByRole('heading',{name:strip(item.prompt),exact:true}).waitFor()}
   if(options)await page.getByRole('button',{name:item.answer,exact:true}).click();else{await page.locator('#grammar-answer').fill(item.answer);await page.getByRole('button',{name:'Check',exact:true}).click()}
  }
  await page.locator('.score').waitFor();assert.equal(await page.locator('.score').innerText(),'100%');const grammar=await page.evaluate(()=>JSON.parse(localStorage.getItem('grammar-snack-01-v1')));assert.equal(grammar.history.length,1);assert.equal(grammar.current.complete,true);assert.equal(grammar.theoryDone,true);assert(grammar.current.errorEvents.length>0);await page.screenshot({path:path.join(dir,'react-grammar-completion.png'),fullPage:true});
  console.log('PASS React Grammar Snack: five theory steps, 20-item mastery, persisted error/reload, one history entry, 100% correctly recomputed.');
  await page.goto(server.baseUrl+'/vocab-space/#unit-2');await page.locator('.vocab-actions').waitFor();assert.equal(await page.locator('#app').getAttribute('data-renderer'),'react');await page.screenshot({path:path.join(dir,'react-vocab-mobile.png'),fullPage:true});
  await page.locator('.vocab-action').filter({hasText:'Слушаю и пишу'}).click();await page.locator('#answer').waitFor();await page.locator('#answer').fill('synthetic draft');await waitVocab(page,state=>state.session.draft==='synthetic draft');await page.reload();await page.locator('#answer').waitFor();assert.equal(await page.locator('#answer').inputValue(),'synthetic draft');
  const current=await readVocab(page),word=bank.items.find(item=>item.id===current.session.ids[0]);await page.getByRole('button',{name:'Нужна подсказка',exact:true}).click();await page.locator('.vocab-feedback:not([hidden])').waitFor();await page.locator('#answer').fill(word.english);await page.getByRole('button',{name:'Проверить',exact:true}).click();await page.locator('.vocab-feedback strong').filter({hasText:'Верно с опорой.'}).waitFor();
  const hinted=await readVocab(page);assert.equal(hinted.events[0].hinted,true);assert.equal(hinted.events[0].confirmed,false);const count=hinted.events.length;
  await page.locator('.back-button').click();await page.locator('.vocab-actions').waitFor();page.on('dialog',dialog=>dialog.accept());await page.locator('.vocab-action').filter({hasText:'Диктант · все 81'}).click();await page.locator('#answer').waitFor();assert.equal(await page.getByRole('button',{name:'Нужна подсказка',exact:true}).count(),0);await page.goto(server.baseUrl+'/vocab-space/#words');await page.getByRole('heading',{name:'Сначала закончи диктант.',exact:true}).waitFor();assert.equal(await page.locator('.vocab-word').count(),0);
  await page.getByRole('button',{name:'Завершить прогон и открыть словарь',exact:true}).click();await page.locator('.vocab-word').first().waitFor();assert.equal(await page.locator('.vocab-word').count(),81);await page.getByRole('button',{name:'← Unit 2',exact:true}).click();await page.locator('.vocab-action').filter({hasText:'Диктант на бумаге'}).click();
  for(let i=0;i<9;i++){await page.getByRole('button',{name:'Записала · дальше →',exact:true}).click();await waitVocab(page,state=>state.session.index===i+1)}
  await page.locator('.vocab-paper-row').first().waitFor();const paperSession=await readVocab(page);for(let i=0;i<paperSession.session.ids.length;i++){const input=page.locator('.vocab-paper-row input').nth(i);await input.check();await waitVocab(page,state=>state.session.paperAnswers[paperSession.session.ids[i]]===true);assert.equal(await input.isChecked(),true)}await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Сохранить самопроверку'&&!button.disabled));await page.getByRole('button',{name:'Сохранить самопроверку',exact:true}).click();await page.getByRole('heading',{name:'Самопроверка сохранена.',exact:true}).waitFor();const paper=await readVocab(page);assert.equal(paper.events.filter(event=>event.mode==='paper').length,9);assert.equal(paper.events.length,count+9);assert(paper.events.every(event=>!event.confirmed));assert(paper.events.filter(event=>event.mode==='paper').every(event=>event.selfCorrect===true));
  console.log('PASS React Vocab Space: same IndexedDB profile, draft reload, hinted vs independent, no fake confirmation, exam dictionary gate, all 81 words, paper self-check and event preservation.');
  assert.deepEqual(errors,[],'zero uncaught script errors in all React modules');
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exit(1)});
