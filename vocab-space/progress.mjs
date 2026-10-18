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
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Progress could not be saved on this device.'));
    });
  }
  return {
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
        tx.onerror = () => reject(tx.error);
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

export function createSync({ endpoint, initData, bank, state, commit, notify, request = fetch }) {
  let active;
  async function call(action, event) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
    const response = await request(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, setId: bank.id, initData, event }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'The server could not confirm your progress.');
    return data;
    } finally { clearTimeout(timeout); }
  }
  async function flush() {
    if (!endpoint || !initData) {
      notify(endpoint ? 'Preview: results stay on this device only.' : 'Server not connected · results saved on this device.', false);
      return;
    }
    const loaded = await call('load');
    await commit(next => { next.events = mergeEvents(loaded.events, next.events); });
    for (;;) {
      const event = state.events.find(event => !event.confirmed);
      if (!event) break;
      const result = await call('attempt', event);
      await commit(next => { next.events = mergeEvents([result.event], next.events.filter(entry => entry.requestId !== event.requestId)); });
    }
    notify('Progress confirmed by the server.', true);
  }
  return {
    flush() {
      if (!active) active = flush().catch(error => {
        notify('Waiting to send: ' + error.message, false);
      }).finally(() => { active = null; });
      return active;
    },
  };
}
