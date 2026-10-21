const DATABASE = 'learncore-vocab-space-v1';

export async function openStore(owner) {
  if (!globalThis.indexedDB) throw new Error('Private progress storage is unavailable. Open this in a normal browser or Telegram window.');
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('profiles');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  function transact(mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = database.transaction('profiles', mode);
      const request = operation(tx.objectStore('profiles'));
      let value;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error || request.error || new Error('Progress could not be saved on this device.'));
      tx.onabort = () => reject(tx.error || new Error('Progress could not be saved on this device.'));
    });
  }
  return {
    close() { database.close(); },
    async load() { return await transact('readonly', store => store.get(owner)) || { events: [], session: null, day: 1 }; },
    save(state) {
      return new Promise((resolve, reject) => {
        const tx = database.transaction('profiles', 'readwrite');
        const profiles = tx.objectStore('profiles'), request = profiles.get(owner);
        let merged;
        request.onsuccess = () => {
          merged = { ...structuredClone(state), events: mergeEvents(state.events, request.result?.events || []) };
          profiles.put(merged, owner);
        };
        tx.oncomplete = () => resolve(merged);
        tx.onerror = () => reject(tx.error || request.error || new Error('Progress could not be saved on this device.'));
        tx.onabort = () => reject(tx.error || new Error('Progress could not be saved on this device.'));
      });
    },
  };
}

export function mergeEvents(remote, local) {
  const all = new Map(remote.map(event => [event.requestId, event]));
  for (const event of local) if (!all.has(event.requestId) || (!all.get(event.requestId).confirmed && event.confirmed)) all.set(event.requestId, event);
  return [...all.values()].sort((a, b) => String(a.receivedAt || a.createdAt).localeCompare(String(b.receivedAt || b.createdAt)));
}

export function createCommitter(state, store) {
  let tail = Promise.resolve();
  return function commit(change) {
    const job = tail.then(async () => {
      const next = structuredClone(state);
      change(next);
      const saved = await store.save(next);
      Object.assign(state, saved || next);
    });
    tail = job.catch(() => {});
    return job;
  };
}

export function createSync({ endpoint, initData, browserSession, bank, state, commit, notify, request = fetch }) {
  let active;
  async function call(action, event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
    const response = await request(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, setId: bank.id, initData, browserSession, event }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'The server could not confirm your progress.');
    return data;
    } finally { clearTimeout(timeout); }
  }
  async function flush() {
    if (!endpoint || (!initData && !browserSession)) {
      notify(endpoint ? 'Preview: results stay on this device only.' : 'Server not connected · results saved on this device.', false);
      return false;
    }
    notify('Syncing saved answers with your personal progress…', false);
    let loaded = await call('load');
    if (!Array.isArray(loaded.events) || loaded.events.some(event => !event || typeof event.requestId !== 'string' || event.confirmed !== true)) throw new Error('The server did not return your answer history.');
    await commit(next => { next.events = mergeEvents(loaded.events, next.events); });
    let confirmed = new Set(loaded.events.map(event => event.requestId));
    for (;;) {
      // Server read-back, rather than a device flag, decides which durable answers still need sending.
      for (;;) {
        const event = state.events.find(event => !confirmed.has(event.requestId));
        if (!event) break;
        const result = await call('attempt', event);
        if (result.event?.requestId !== event.requestId || result.event.confirmed !== true) throw new Error('The server has not confirmed this answer yet.');
        await commit(next => { next.events = mergeEvents([result.event], next.events); });
        confirmed.add(event.requestId);
      }
      const expected = state.events.map(event => event.requestId);
      loaded = await call('load');
      if (!Array.isArray(loaded.events) || loaded.events.some(event => !event || typeof event.requestId !== 'string' || event.confirmed !== true)) throw new Error('The server did not return your answer history.');
      confirmed = new Set(loaded.events.map(event => event.requestId));
      if (expected.some(id => !confirmed.has(id))) throw new Error('Saved answers are waiting for server read-back. They remain on this device.');
      await commit(next => { next.events = mergeEvents(loaded.events, next.events); });
      if (state.events.every(event => confirmed.has(event.requestId))) break;
    }
    notify('Progress confirmed by the server.', true);
    return true;
  }
  return {
    flush() {
      if (!active) active = flush().catch(error => {
        notify('Waiting to send: ' + error.message, false);
        return false;
      }).finally(() => { active = null; });
      return active;
    },
  };
}

// Catalog entry flushes only the authenticated personal profile, never anonymous practice caches.
export async function flushVocabOnEntry({ tutoring, request = fetch, baseUrl = location.href, storeOpen = openStore, notify = () => {} }) {
  await tutoring?.sessionReady;
  if (!tutoring?.authenticated || tutoring.preview || !Number.isSafeInteger(tutoring.userId) || tutoring.userId <= 0) return false;
  let store;
  try {
    const base = new URL('../vocab-space/', baseUrl);
    const responses = await Promise.all([request(new URL('unit2.json', base)), request(new URL('config.json', base))]);
    if (responses.some(response => !response.ok)) throw new Error('Vocab sync could not load its existing configuration.');
    const [bank, config] = await Promise.all(responses.map(response => response.json()));
    store = await storeOpen(`telegram:${tutoring.userId}`);
    const state = await store.load(), commit = createCommitter(state, store);
    return await createSync({endpoint:config.endpoint,initData:tutoring.initData,browserSession:tutoring.browserCredential?.(),bank,state,commit,notify,request}).flush();
  } catch (error) { notify('Saved on this device · Vocab sync pending: '+error.message,false); return false; }
  finally { store?.close?.(); }
}
