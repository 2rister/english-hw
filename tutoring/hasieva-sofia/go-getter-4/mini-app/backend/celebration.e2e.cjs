/** Synthetic result fixtures only; no remote requests or learner writes. */
const {webkit,devices}=require('playwright-core');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {publishRoot,servePublishRoot}=require('./e2e-server.cjs');
const bank=JSON.parse(fs.readFileSync(path.join(publishRoot,'vocab-space/unit2.json'),'utf8'));
const stories=JSON.parse(fs.readFileSync(path.join(publishRoot,'vocab-space/stories.json'),'utf8'));
const story=stories[0],ids=story.paragraphs.join(' ').match(/\{[^}]+\}/g).map(word=>bank.items.find(item=>item.english===word.slice(1,-1)).id);
async function seed(page,correct,total=25){
 const roundIds=ids.slice(0,total),sessionId=randomUUID();
 const results=roundIds.slice(0,-1).map((itemId,i)=>({requestId:randomUUID(),sessionId,itemId,version:bank.version,mode:'exam',answer:i<correct-1?bank.items.find(item=>item.id===itemId).english:'misspelling',hinted:total===25,correct:i<correct-1,selfCorrect:null,createdAt:new Date().toISOString(),confirmed:false}));
 const state={day:1,events:results,session:{id:sessionId,mode:'exam',storyId:total===25?story.id:undefined,ids:roundIds,index:total-1,feedback:null,hinted:false,pasted:false,draft:'',variant:0,results,retried:[],paperAnswers:{},paperRequestIds:{}}};
 await page.evaluate(state=>new Promise((resolve,reject)=>{const r=indexedDB.open('learncore-vocab-space-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('profiles','readwrite');tx.objectStore('profiles').put(state,'preview');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}),state);
 await page.goto(page.url().split('?')[0].split('#')[0]+'?fixture='+sessionId+'#practice');await page.locator('#answer').waitFor();
 return {sessionId,answer:bank.items.find(item=>item.id===roundIds.at(-1)).english};
}
(async()=>{
 const server=await servePublishRoot(),browser=await webkit.launch({headless:true});
 const baseUrl=process.env.VOCAB_CELEBRATION_BASE_URL||server.baseUrl;
 const artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
 try{
  const cases=[['confetti',0,22,25,false],['stars',.26,25,25,false],['fireworks',.51,22,25,false],['wave',.76,22,25,false],['reduced',0,22,25,true],['below',0,21,25,false],['exact85',0,17,20,false]];
  for(const [kind,random,correct,total,reduce] of process.env.VOCAB_CELEBRATION_BASE_URL?cases.slice(0,1):cases){
   const context=await browser.newContext({...devices['iPhone 17'],reducedMotion:reduce?'reduce':'no-preference'});
   await context.addInitScript(value=>{Math.random=()=>value;},random);
   await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(baseUrl).origin&&route.request().method()==='GET'?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(baseUrl+'/vocab-space/#unit-2');await page.getByRole('button',{name:/1 · Story gaps/}).waitFor();
   const fixture=await seed(page,correct,total);assert.equal(await page.locator('.finish-effects').count(),0);
   await page.locator('#answer').fill(fixture.answer);await page.locator('#answer').press('Enter');
   const percent=Math.floor(correct*100/total);
   await page.getByRole('status').filter({hasText:percent+'%'}).waitFor();
   if(kind==='below'){
    await page.locator('.finish-dashboard[data-block-passed="false"]').waitFor();
    assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).count(),0,'retry waits for the needle');
    await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
    assert.equal(parseInt(await page.locator('.finish-score').innerText()),84);
    assert.equal(await page.locator('.finish-effects').count(),0);
    assert.equal(await page.locator('.finish-speed').count(),0);
    await page.getByRole('button',{name:'Try again',exact:true}).click();await page.locator('#answer').waitFor();
    assert.equal(await page.locator('h1').textContent(),story.title);
    await page.getByRole('button',{name:'← Pause',exact:true}).click();
    assert(await page.getByRole('button',{name:/3 · Independent check/}).isDisabled());
   }else{
    await page.locator(`[data-score-percent="${percent}"]`).waitFor();
    if(reduce){assert.equal(await page.locator('.finish-effects').count(),0);assert.equal(parseInt(await page.locator('.finish-score').innerText()),percent);}
    else {
      await page.locator(`[data-celebration-effect="${kind==='exact85'?'confetti':kind}"]`).waitFor();
      await page.locator('.finish-speed').waitFor();
      assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).count(),0,'Continue waits for the whole animation');
      assert(await page.locator('.finish-dial').evaluate(el=>getComputedStyle(el).animationName==='finish-engine-vibration'));
    }
    await page.waitForFunction(value=>parseInt(document.querySelector('.finish-score')?.textContent)===value,percent);
    await page.waitForFunction(()=>!document.querySelector('.finish-dial.is-accelerating'));
    assert(await page.evaluate(()=>{
      const svg=document.querySelector('.finish-gauge'),circle=document.querySelector('.finish-pivot').getBoundingClientRect();
      const expected=new DOMPoint(160,166).matrixTransform(svg.getScreenCTM());
      return Math.abs(circle.x+circle.width/2-expected.x)<1&&Math.abs(circle.y+circle.height/2-expected.y)<1;
    }),'needle pivot must align with the actual centre of the SVG dial');
    await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
    assert.equal(await page.locator('.finish-speed').count(),0);
    assert.equal(await page.locator('.finish-effects').count(),0);
    assert.equal(await page.locator('.finish-dial.is-accelerating').count(),0);
    for(const width of [320,375,402]){await page.setViewportSize({width,height:681});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    await page.setViewportSize({width:402,height:681});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.screenshot({path:path.join(artifacts,`finish-${kind}.png`),fullPage:true});await page.locator('.finish-dashboard').screenshot({path:path.join(artifacts,`finish-card-${kind}.png`),scale:'css'});
    if(kind==='confetti'){
      await page.goto(baseUrl+'/vocab-space/?fixture='+fixture.sessionId+'#unit-2');
      await page.getByRole('button',{name:'Resume your exercise →',exact:true}).click();
      await page.locator('.finish-dashboard').waitFor();assert.equal(parseInt(await page.locator('.finish-score').innerText()),percent);
      assert.equal(await page.locator('.finish-effects').count(),0,'navigation must not replay a completion');
    }
    await page.reload();await page.locator('.finish-dashboard').waitFor();
    assert.equal(parseInt(await page.locator('.finish-score').innerText()),percent);assert.equal(await page.locator('.finish-effects').count(),0,'reload must not replay a completion');
    if(kind==='confetti'){
     await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#answer').waitFor();
     assert.notEqual(await page.locator('h1').textContent(),story.title,'85% opens the next story');
    }
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(process.env.VOCAB_CELEBRATION_BASE_URL?
    'PASS PUBLIC iPhone 17 WebKit: 88% successful round, needle vibration, bottom speed streaks, delayed Continue, next-story unlock, responsive layout and no replay after reload; synthetic local fixtures only; all POSTs blocked.':
    'PASS LOCAL iPhone 17 WebKit: all four effects, vibration and bottom speed streaks; delayed Continue / Try again; 88/100/exact85/84%; no celebration or unlock below 85%; correct next story; reduced motion; 320/375/402px; no replay after reload; synthetic IndexedDB fixtures, all external/POST traffic blocked.');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
