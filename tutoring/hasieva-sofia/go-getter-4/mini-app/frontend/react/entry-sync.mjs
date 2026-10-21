import { createGrammarController } from './grammar-controller.mjs';
import { flushVocabOnEntry } from '../../../../../../vocab-space/progress.mjs';

export function mountEntrySync({controller, tutoring, storage, request = fetch, events = window, pageDocument = document, baseUrl = location.href, createQueue = globalThis.createRevisionedSaveQueue, mergeState = globalThis.mergeGrammarState, storeOpen, clock = globalThis}) {
  let active, disposed = false, first = true, retries = 0, retryTimer;
  const enabled = tutoring?.authenticated && !tutoring.preview && Number.isSafeInteger(tutoring.userId) && tutoring.userId > 0;
  async function grammar() {
    if (typeof createQueue !== 'function' || typeof mergeState !== 'function') throw Error('Grammar sync helpers unavailable');
    const quiet = {...tutoring,setStatus(){},saving(){}};
    const c = createGrammarController({tutoring:quiet,storage,request:url=>request(new URL(url,baseUrl)),createQueue,mergeState});
    try { await c.boot(); return !c.getSnapshot().error; }
    finally { c.dispose(); }
  }
  function run() {
    if (disposed || active) return active;
    if (!enabled) { if (first) { first=false; void controller.start(); } return Promise.resolve(); }
    clock.clearTimeout(retryTimer);
    const street = first ? controller.start() : controller.syncProgress();
    first=false; tutoring.entrySyncPending=true;
    tutoring.setStatus('Syncing saved results from all your learning modules…');
    active = Promise.allSettled([
      Promise.resolve(street).then(()=>!storage.getItem(controller.key+':pending') && controller.getSnapshot().restored),
      grammar(),
      flushVocabOnEntry({tutoring,request,baseUrl,storeOpen,notify(){}}),
    ]).then(results=>{
      if (disposed) return;
      tutoring.entrySyncPending=results.some(result=>result.status!=='fulfilled'||result.value!==true);
      if (tutoring.entrySyncPending && retries++ < 3) retryTimer=clock.setTimeout(run,30000);
      tutoring.setStatus(tutoring.entrySyncPending?'Saved on this device · some results are waiting to sync. We will retry when you reconnect.':'All saved results confirmed by the server.');
    }).finally(()=>{active=null;});
    return active;
  }
  const visible=()=>{if (!pageDocument.hidden) void run();};
  events.addEventListener('online',run); pageDocument.addEventListener('visibilitychange',visible);
  void run();
  return ()=>{disposed=true;clock.clearTimeout(retryTimer);events.removeEventListener('online',run);pageDocument.removeEventListener('visibilitychange',visible);};
}
