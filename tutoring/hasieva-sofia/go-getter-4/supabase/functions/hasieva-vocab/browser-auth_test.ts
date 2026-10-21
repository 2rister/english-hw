import { verifyBrowserSession } from './browser-auth.ts';
Deno.test('fixed identity endpoint, POST, timeout, validated response only',async()=>{
  const session='a'.repeat(64);
  const verified=await verifyBrowserSession(session,(async(url,options)=>{
    if(String(url)!=='https://script.google.com/macros/s/AKfycbyT5Q9_nqThf7xQtZ89p0NWQr7e3L9NU6zTpL_A9UW0ysz_XnPyXB1ERCInhUQscbIFTA/exec'||options?.method!=='POST'||!options.signal)throw Error('Wrong transport');
    const body=JSON.parse(String(options.body));if(body.browserSession!==session||body.action!=='browserIdentity')throw Error('Wrong body');
    return Response.json({ok:true,userId:101});
  }) as typeof fetch);
  if(verified!==101)throw Error('Wrong identity');
  for(const response of [Response.json({ok:false,userId:101}),Response.json({ok:true}),Response.json({ok:true,userId:0}),Response.json({ok:true,userId:'101'}),Response.json({ok:true,userId:-1}),new Response('not JSON'),new Response('failed',{status:503})]) {
    let rejected=false;try{await verifyBrowserSession(session,(async()=>response) as typeof fetch);}catch{rejected=true;}
    if(!rejected)throw Error('Accepted invalid identity');
  }
});
