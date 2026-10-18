/** Synthetic-only story practice gate; all external traffic is blocked. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {publishRoot,servePublishRoot}=require('./e2e-server.cjs');
const bank=JSON.parse(fs.readFileSync(path.join(publishRoot,'vocab-space/unit2.json'),'utf8'));
async function state(page){return page.evaluate(()=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('learncore-vocab-space-v1',1);open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result,tx=db.transaction('profiles','readonly'),get=tx.objectStore('profiles').get('preview');get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();};
}));}
async function saved(page,predicate){for(let n=0;n<100;n++){const current=await state(page);if(predicate(current))return current;await page.waitForTimeout(20);}throw Error('Practice checkpoint was not saved');}
(async()=>{
  const server=await servePublishRoot(),browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({viewport:{width:390,height:844}}),errors=[];
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
  try{
    await page.goto(server.baseUrl+'/vocab-space/#unit-2');
    await page.getByRole('button',{name:/1 · Story gaps · 25/}).click();
    await page.locator('#answer').waitFor();let current=await state(page);
    assert.equal(current.session.ids.length,25);assert.equal(current.session.mode,'exam');assert(current.session.storyId);
    assert.equal(await page.locator('.story-gap.is-current').count(),1);
    assert.equal(await page.getByRole('button',{name:'Need a hint',exact:true}).count(),0);
    const first=bank.items.find(item=>item.id===current.session.ids[0]);
    assert(!(await page.locator('.story-text').first().innerText()).includes(first.english));
    const audio=page.waitForResponse(response=>response.url().includes('/assets/story/')&&response.url().includes('-p1.mp3'));
    await page.getByRole('button',{name:'Listen to this paragraph',exact:true}).click();assert.equal((await audio).status(),200);
    await page.locator('#answer').fill('draft');await saved(page,s=>s.session.draft==='draft');
    await page.reload();await page.locator('#answer').waitFor();assert.equal(await page.locator('#answer').inputValue(),'draft');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(artifacts,'vocab-story-mobile.png'),fullPage:true});
    await page.goto(server.baseUrl+'/vocab-space/#words');
    await page.getByRole('heading',{name:'Finish the dictation first.',exact:true}).waitFor();assert.equal(await page.locator('.vocab-word').count(),0);
    await page.getByRole('button',{name:'Continue dictation →',exact:true}).click();
    for(let n=0;n<25;n++){
      current=await state(page);const item=bank.items.find(item=>item.id===current.session.ids[n]);
      await page.locator('#answer').fill(n===0?'misspelling':item.english);
      await page.getByRole('button',{name:'Save answer →',exact:true}).click();
      await saved(page,s=>s.session.index===n+1);
      if(n<24)assert.equal(await page.getByText(first.english,{exact:true}).count(),0);
    }
    await page.getByRole('heading',{name:'24 / 25 answers correct with first-letter clues',exact:true}).waitFor();await page.waitForFunction(()=>parseInt(document.querySelector('.finish-score')?.textContent)===96);
    current=await state(page);assert(current.events.every(event=>event.hinted===true));assert.equal(current.events.length,25);
    await page.screenshot({path:path.join(artifacts,'vocab-story-results.png'),fullPage:true});
    await page.getByRole('button',{name:'Repair these spellings →',exact:true}).click();await page.locator('#answer').waitFor();
    current=await state(page);assert.deepEqual(current.session.ids,[first.id]);
    await page.locator('#answer').fill(first.english);await page.getByRole('button',{name:'Check',exact:true}).click();
    await page.getByRole('button',{name:'Next →',exact:true}).click();
    await page.getByRole('button',{name:'Back to the practice plan →',exact:true}).click();
    await page.getByRole('button',{name:/3 · Independent check · 25/}).click();await page.locator('#answer').waitFor();
    current=await state(page);assert.equal(current.session.ids.length,25);assert(!current.session.storyId);assert.equal(new Set(current.session.ids).size,25);
    for(let n=0;n<25;n++){
      current=await state(page);const item=bank.items.find(item=>item.id===current.session.ids[n]);
      await page.locator('#answer').fill(item.english);await page.getByRole('button',{name:'Save answer →',exact:true}).click();await saved(page,s=>s.session.index===n+1);
    }
    await page.getByRole('heading',{name:'25 / 25 independent answers correct',exact:true}).waitFor();
    current=await state(page);assert(current.session.results.every(event=>event.hinted===false));assert.equal(current.events.length,51);
    assert.deepEqual(errors,[]);console.log('PASS: 25-gap novel story, audio, mobile layout, draft reload, delayed marking, locked word list, supported scoring, independent repair and 25-word check; 51 synthetic events, no external writes.');
  }finally{await context.close();await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
