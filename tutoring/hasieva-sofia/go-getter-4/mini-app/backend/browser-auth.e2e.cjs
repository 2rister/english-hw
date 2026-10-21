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
    let channel; const rows=new Map();
    const send=data=>window.dispatchEvent(new MessageEvent('message',{data,origin,source:window}));
    window.postMessage=(data)=>{
     if(data.kind!=='tutoring-request')return;
     window.requests=(window.requests||[]).concat(data.request);
     const req=data.request, unit=req.unit||'street-style';
     const row=rows.get(unit)||{state:null,revision:0};
     let result;
     if(req.action==='browserExchange') result={ok:true,userId:987,browserSession:'b'.repeat(64)};
     else if(req.action==='deviceDump') result={ok:true,saved:req.dump.length};
     else if(req.action==='save') {
      if(req.revision!==row.revision) result={ok:true,conflict:true,revision:row.revision};
      else { const next={state:structuredClone(req.state),revision:row.revision+1};rows.set(unit,next);result={ok:true,saved:true,revision:next.revision}; }
     } else if(req.action==='load') result={ok:true,state:structuredClone(row.state),revision:row.revision};
     else throw Error('Unexpected synthetic backend action: '+req.action);
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
    await page.waitForFunction(()=>{
     if(!TUTORING.authenticated)return false;
     const saved=requests.findIndex(r=>r.action==='save');
     return saved>=0&&requests.slice(saved+1).some(r=>r.action==='load');
    });
    const actions=await page.evaluate(()=>requests.map(r=>r.action));
    assert.equal(actions[0],'browserExchange');
    assert.ok(actions.indexOf('deviceDump')<actions.indexOf('load'),'durable backup precedes remote merge');
    await page.getByRole('heading',{name:'Present Simple vs Present Continuous'}).waitFor();
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
