const {webkit,devices}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {servePublishRoot,publishRoot}=require('./e2e-server.cjs');
(async()=>{
 const {parseBank}=await import('../frontend/react/grammar-data.mjs');
 const variants=parseBank(fs.readFileSync(path.join(publishRoot,'tutoring/hasieva-sofia/go-getter-4/grammar-snack-01/CONTENT_BANK.md'),'utf8'));
 const server=await servePublishRoot(),browser=await webkit.launch({headless:true}),base=process.env.GRAMMAR_SPACE_BASE||server.baseUrl;
 try{
  for(const [width,height,reduce] of process.env.GRAMMAR_SPACE_BASE?[[402,874,false]]:[[402,681,false],[402,874,false],[320,568,false],[756,352,false],[402,874,true]]){
   const c=await browser.newContext({...devices['iPhone 17'],viewport:{width,height},reducedMotion:reduce?'reduce':'no-preference'});
   await c.route('**/*',r=>r.request().method()==='GET'&&new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   const errors=[],p=await c.newPage();p.on('pageerror',error=>errors.push(error.message));
   await p.clock.install();await p.goto(base+'/grammar-snack-01/mission-preview.html');await p.getByRole('button',{name:'Start flight →',exact:true}).waitFor();
   const image=p.locator('.mission-portrait');await image.evaluate(el=>el.decode());
   assert.equal(await p.locator('select').count(),0,'no astronaut picker');
   if(width===402&&height===874&&!reduce)await p.screenshot({path:'artifacts/grammar-orbit-intro-iphone-17.png'});
   await p.getByRole('button',{name:'Start flight →',exact:true}).click();await p.locator('.flight-course').first().waitFor();
   for(const button of await p.locator('.flight-course').all())assert((await button.boundingBox()).height>=44);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const box=await p.locator('.flight-canvas').boundingBox();assert.equal(box.width,width);assert.equal(box.height,height);
   await p.clock.fastForward(5000);assert((await p.locator('.flight-timer').innerText()).includes('15.0'));
   await p.getByRole('button',{name:'Pause',exact:true}).click();await p.getByRole('button',{name:'Resume flight',exact:true}).waitFor();const frozen=await p.locator('.flight-timer').innerText();await p.clock.fastForward(10000);assert.equal(await p.locator('.flight-timer').innerText(),frozen,'pause freezes countdown');
   await p.getByRole('button',{name:'Resume flight',exact:true}).click();
   await p.keyboard.press('ArrowRight');assert.equal(await p.locator('.flight-course').last().getAttribute('aria-pressed'),'true');
   await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('.flight-course').first().getAttribute('aria-pressed'),'true');
   const steering=await p.locator('.flight-steering').boundingBox();await p.mouse.move(steering.x+steering.width*.2,steering.y+steering.height*.5);await p.mouse.down();await p.mouse.move(steering.x+steering.width*.85,steering.y+steering.height*.5);await p.mouse.up();assert.equal(await p.locator('.flight-course').last().getAttribute('aria-pressed'),'true','drag controls course');
   if(width===402&&height===874&&!reduce){
    await p.clock.runFor(250);await p.screenshot({path:'artifacts/grammar-orbit-flight-iphone-17.png'});
    const first=variants[0].items[0];await p.getByRole('button',{name:first.answer,exact:true}).click();
    await p.clock.fastForward(15000);await p.clock.fastForward(200);await p.clock.runFor(950);
    await p.waitForFunction(()=>document.querySelector('.task-meta')?.textContent.includes('· 2 / 20'));
    assert((await p.locator('.flight-hud').innerText()).includes('100%'),'selected course commits correctly at zero');
    await p.clock.fastForward(20050);await p.clock.fastForward(200);
    await p.getByRole('button',{name:'Repair course →',exact:true}).waitFor();assert((await p.locator('.flight-hud').innerText()).includes('95%'),'unselected timeout loses one first-try point');
    await p.getByRole('button',{name:'Repair course →',exact:true}).click();
    for(let index=1;index<20;index++){
     const item=variants[0].items[index];await p.waitForFunction(i=>document.querySelector('.task-meta')?.textContent.includes('· '+(i+1)+' / 20'),index);
     await p.getByRole('button',{name:item.answer.replace(/\s*;\s*/g,' / '),exact:true}).click();await p.getByRole('button',{name:'Lock course',exact:true}).click();await p.clock.runFor(950);
    }
    await p.locator('.finish-dashboard[data-score-percent="95"]').waitFor();
    assert.equal(await p.locator('.grammar-flight').count(),0,'flight scene cleaned up');
    assert.equal(await p.evaluate(()=>localStorage.length),0,'preview writes no learner progress');
   }
   assert.deepEqual(errors,[]);await c.close();console.log('PASS full-screen Grammar Orbit WebKit',width,height,'reduced='+reduce);
  }
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
