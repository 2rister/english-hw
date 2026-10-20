const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{
 const server=await servePublishRoot();
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  for(const failure of [false,true]) {
   const context=await browser.newContext();
   await context.route('https://**',route=>route.abort());
   await context.addInitScript(({failure})=>{
    const origin='https://synthetic.googleusercontent.com';
    let channel;
    const send=data=>window.dispatchEvent(new MessageEvent('message',{data,origin,source:window}));
    window.postMessage=(data)=>{
     if(data.kind!=='tutoring-request')return;
     window.requests=(window.requests||[]).concat(data.request);
     const result=data.request.action==='browserExchange'?{ok:true,userId:987,browserSession:'b'.repeat(64)}:{ok:true,state:null,revision:0};
     send({kind:'tutoring-response',channel,id:data.id,...failure?{error:'Browser sign-in expired.'}:{result}});
    };
    const timer=setInterval(()=>{
     const frame=document.querySelector('iframe[title="Private progress connection"]');
     if(!frame)return;
     channel=new URL(frame.src).searchParams.get('channel');
     send({kind:'tutoring-ready',channel});clearInterval(timer);
    },10);
   },{failure});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(server.baseUrl+'/grammar-snack-01/#browserCode='+'a'.repeat(64));
   await page.waitForFunction(()=>window.requests?.length);
   if(failure) {
    await page.getByRole('alert').filter({hasText:'Browser sign-in expired.'}).waitFor();
    assert.equal(await page.evaluate(()=>TUTORING.authenticated),false);
   } else {
    await page.waitForFunction(()=>TUTORING.authenticated&&requests.some(r=>r.action==='load'));
    assert.equal(await page.evaluate(()=>TUTORING.userId),987);
    assert.equal(await page.evaluate(()=>localStorage.getItem('tutoring-browser-session')),'b'.repeat(64));
    assert.equal(await page.evaluate(()=>requests.find(r=>r.action==='load').browserSession),'b'.repeat(64));
   }
   assert.ok(!page.url().includes('browserCode'));
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: verified browser identity precedes Grammar load; secret fragment cleared; failed pairing shows alert without anonymous fallback.');
 } finally {await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
