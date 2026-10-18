/** Visual and interaction gate: synthetic preview, no backend writes. */
const {webkit,devices}=require('playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
  const server=await servePublishRoot(),browser=await webkit.launch({headless:true});
  const artifacts=path.resolve(__dirname,'../artifacts');fs.mkdirSync(artifacts,{recursive:true});
  try{
    for(const reducedMotion of ['no-preference','reduce']){
      const context=await browser.newContext({...devices['iPhone 17'],reducedMotion});
      await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl&&route.request().method()==='GET'?route.continue():route.abort());
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(server.baseUrl+'/vocab-space/#unit-2');
      const start=page.getByRole('button',{name:/1 · Story gaps · 25/});await start.waitFor();
      const box=await start.boundingBox();assert(box.y+box.height<=681,'first story action is above the fold');
      assert.equal(await page.locator('.vocab-stats').count(),0,'progress is secondary');
      await page.screenshot({path:path.join(artifacts,`motion-home-${reducedMotion}.png`),fullPage:true});
      const progress=page.getByRole('button',{name:'My progress',exact:true});
      assert((await progress.boundingBox()).height>=44);
      await progress.focus();await progress.press('Enter');await page.locator('.vocab-stats').waitFor();
      assert.equal(await progress.getAttribute('aria-expanded'),'true');
      await progress.click();await progress.click();await progress.click();
      await page.waitForFunction(()=>!document.querySelector('.vocab-stats'));
      assert.equal(await progress.getAttribute('aria-expanded'),'false');
      await start.click();await page.locator('#answer').waitFor();
      const disclosure=page.getByRole('button',{name:'Read the whole story · 25 gaps',exact:true});
      assert((await disclosure.boundingBox()).height>=44);
      await disclosure.click();await page.getByRole('button',{name:'Listen to the whole story',exact:true}).waitFor();
      await disclosure.click();await page.waitForFunction(()=>!document.querySelector('.story-overview .reveal-content'));
      const audio=page.getByRole('button',{name:'Listen to this paragraph',exact:true});
      await audio.scrollIntoViewIfNeeded();
      if(reducedMotion==='no-preference'){
        const b=await audio.boundingBox();await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();
        await page.waitForFunction(()=>document.querySelector('.answer-workspace .vocab-play').style.transform!=='scale(1)');
        await page.mouse.move(0,0);await page.mouse.up();
      }
      for(const viewport of [{width:402,height:681},{width:402,height:450},{width:756,height:352}]){
        await page.setViewportSize(viewport);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
        await page.locator('#answer').scrollIntoViewIfNeeded();
        assert(await page.locator('#answer').isVisible());
      }
      await page.setViewportSize({width:402,height:681});await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await page.waitForFunction(()=>scrollY===0);
      await page.screenshot({path:path.join(artifacts,`motion-story-${reducedMotion}.png`),fullPage:true});
      if(reducedMotion==='reduce'){
        const b=await audio.boundingBox();await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();
        assert.equal(await audio.evaluate(el=>el.style.transform),'scale(1)');await page.mouse.move(0,0);await page.mouse.up();
      }
      assert.deepEqual(errors,[]);await context.close();
    }
    console.log('PASS WebKit iPhone 17: primary CTA above fold; accessible 44px+ disclosures, keyboard and interrupted toggles; pointer press motion; Reduce Motion; 402x681, 402x450 and landscape overflow checks. Synthetic preview only.');
  }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
