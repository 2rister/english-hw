const {webkit,devices}=require('playwright-core'),assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
 const server=await servePublishRoot(),browser=await webkit.launch({headless:true});
 try{
  const base=process.env.FINISH_BASE||server.baseUrl;
  for(const [score,reduce] of [[79,false],[80,false],[88,false],[88,true]]){
   const c=await browser.newContext({...devices['iPhone 17'],viewport:{width:402,height:874},reducedMotion:reduce?'reduce':'no-preference',...(score===88&&!reduce?{recordVideo:{dir:'artifacts/finish-scene',size:{width:402,height:874}}}:{})});
   await c.route('**/*',r=>r.request().method()==='GET'&&new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   const p=await c.newPage();await p.goto(base+'/vocab-space/celebration.html?score='+score);
   await p.locator('body.finish-scene .finish-dashboard').waitFor();
   const initial=await p.locator('.finish-backdrop').evaluate(el=>getComputedStyle(el).clipPath);
   await p.waitForFunction(value=>parseInt(document.querySelector('.finish-score')?.textContent)===value,score);
   const visual=await p.locator('.finish-dial').evaluate(el=>({filter:getComputedStyle(el.querySelector('svg')).filter,shake:parseFloat(getComputedStyle(el).getPropertyValue('--vibration-size')),textFilter:getComputedStyle(el.querySelector('h1')).filter}));
   if(!reduce){assert.equal(parseFloat(visual.filter.match(/[\d.]+/)?.[0]||'0')>0,score>=80);assert.equal(visual.shake>=2,score>=80);}
   else assert.equal(visual.filter,'none');
   assert.equal(visual.textFilter,'none');
   if(score===88&&!reduce){await p.waitForTimeout(250);await p.screenshot({path:'artifacts/dark-finish-arcade-iphone-17.png',fullPage:true});}
   const bg=p.locator('.finish-backdrop');assert.equal(await bg.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 18, 27)');
   const box=await bg.boundingBox();assert.equal(box.width,402);assert.equal(box.height,874);
   await p.getByRole('button',{name:score>=85?'Continue':'Try again',exact:true}).waitFor({timeout:20000});
   assert.equal(await p.locator('.finish-gauge').evaluate(el=>getComputedStyle(el).filter),'none');
   assert.equal(await p.getByRole('button',{name:score>=85?'Continue':'Try again',exact:true}).evaluate(el=>getComputedStyle(el).color),'rgb(16, 18, 27)');
   if(score===88&&!reduce)await p.screenshot({path:'artifacts/dark-finish-iphone-17.png',fullPage:true});
   console.log('PASS scene',score,'reduced='+reduce,'initialClip='+initial,JSON.stringify(visual));await c.close();
  }
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
