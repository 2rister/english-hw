const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
 const server=await servePublishRoot();
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const context=await browser.newContext();
  await context.addInitScript(()=>{
   window.nativeEvents=[];
   window.TelegramWebviewProxy={postEvent:(name)=>window.nativeEvents.push(name)};
   Object.defineProperty(crypto,'randomUUID',{value:undefined});
  });
  await context.route('https://telegram.org/**',route=>route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.baseUrl+'/tutoring/#tgWebAppVersion=8.0&tgWebAppPlatform=macos');
  await page.locator('.unit-card').first().waitFor({timeout:3000});
  assert.ok(await page.evaluate(()=>nativeEvents.includes('web_app_ready')));
  assert.equal(await page.locator('.unit-card').first().isEnabled(),true);
  console.log('PASS: native ready with empty auth, UUID unavailable, Telegram CDN blocked; catalog visible.');
  // A read-only tutor link must start its bridge even outside Telegram.
  const previewContext=await browser.newContext();
  await previewContext.route('**/telegram-web-app.js*',route=>route.abort());
  await previewContext.route('https://script.google.com/**',route=>route.abort());
  const previewPage=await previewContext.newPage();const previewErrors=[];
  previewPage.on('pageerror',error=>previewErrors.push(error.message));
  await previewPage.goto(server.baseUrl+'/tutoring/?preview=synthetic-read-only-token');
  await previewPage.locator('iframe[title="Private progress connection"]').waitFor({state:'attached'});
  assert.equal(await previewPage.evaluate(()=>window.TUTORING.preview),true);
  assert.equal(await previewPage.evaluate(()=>window.TUTORING.authenticated),false);
  assert.equal(previewErrors.length,0,previewErrors.join('\n'));
  await previewContext.close();
  console.log('PASS: plain browser read-only preview initializes its private bridge without Telegram.');
  await context.route('**/telegram-web-app.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:'synthetic',initDataUnsafe:{user:{id:123}},ready(){window.nativeEvents.push('web_app_ready')},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};`}));
  await context.route('https://script.google.com/**',route=>route.abort());
  await page.goto(server.baseUrl+'/tutoring/');
  await page.locator('.unit-card').first().waitFor({timeout:3000});
  assert.equal(await page.locator('.unit-card').first().isDisabled(),true);
  assert.ok(await page.evaluate(()=>nativeEvents.includes('web_app_ready')));
  await page.getByRole('status').filter({hasText:/Connection unavailable/}).waitFor({timeout:23000});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: native ready and immediate catalog despite blocked backend; bounded visible connection error, no JS crashes.');
 } finally {await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exit(1)});
