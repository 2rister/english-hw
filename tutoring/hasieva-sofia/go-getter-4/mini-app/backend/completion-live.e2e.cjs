const {chromium}=require('../node_modules/playwright');
const crypto=require('node:crypto');const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const token=fs.readFileSync('/tmp/street-style-tg-token','utf8');
 const fields={auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:908765432109876,first_name:'ТЕСТ — пробное завершение',username:'learncore_synthetic_qa'})};
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
 fields.hash=crypto.createHmac('sha256',secret).update(Object.keys(fields).sort().map(key=>key+'='+fields[key]).join('\n')).digest('hex');
 const login=new URLSearchParams(fields).toString();
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext();
  await context.route('**/telegram-web-app.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:${JSON.stringify(login)},initDataUnsafe:{user:{id:908765432109876}},ready(){},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};`}));
  const page=await context.newPage();await page.goto('https://2rister.github.io/english-hw/tutoring/',{waitUntil:'domcontentloaded'});
  await page.getByRole('status').filter({hasText:/Progress saved/}).waitFor({timeout:65000});
  const result=await page.evaluate(async()=>{
   const loaded=await TUTORING.call('load');const state=loaded.state||{xp:0,days:{},badges:[],hintRecoveries:0};
   const completedAt='2026-10-01T19:20:00.000Z';
   state.days.day1={complete:true,completedAt,index:1,correct:1,attempts:1,answers:[{q:'ТЕСТ доставки: пробное завершение, не учебный результат',firstTry:true,wrong:[]} ]};
   return await TUTORING.call('save',state,loaded.revision);
  });
  assert.equal(result.saved,true);assert.ok(['pending','sent'].includes(result.delivery));
  console.log(JSON.stringify({saved:result.saved,delivery:result.delivery,revision:result.revision,testLearner:'SYNTHETIC QA',unit:'street-style',day:'day1'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
