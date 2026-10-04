const {chromium}=require('../node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
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
  await page.goto('http://127.0.0.1:8766/tutoring/#tgWebAppVersion=8.0&tgWebAppPlatform=macos');
  await page.locator('.unit-card').waitFor({timeout:3000});
  assert.ok(await page.evaluate(()=>nativeEvents.includes('web_app_ready')));
  assert.equal(await page.locator('.unit-card').isEnabled(),true);
  console.log('PASS: native ready with empty auth, UUID unavailable, Telegram CDN blocked; catalog visible.');
  await context.route('**/telegram-web-app.js*',route=>route.fulfill({contentType:'application/javascript',body:`window.Telegram={WebApp:{initData:'synthetic',initDataUnsafe:{user:{id:123}},ready(){window.nativeEvents.push('web_app_ready')},expand(){},onEvent(){},BackButton:{onClick(){},show(){},hide(){}}}};`}));
  await context.route('https://script.google.com/**',route=>route.abort());
  await page.goto('http://127.0.0.1:8766/tutoring/');
  await page.locator('.unit-card').waitFor({timeout:3000});
  assert.equal(await page.locator('.unit-card').isDisabled(),true);
  assert.ok(await page.evaluate(()=>nativeEvents.includes('web_app_ready')));
  await page.getByRole('status').filter({hasText:/Connection unavailable/}).waitFor({timeout:23000});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: native ready and immediate catalog despite blocked backend; bounded visible connection error, no JS crashes.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
