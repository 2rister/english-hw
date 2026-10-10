(() => {
  'use strict';
  const tg = window.Telegram?.WebApp;
  const scriptUrl = document.currentScript?.src;
  // Dismiss Telegram's native splash before authentication or network work.
  tg?.ready();
  const authenticated = Boolean(tg?.initData);
  // Learners work only inside Telegram: that is where initData — and therefore the tutor's sheet —
  // comes from. ?qa=1, or any local server, keeps the browser build usable for review and tests.
  const qaContext = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    || new URLSearchParams(location.search).get('qa') === '1';
  const gated = !authenticated && !qaContext();
  const endpoint = 'https://script.google.com/macros/s/AKfycbyT5Q9_nqThf7xQtZ89p0NWQr7e3L9NU6zTpL_A9UW0ysz_XnPyXB1ERCInhUQscbIFTA/exec?tutoring=1';
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
  // setStatus writes textContent, which drops every child of the status line — so the row that holds
  // the save bar is a separate element, and the bar is its sibling rather than its child.
  const statusRow = document.createElement('div');
  statusRow.className = 'sync-row';
  statusRow.append(status);
  document.querySelector('.topbar').after(statusRow);
  const setStatus = text => { status.textContent = text; };
  // One save bar for every write to the private sheet. It reports the real lifecycle — queued, sent
  // (creeping while the bridge answers), confirmed, failed — and never invents progress it has not
  // reached. It is drawn on the status row's own bottom edge, so showing it never shifts the layout.
  const saveBar = document.createElement('div');
  saveBar.className = 'save-bar is-idle';
  saveBar.dataset.phase = 'idle';
  saveBar.setAttribute('aria-hidden','true');
  saveBar.append(document.createElement('span'));
  statusRow.append(saveBar);
  let barSettle;
  const saving = phase => {
    window.clearTimeout(barSettle);
    const previous = saveBar.dataset.phase;
    const current = () => Number(saveBar.style.getPropertyValue('--fill')) || 0;
    saveBar.dataset.phase = phase;
    saveBar.classList.toggle('is-idle', phase === 'idle');
    saveBar.classList.toggle('is-error', phase === 'error');
    if (phase === 'idle') { saveBar.style.setProperty('--fill','0'); return; }
    if (phase === 'queued') { saveBar.style.setProperty('--fill', String(previous === 'idle' || previous === 'done' ? .12 : Math.max(current(),.12))); return; }
    if (phase === 'sending') { saveBar.style.setProperty('--fill', String(Math.max(current(),.88))); return; }
    if (phase === 'done') {
      saveBar.style.setProperty('--fill','1');
      barSettle = window.setTimeout(() => {
        saveBar.classList.add('is-idle'); saveBar.dataset.phase = 'idle'; saveBar.style.setProperty('--fill','0');
      }, 700);
    }
  };
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
  async function call(action, state, revision, unit) {
    await Promise.race([ready,new Promise((_,reject) => setTimeout(() => reject(new Error('Connection unavailable. Your work is saved on this device.')),20000))]);
    return new Promise((resolve,reject) => {
      const id = uuid();
      const timeout = setTimeout(() => { calls.delete(id); reject(new Error('Connection timed out. Your work is saved on this device.')); },25000);
      calls.set(id,{resolve,reject,timeout});
      bridge.postMessage({kind:'tutoring-request',channel,id,request:{action,unit:unit || 'street-style',initData:tg.initData,state,revision}},bridgeOrigin);
    });
  }
  function mountTelegramGate(){
    const pose = new URL('assets/mascot/study/miso-studying-book-840.webp', scriptUrl).href;
    const gate = document.createElement('section');
    gate.className = 'telegram-gate';
    gate.setAttribute('role','dialog');
    gate.setAttribute('aria-modal','true');
    gate.setAttribute('aria-labelledby','telegramGateTitle');
    gate.innerHTML = `
      <img class="telegram-gate__miso" src="${pose}" alt="Miso, focused on his book" decoding="async">
      <p class="telegram-gate__kicker">Personal tutoring</p>
      <h1 id="telegramGateTitle">Open this inside Telegram.</h1>
      <p>Your lessons and answers live with your tutor, and Telegram is where that connection opens.</p>
      <a class="telegram-gate__button" href="https://t.me/CheckUphw_bot" rel="noopener">Open @CheckUphw_bot <span aria-hidden="true">→</span></a>
      <p class="telegram-gate__hint">Then choose “My learning” in the bot menu.</p>`;
    document.body.append(gate);
  }
  window.TUTORING = {
    authenticated, gated, userId: tg?.initDataUnsafe?.user?.id, call, setStatus, saving,
    back(hash) {
      if (!authenticated) return;
      const inLesson = /^#(day|review|retry)-/.test(hash || '');
      const atCatalog = hash === '#catalog' || (!hash && document.body.dataset.start === 'catalog');
      tg.BackButton[inLesson || atCatalog ? 'hide' : 'show']();
    },
    units: [
      {id:'street-style',title:'Street Style',subtitle:'Go Getter 4 · Unit 1',description:'Clothes, patterns and words you can use.',available:true},
      {id:'grammar-snack-01',number:'01g',title:'Grammar Snack',subtitle:'Present Simple vs Present Continuous',description:'Short theory, deliberate practice and a mastery test.',available:true,href:'../grammar-snack-01/'}
    ]
  };
  if (gated) {
    mountTelegramGate();
    setStatus('Open this inside Telegram.');
  } else {
    setStatus(authenticated ? 'Connecting to your saved progress…' : 'Browser practice · progress stays on this device.');
  }
})();
