(() => {
  'use strict';
  const tg = window.Telegram?.WebApp;
  // Dismiss Telegram's native splash before authentication or network work.
  tg?.ready();
  const authenticated = Boolean(tg?.initData);
  const endpoint = 'https://script.google.com/macros/s/AKfycbx9CUvXuQ827FfwviQ0JxtdBl7_K7Jg54c-O9g4EmVjGiJwlK8shWJtrz1yOXHpkd5V4g/exec?tutoring=1';
  const uuid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const channel = uuid();
  const calls = new Map();
  let bridge, bridgeOrigin, resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const status = document.createElement('p');
  status.className = 'sync-status'; status.setAttribute('role','status');
  document.querySelector('.topbar').after(status);
  const setStatus = text => { status.textContent = text; };
  if (authenticated) {
    tg.expand();
    tg.setHeaderColor?.('#f3f0e8'); tg.setBackgroundColor?.('#f3f0e8');
    const safeArea = () => {
      for (const side of ['top','bottom','left','right']) {
        document.documentElement.style.setProperty(`--telegram-safe-${side}`,`${Math.max(tg.safeAreaInset?.[side] || 0,tg.contentSafeAreaInset?.[side] || 0)}px`);
      }
    };
    safeArea(); tg.onEvent?.('safeAreaChanged',safeArea); tg.onEvent?.('contentSafeAreaChanged',safeArea);
    tg.BackButton.onClick(() => {
      location.hash = location.hash.startsWith('#day-') ? 'home' : 'catalog';
    });
    const frame = document.createElement('iframe');
    frame.hidden = true; frame.title = 'Private progress connection'; frame.src = endpoint + '&channel=' + encodeURIComponent(channel);
    document.body.append(frame);
    window.addEventListener('message', event => {
      if (event.data?.channel !== channel) return;
      if (!/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(event.origin)) return;
      if (event.data?.kind === 'tutoring-ready') {
        if (bridge && event.source !== bridge) return;
        bridge = event.source; bridgeOrigin = event.origin; resolveReady();
      }
      if (event.source !== bridge || event.origin !== bridgeOrigin || event.data?.kind !== 'tutoring-response') return;
      const pending = calls.get(event.data.id);
      if (!pending) return;
      clearTimeout(pending.timeout); calls.delete(event.data.id);
      event.data.error ? pending.reject(new Error(event.data.error)) : pending.resolve(event.data.result);
    });
  }
  async function call(action, state, revision) {
    await Promise.race([ready,new Promise((_,reject) => setTimeout(() => reject(new Error('Connection unavailable. Your work is saved on this device.')),20000))]);
    return new Promise((resolve,reject) => {
      const id = uuid();
      const timeout = setTimeout(() => { calls.delete(id); reject(new Error('Connection timed out. Your work is saved on this device.')); },25000);
      calls.set(id,{resolve,reject,timeout});
      bridge.postMessage({kind:'tutoring-request',channel,id,request:{action,unit:'street-style',initData:tg.initData,state,revision}},bridgeOrigin);
    });
  }
  window.TUTORING = {
    authenticated, userId: tg?.initDataUnsafe?.user?.id, call, setStatus,
    back(hash) { if (authenticated) hash === '#catalog' || !hash && document.body.dataset.start === 'catalog' ? tg.BackButton.hide() : tg.BackButton.show(); },
    units: [{id:'street-style',title:'Street Style',subtitle:'Go Getter 4 · Unit 1',description:'Clothes, patterns and words you can use.',available:true}]
  };
  setStatus(authenticated ? 'Connecting to your saved progress…' : 'Browser practice · progress stays on this device.');
})();
