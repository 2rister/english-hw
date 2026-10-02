export const telegram = window.Telegram?.WebApp;
telegram?.ready();
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9CUvXuQ827FfwviQ0JxtdBl7_K7Jg54c-O9g4EmVjGiJwlK8shWJtrz1yOXHpkd5V4g/exec?space=1';
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const a=crypto.getRandomValues(new Uint8Array(16)); a[6]=(a[6]&15)|64; a[8]=(a[8]&63)|128;
  const s=Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
export class SpaceAPI {
  constructor() {
    this.authenticated=Boolean(telegram?.initData); this.channel=uuid(); this.calls=new Map();
    this.ready=new Promise(resolve=>{this.resolveReady=resolve;});
    const frame=document.createElement('iframe'); frame.hidden=true; frame.title='Mission connection';
    frame.src=ENDPOINT+'&channel='+this.channel; document.body.append(frame); this.frame=frame;
    window.addEventListener('message',event=>this.receive(event));
  }
  receive(event) {
    if (event.data?.channel!==this.channel || !/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(event.origin)) return;
    if (event.data.kind==='space-ready') {
      if (this.bridge && this.bridge!==event.source) return;
      this.bridge=event.source; this.origin=event.origin; this.resolveReady();
    }
    if (event.source!==this.bridge || event.origin!==this.origin || event.data.kind!=='space-response') return;
    const call=this.calls.get(event.data.id); if (!call) return;
    clearTimeout(call.timer); this.calls.delete(event.data.id);
    event.data.error?call.reject(new Error(event.data.error)):call.resolve(event.data.result);
  }
  async call(action,payload={}) {
    let timer;
    try { await Promise.race([this.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Connection unavailable. Tap Retry.')),20000);})]); }
    finally { clearTimeout(timer); }
    return new Promise((resolve,reject)=>{
      const id=uuid(), request={...payload,action,initData:telegram?.initData||''};
      const timer=setTimeout(()=>{this.calls.delete(id);reject(new Error('Connection timed out. Your answer is kept. Tap Retry.'));},30000);
      this.calls.set(id,{resolve,reject,timer});
      this.bridge.postMessage({kind:'space-request',channel:this.channel,id,request},this.origin);
    });
  }
}
