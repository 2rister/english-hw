const {chromium} = require('../node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'../../_publish/english-hw');
const content = {window:{}};
vm.runInNewContext(fs.readFileSync(root+'/street-style-week/content.js','utf8'),content);
const testLogin = () => {
  const token=fs.readFileSync('/tmp/street-style-tg-token','utf8');
  const fields={auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:908765432109876,first_name:'SYNTHETIC QA',username:'learncore_synthetic_qa'})};
  const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();
  fields.hash=crypto.createHmac('sha256',secret).update(Object.keys(fields).sort().map(k=>k+'='+fields[k]).join('\n')).digest('hex');
  return new URLSearchParams(fields).toString();
};
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto('http://127.0.0.1:8766/tutoring/');
    assert.equal(await page.locator('.unit-card').count(),1);
    await page.locator('.unit-card').click(); await page.locator('#dayGrid').waitFor();
    assert.equal(await page.locator('.day-card').count(),7);
    await page.locator('.day-card').first().click();
    const first=content.window.QUEST_DATA.days[0].questions[0];
    await page.getByRole('button',{name:first.options.find(x=>x!==first.a),exact:true}).click();
    await page.getByRole('button',{name:first.a,exact:true}).click();
    await page.reload();
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('street-style-quest-v1')));
    assert.equal(stored.days.day1.index,1);assert.equal(stored.xp,10);assert.equal(stored.days.day1.answers[0].firstTry,false);assert.equal(stored.days.day1.answers[0].wrong.length,1);
    const day=content.window.QUEST_DATA.days.find(d=>d.questions.some(q=>q.type==='writing'));
    const index=day.questions.findIndex(q=>q.type==='writing');
    await page.evaluate(({day,index})=>{const state=JSON.parse(localStorage.getItem('street-style-quest-v1'));state.days[day]={index,correct:index,attempts:index,answers:[],complete:false};localStorage.setItem('street-style-quest-v1',JSON.stringify(state));},{day:day.id,index});
    await page.goto('http://127.0.0.1:8766/tutoring/#day-'+(content.window.QUEST_DATA.days.indexOf(day)+1));
    await page.reload();
    await page.locator('#writingBox').fill('Synthetic draft for persistence');await page.reload();
    assert.equal(await page.locator('#writingBox').inputValue(),'Synthetic draft for persistence');
    await page.locator('.brand').click();await page.locator('.unit-card').waitFor();
    for(const width of [375,390,844,1024]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'/tmp/tutoring-catalog-mobile.png',fullPage:true});
    console.log('PASS: one available unit, seven days, navigation, wrong-attempt evidence, writing draft reload, responsive layout.');
    if(process.env.TUTORING_LIVE_TEST==='1'){
      const login=testLogin();
      const session=await browser.newContext({viewport:{width:390,height:844}});
      await session.route('**/telegram-web-app.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:${JSON.stringify(login)},initDataUnsafe:{user:{id:908765432109876}},ready(){},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};`}));
      const live=await session.newPage();
      live.on('console',m=>{if(m.type()==='error')console.log('Browser error:',m.text().slice(0,180));});
      await live.goto('https://2rister.github.io/english-hw/tutoring/',{waitUntil:'domcontentloaded'});
      try{await live.getByRole('status').filter({hasText:/Progress saved/}).waitFor({timeout:35000});}catch(error){console.log('LIVE STATUS:',await live.getByRole('status').innerText());console.log('FRAMES:',live.frames().map(f=>f.url()));for(const f of live.frames()){if(f.url().includes('userCodeAppPanel')) console.log('FRAME HTML:',(await f.content()).slice(-3200));}await live.screenshot({path:'/tmp/tutoring-live-debug.png',fullPage:true});throw error;}
      await live.evaluate(()=>{const key='street-style-quest-v1:908765432109876';const s=JSON.parse(localStorage.getItem(key));s.xp=42;localStorage.setItem(key,JSON.stringify(s));localStorage.setItem(key+':pending','1');});
      await live.reload();await live.getByRole('status').filter({hasText:/Progress saved/}).waitFor({timeout:65000});
      const second=await browser.newContext();
      await second.route('https://telegram.org/js/telegram-web-app.js',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:${JSON.stringify(login)},initDataUnsafe:{user:{id:908765432109876}},ready(){},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};`}));
      const restore=await second.newPage();await restore.goto('https://2rister.github.io/english-hw/tutoring/');
      await restore.getByRole('status').filter({hasText:/Progress saved/}).waitFor({timeout:65000});
      assert.equal(await restore.locator('#xpValue').innerText(),'42');
      console.log('PASS: live signed synthetic login, acknowledged private Sheets save, restore in fresh browser context; no completed days or Telegram messages.');
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
