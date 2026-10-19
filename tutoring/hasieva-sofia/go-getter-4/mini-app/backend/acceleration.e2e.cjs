const {webkit,devices}=require('playwright-core'),assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
 const server=await servePublishRoot(),browser=await webkit.launch({headless:true});
 try {
  const base=process.env.PREVIEW_BASE||server.baseUrl;
  const context=await browser.newContext({...devices['iPhone 17'],recordVideo:{dir:'artifacts/acceleration',size:{width:402,height:874}}});
  await context.route('**/*',r=>r.request().method()==='GET'&&new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const p=await context.newPage();await p.goto(base+'/vocab-space/celebration.html?release=accel2');
  await p.locator('.finish-score').waitFor();
  const samples=await p.evaluate(async()=>{
   const read=()=>({score:parseInt(document.querySelector('.finish-score').textContent),arc:parseFloat(document.querySelector('.finish-gauge path:nth-of-type(2)').getAttribute('stroke-dasharray')),energy:parseFloat(getComputedStyle(document.querySelector('.finish-speed')).opacity),vibration:parseFloat(getComputedStyle(document.querySelector('.finish-dial')).getPropertyValue('--vibration-size'))});
   const result=[read()];for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,450));result.push(read())}return result;
  });
  assert(samples[0].score<=2,'needle/count starts at zero');
  assert(samples[0].arc<=2,'arc starts empty');
  assert(samples[1].score<samples[3].score&&samples[3].score<88,'visible gradual ascent');
  assert(samples[1].energy<samples[3].energy,'speed streaks strengthen');
  assert(samples[1].vibration<samples[3].vibration,'vibration strengthens');
  await p.getByRole('button',{name:'Continue',exact:true}).waitFor({timeout:20000});
  assert.equal(parseInt(await p.locator('.finish-score').innerText()),88);
  await p.getByRole('button',{name:'Replay animation ↻'}).click();await p.waitForTimeout(3000);
  await p.screenshot({path:'artifacts/acceleration-iphone-17.png',fullPage:true});
  await context.close();
  const frame=await browser.newPage({viewport:{width:494,height:682}});await frame.goto(base+'/vocab-space/iphone-17.html');
  assert.equal(await frame.frames()[1].evaluate(()=>innerWidth),402);
  assert.equal(await frame.frames()[1].evaluate(()=>innerHeight),874);
  const box=await frame.locator('.stage').boundingBox();assert(box.y+box.height<682,'entire phone fits host browser');
  await frame.screenshot({path:'artifacts/acceleration-phone-frame.png'});
  console.log('PASS acceleration:',JSON.stringify(samples),'402×874 iframe fits full host viewport');
 } finally {await browser.close();await server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
