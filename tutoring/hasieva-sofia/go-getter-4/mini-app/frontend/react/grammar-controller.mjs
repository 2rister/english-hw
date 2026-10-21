import { backupDeviceState } from "./device-backup.mjs";
import { parseBank, theory, matches, strip } from "./grammar-data.mjs";
function createGrammarController({ tutoring, storage, request, createQueue, mergeState, clock = globalThis }) {
  const unit = "grammar-snack-01", key = unit + "-v1" + (tutoring?.authenticated ? ":" + tutoring.userId : "");
  const preview = Boolean(tutoring?.preview), fresh = () => ({ kind: unit, variantIndex: 0, history: [], current: null, theoryStep: 0, theoryDone: false });
  let state;
  try {
    state = { ...fresh(), ...JSON.parse(storage.getItem(key) || "{}") };
  } catch {
    state = fresh();
  }
  let revision = 0, variants = [], error = "", loading = true, feedback = null, advancing = false, shown = state.current?.index || 0, theoryIndex = Math.min(state.theoryStep || 0, theory.length), timer, retryTimer, restored = !tutoring?.authenticated, disposed = false;
  const listeners = /* @__PURE__ */ new Set();
  let snapshot;
  function emit() {
    if (!disposed) {
      snapshot = { state, variants, error, loading, feedback, advancing, shown, theoryIndex, preview };
      listeners.forEach((fn) => fn());
    }
  }
  function retry(fn) {
    clock.clearTimeout(retryTimer);
    if (!disposed && tutoring?.authenticated && !preview) retryTimer = clock.setTimeout(fn, 15000);
  }
  function recover(cause) {
    error = cause.message || String(cause);
    tutoring?.saving("error");
    tutoring?.setStatus("Saved on this device. " + error);
    emit();
  }
  function persist() {
    if (!preview) {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        recover(Error("Device storage unavailable. Keep this page open."));
      }
    }
    emit();
  }
  function merge(remote) {
    const local = { ...state, theoryStep: Math.max(state.theoryStep || 0, remote?.theoryStep || 0), theoryDone: Boolean(state.theoryDone || remote?.theoryDone), current: state.current?.phase === "theory" && remote?.current?.variantId ? remote.current : state.current || remote?.current || null };
    state = mergeState(local, remote);
    persist();
  }
  const queue = createQueue({
    getState: () => structuredClone(state),
    getRevision: () => revision,
    setRevision: (value) => {
      revision = value;
    },
    async save(snapshot2, expected) {
      const result = await tutoring.call("save", snapshot2, expected, unit);
      if (!result.saved && !result.conflict) throw Error("The server has not confirmed this save.");
      if (result.saved) {
        const confirmed = await tutoring.call("load", null, null, unit);
        if (Number(confirmed.revision) < Number(result.revision) || !confirmed.state ||
          (snapshot2.history || []).some(attempt => !(confirmed.state.history || []).some(other => other.id === attempt.id && other.score === attempt.score)) ||
          (snapshot2.theoryDone && !confirmed.state.theoryDone) ||
          Number(confirmed.state.theoryStep || 0) < Number(snapshot2.theoryStep || 0) ||
          (snapshot2.current && (confirmed.state.current?.id !== snapshot2.current.id ||
            (snapshot2.current.complete && (!confirmed.state.current.complete || confirmed.state.current.score !== snapshot2.current.score)) ||
            (snapshot2.current.errorEvents || []).some(event => !(confirmed.state.current.errorEvents || []).some(other => other.id === event.id && other.wrong === event.wrong)) ||
            Number(confirmed.state.current.index || 0) < Number(snapshot2.current.index || 0) ||
            (snapshot2.current.answers || []).some(answer => {
              const row = (confirmed.state.current.answers || []).find(other => other.id === answer.id);
              return !row || (answer.correct && !row.correct) || (answer.firstTry === false && row.firstTry !== false) || (answer.wrong || []).some(value => !(row.wrong || []).includes(value));
            })))) throw Error("Save received, but progress read-back is not confirmed.");
      }
      return result;
    },
    load: () => tutoring.call("load", null, null, unit),
    mergeState: merge,
    onSaved(result) {
      error = "";
      clock.clearTimeout(retryTimer);
      try { storage.removeItem(key + ":pending"); } catch {}
      tutoring.saving("done");
      tutoring.setStatus(result.delivery === "pending" ? "Saved · tutor report is retrying." : "Saved · tutor report updated.");
      emit();
    },
    onError(cause) { recover(cause); retry(save); }
  });
  function save() {
    persist();
    if (preview || !tutoring?.authenticated) return Promise.resolve();
    try { storage.setItem(key + ":pending", "1"); } catch {}
    if (!restored) { retry(boot); return Promise.resolve(); }
    tutoring.saving("queued");
    return queue.enqueue().catch((cause) => ({ saved: false, error: cause }));
  }
  function later(fn, ms) {
    clock.clearTimeout(timer);
    timer = clock.setTimeout(() => {
      if (!disposed) {
        advancing = false;
        feedback = null;
        fn();
        emit();
      }
    }, ms);
  }
  async function boot() {
    if (tutoring?.gated) return;
    loading = true;
    error = "";
    emit();
    try {
      const response = await request("../tutoring/hasieva-sofia/go-getter-4/grammar-snack-01/CONTENT_BANK.md");
      if (!response.ok) throw Error("The practice bank is unavailable.");
      variants = parseBank(await response.text());
      if (variants.length !== 10) throw Error("The practice bank is unavailable.");
      if (tutoring?.authenticated || preview) {
        if (!preview) {
          const raw = storage.getItem(key);
          await backupDeviceState(tutoring, unit, raw === null ? {} : { [key]: raw });
        }
        const loaded = await tutoring.call(preview ? "preview" : "load", null, null, unit);
        if (disposed) return;
        revision = loaded.revision;
        restored = true;
        merge(loaded.state);
        await save();
      }
      shown = state.current?.index || 0;
      theoryIndex = Math.min(state.theoryStep || 0, theory.length);
      if (state.current?.index === 20 && !state.current.complete) finish();
    } catch (cause) {
      recover(cause);
      retry(boot);
    } finally {
      loading = false;
      emit();
    }
    return !error;
  }
  function startAttempt() {
    if (!variants.length || advancing) return;
    const variant = variants[state.variantIndex % variants.length], theoryErrors = state.current?.phase === "theory" ? state.current.errorEvents : [];
    state.current = { id: `v${variant.id}-${Date.now()}`, variantId: variant.id, index: 0, correct: 0, answers: [], errorEvents: theoryErrors || [], complete: false };
    state.variantIndex++;
    shown = 0;
    feedback = null;
    save();
  }
  function answerTheory(option) {
    if (advancing || theoryIndex >= theory.length) return;
    const item = theory[theoryIndex];
    if (state.current?.phase !== "theory") state.current = { id: `theory-${Date.now()}`, phase: "theory", answers: [], errorEvents: [] };
    if (option !== item.answer) {
      state.current.errorEvents.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, itemId: `theory-${theoryIndex + 1}`, type: "theory", q: strip(item.q), wrong: option, expected: item.answer, feedback: item.why, at: (/* @__PURE__ */ new Date()).toISOString() });
      feedback = { wrong: true, text: "Not yet. " + item.why };
      save();
      return;
    }
    advancing = true;
    state.theoryStep = theoryIndex + 1;
    state.theoryDone = state.theoryStep === theory.length;
    feedback = { wrong: false, text: "Correct. " + item.why };
    save();
    later(() => {
      theoryIndex = state.theoryStep;
    }, 300);
  }
  function answer(value) {
    if (!value || advancing) return;
    const current = state.current, variant = variants.find((v) => v.id === current?.variantId), item = variant?.items[shown];
    if (!item || current.complete) return;
    let answer2 = current.answers.find((answer3) => answer3.id === item.id);
    if (!answer2) {
      answer2 = { id: item.id, type: item.type, q: strip(item.prompt), wrong: [], expected: item.answer, feedback: item.feedback, firstTry: true };
      current.answers.push(answer2);
    }
    if (!matches(value, item.answer, item.prompt)) {
      answer2.firstTry = false;
      answer2.wrong.push(value);
      current.errorEvents = current.errorEvents || [];
      current.errorEvents.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, itemId: item.id, type: item.type, q: strip(item.prompt), wrong: value, expected: item.answer, feedback: item.feedback, at: (/* @__PURE__ */ new Date()).toISOString() });
      feedback = { wrong: true, text: "Not yet. " + item.feedback };
      save();
      return;
    }
    advancing = true;
    answer2.correct = true;
    current.correct++;
    current.index++;
    feedback = { wrong: false, text: "Correct. " + item.feedback };
    save();
    later(() => {
      shown = current.index;
      if (shown >= 20) finish();
    }, 900);
  }
  function finish() {
    const current = state.current;
    if (!current || current.complete) return;
    current.complete = true;
    current.correct = current.answers.filter(answer=>answer.correct&&answer.firstTry).length;
    current.score = Math.round(current.correct / 20 * 100);
    current.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (!state.history.some((item) => item.id === current.id)) state.history.push({ id: current.id, variantId: current.variantId, score: current.score, completedAt: current.completedAt });
    save();
  }
  function checkpointFlight(value){
    const current=state.current,item=variants.find(variant=>variant.id===current?.variantId)?.items[shown];
    if(!item||current.complete||value.itemId!==item.id)return;
    const remainingMs=Number(value.remainingMs);
    if(!Number.isFinite(remainingMs))return;
    current.flight={launched:true,itemId:item.id,remainingMs:Math.max(0,Math.min(20000,remainingMs)),selectedId:typeof value.selectedId==='string'?value.selectedId.slice(0,80):null};
    persist();
  }
  function dispose() {
    disposed = true;
    clock.clearTimeout(timer);
    clock.clearTimeout(retryTimer);
    listeners.clear();
  }
  emit();
  return { checkpointFlight, key, getSnapshot: () => snapshot, subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, boot, startAttempt, answerTheory, answer, save, dispose };
}
export {
  createGrammarController
};
