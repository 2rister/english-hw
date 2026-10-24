const { webkit, devices } = require('playwright-core');
const assert = require('node:assert/strict');
const { servePublishRoot } = require('./e2e-server.cjs');
const path = require('node:path');
const shot = name => path.join(process.env.PROGRESS_SCREENSHOTS || '/tmp', name + '.png');
async function street(page, base) {
  await page.addInitScript(() => localStorage.setItem('street-style-quest-v1', JSON.stringify({ days: { day1: { complete:true,index:18 }, day2: { index:3 } } })));
  await page.goto(base + '/street-style-week/#home');
  await page.waitForSelector('.day-open[data-learning-status="in-progress"]');
  assert.deepEqual(await page.locator('.day-open').evaluateAll(nodes => nodes.map(node=>node.dataset.learningStatus)), ['complete','in-progress',...Array(5).fill('not-started')]);
  assert.equal(await page.locator('.day-open').nth(1).evaluate(node=>getComputedStyle(node).backgroundColor), 'rgb(255, 240, 217)');
  assert.equal(await page.locator('.day-open').nth(2).evaluate(node=>getComputedStyle(node).backgroundColor), 'rgb(255, 240, 240)');
  await page.screenshot({path:shot('progress-street'),fullPage:true});
  await page.goto(base + '/tutoring/#catalog');
  await page.waitForSelector('.unit-card[data-learning-status="not-started"]');
  assert.deepEqual(await page.locator('.unit-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.learningStatus)), ['in-progress','not-started','not-started']);
  console.log('PASS Street: completed neutral, draft-only orange, untouched red; catalog statuses.');
}
async function grammar(page, base) {
  await page.addInitScript(() => { if (!localStorage.getItem('grammar-snack-01-v1')) localStorage.setItem('grammar-snack-01-v1', JSON.stringify({ theoryDone:true,theoryStep:5,history:[{id:'fixture',variantId:'01',score:60}],current:{variantId:'02',index:3,answers:[]} })); });
  await page.goto(base + '/grammar-snack-01/');
  await page.getByRole('button',{name:'Resume mission',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Resume mission',exact:true}).getAttribute('data-learning-status'),'in-progress');
  assert.equal(await page.locator('.grammar-stages > li').nth(1).getAttribute('data-status'),'current');
  await page.screenshot({path:shot('progress-grammar'),fullPage:true});
  await page.evaluate(()=>localStorage.setItem('grammar-snack-01-v1','{}')); await page.reload();
  assert.equal(await page.getByRole('button',{name:'Start learning',exact:true}).getAttribute('data-learning-status'),'not-started');
  assert.equal(await page.getByRole('button',{name:'Flight locked',exact:true}).getAttribute('data-learning-status'),null);
  console.log('PASS Grammar: unfinished retry orange, untouched theory red, locked flight neutral.');
}
async function vocab(page, base) {
  await page.goto(base + '/vocab-space/#unit-2');
  await page.locator('.story-plan').waitFor();
  assert.equal(await page.locator('.is-main').getAttribute('data-learning-status'),'not-started');
  assert.equal(await page.getByRole('button',{name:/3 · Independent check/}).getAttribute('data-learning-status'),null);
  await page.locator('.is-main').click(); await page.locator('#answer').waitFor();
  await page.locator('.back-button').click();
  assert.equal(await page.locator('.is-main').getAttribute('data-learning-status'),'in-progress');
  await page.getByRole('button',{name:'More practice',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/Words in context/}).getAttribute('data-learning-status'),'not-started');
  await page.screenshot({path:shot('progress-vocab'),fullPage:true});
  await page.goto(base + '/tutoring/#catalog');
  await page.waitForSelector('.unit-card[data-learning-status="in-progress"]');
  assert.equal(await page.locator('.unit-card').last().getAttribute('data-learning-status'),'in-progress');
  console.log('PASS Vocab: untouched red, zero-answer paused story orange, locked check neutral; catalog reads actual IndexedDB.');
}
async function unknown(page, base) {
  await page.route('**/street-style-week/tutoring.js*', route=>route.fulfill({contentType:'text/javascript',body:`window.TUTORING={authenticated:true,userId:101,sessionReady:Promise.resolve(),units:[{id:'street-style',title:'Street Style',available:true},{id:'grammar-snack-01',title:'Grammar Snack',available:true},{id:'vocab-space',title:'Vocab Space',available:true,independent:true}],setStatus(){},saving(){},call:async()=>{throw Error('Synthetic unavailable')},browserCredential(){return ''}};`}));
  await page.goto(base + '/tutoring/#catalog');
  await page.locator('.unit-card').first().waitFor();
  assert.equal(await page.locator('.unit-card[data-learning-status="not-started"]').count(),0);
  assert.equal(await page.locator('.unit-card[data-learning-status="in-progress"]').count(),0);
  console.log('PASS unknown server progress: no false red/orange personal cards.');
}
(async()=>{
  const server=await servePublishRoot(),browser=await webkit.launch();
  try { for(const width of [320,402]) for(const check of [street,grammar,vocab,unknown]) {
    const context=await browser.newContext({...devices['iPhone 17'],viewport:{width,height:874}});
    await context.route('**/*',r=>new URL(r.request().url()).origin===server.baseUrl?r.continue():r.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await check(page,server.baseUrl);assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
  }} finally { await browser.close();await server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
