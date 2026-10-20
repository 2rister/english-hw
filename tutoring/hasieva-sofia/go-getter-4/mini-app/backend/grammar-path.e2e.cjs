const {webkit,devices}=require('playwright-core'),assert=require('node:assert/strict');
const {servePublishRoot}=require('./e2e-server.cjs');
(async()=>{const server=await servePublishRoot(),browser=await webkit.launch();try{
 for(const [state,done,mission] of [[{},0,'Flight locked'],[{theoryStep:2},2,'Flight locked'],[{theoryDone:true,theoryStep:5,current:{variantId:1,index:7,answers:[]}},5,'Resume mission'],[{theoryDone:true,theoryStep:5,history:[{id:'synthetic',variantId:1,score:95}]},5,'Fly again']]){
  const c=await browser.newContext({...devices['iPhone 17']});await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(server.baseUrl).origin?r.continue():r.abort());
  await c.addInitScript(state=>localStorage.setItem('grammar-snack-01-v1',JSON.stringify(state)),state);const p=await c.newPage();await p.goto(server.baseUrl+'/grammar-snack-01/');
  await p.getByRole('region',{name:'Grammar learning path'}).waitFor();assert.equal(await p.locator('.grammar-checks strong').filter({hasText:'Done'}).count(),done);await p.getByRole('button',{name:mission,exact:true}).waitFor();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(mission==='Resume mission')assert((await p.locator('.grammar-stages').innerText()).includes('7 of 20 sectors'));
  if(mission==='Fly again'){assert((await p.locator('.grammar-stages').innerText()).includes('95%'));assert.equal(await p.locator('progress').getAttribute('value'),'3');}
  await p.reload();await p.getByRole('button',{name:mission,exact:true}).waitFor();console.log('PASS learning path',done,mission);await c.close();
 }
}finally{await browser.close();await server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
