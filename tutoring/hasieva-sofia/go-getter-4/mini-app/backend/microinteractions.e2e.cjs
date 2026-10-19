const {webkit, devices}=require('playwright-core');
const assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
 const server=await servePublishRoot(),browser=await webkit.launch({headless:true});
 try {
  const context=await browser.newContext({...devices['iPhone 17']});
  await context.route('**/*',route=>new URL(route.request().url()).origin===server.baseUrl&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.baseUrl+'/vocab-space/celebration.html');
  await page.locator('[data-celebration-effect="confetti"]').waitFor();
  assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).count(),0);
  await page.waitForTimeout(1700);
  await page.screenshot({path:require('node:path').resolve(__dirname,'../artifacts/microinteractions-preview.png'),fullPage:true});
  await page.getByRole('button',{name:'Continue',exact:true}).waitFor({timeout:20000});
  await page.getByRole('button',{name:'84%',exact:true}).click();
  await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
  assert.equal(await page.locator('[data-celebration-effect]').count(),0);
  await page.getByRole('button',{name:'85%',exact:true}).click();
  await page.locator('[data-celebration-effect="confetti"]').waitFor();
  await page.getByRole('button',{name:'Continue',exact:true}).waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  assert.equal(await page.evaluate(async()=>(await indexedDB.databases()).length),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'100%',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).waitFor();
  assert.equal(await page.locator('[data-celebration-effect]').count(),0);
  for(const route of ['/tutoring/','/street-style-week/','/grammar-snack-01/','/vocab-space/']) {
   await page.goto(server.baseUrl+route);
   assert.equal(await page.locator('link[href*="interactions.css"]').count(),1);
   const css=await page.evaluate(()=>[...document.styleSheets].filter(sheet=>sheet.href?.includes('interactions.css')).map(sheet=>[...sheet.cssRules].length));
   assert(css[0]>8,route+' shared interaction rules loaded');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' no horizontal overflow');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS iPhone 17 WebKit: preview 84/85/88/100, delayed CTA, confetti, reduced motion, no storage writes; shared CSS on all four routes, no overflow/runtime errors.');
 }finally{await browser.close();await server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
