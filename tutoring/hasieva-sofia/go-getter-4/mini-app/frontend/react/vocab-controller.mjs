import { validateEvent, wordStats, pickRound, shuffle, openStore, createSync, createCommitter } from "./vocab-ports.mjs";
import { chooseStory, repairWords } from './story-practice.mjs';
function secureId(crypto = globalThis.crypto) {
  if (crypto?.randomUUID) return crypto.randomUUID();
  if (!crypto?.getRandomValues) throw Error("Secure answer IDs are unavailable. Reopen the app in Telegram.");
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function createVocabController({ tg, request = fetch, events = window, pageDocument = document, navigation = location, confirmStart = confirm, createPlayer = () => new Audio(), storeOpen = openStore, makeSync = createSync }) {
  let bank, state, store, sync, commit, saving = false, loading = true, error = "", disposed = false, playing = null, audioStatus = "idle", audioEpoch = 0, paperPending = 0;
  let message = { text: "Loading your word set…", confirmed: false };
  const listeners = /* @__PURE__ */ new Set(), player = createPlayer();
  let snapshot;
  function emit() {
    if (!disposed) {
      snapshot = { bank, state, saving, paperPending, loading, error, playing, audioStatus, message, hash: navigation.hash.slice(1) };
      listeners.forEach((fn) => fn());
    }
  }
  function notify(text, confirmed = false) {
    message = { text, confirmed };
    emit();
  }
  const stopAudio = () => {
    audioEpoch++;
    player.pause();
    playing = null;
    audioStatus = "idle";
  };
  const audioEnded = () => {
    audioEpoch++;
    playing = null;
    audioStatus = "idle";
    emit();
  };
  const audioError = () => {
    audioEpoch++;
    playing = null;
    audioStatus = "idle";
    notify("Audio did not load. Your answer has not been counted. Please play it again.");
  };
  player.addEventListener("ended", audioEnded);
  player.addEventListener("error", audioError);
  async function playSource(source, key) {
    stopAudio();
    const epoch = audioEpoch;
    try {
      player.src = source;
      playing = key;
      audioStatus = "loading";
      emit();
      await player.play();
      if (epoch !== audioEpoch) return;
      audioStatus = "playing";
      emit();
    } catch {
      if (epoch !== audioEpoch) return;
      playing = null;
      audioStatus = "idle";
      notify("Could not play the audio. Try again or check your connection.");
    }
  }
  function play(item, context = false, variant = 0) {
    playSource(context ? `assets/audio/${item.id}-c${variant + 1}.mp3` : item.audio, `${item.id}:${context}:${variant}`);
  }
  function route() {
    stopAudio();
    if (tg?.BackButton) tg.BackButton[navigation.hash ? "show" : "hide"]();
    emit();
  }
  function go(hash) {
    navigation.hash = hash;
    route();
  }
  async function run(operation) {
    try {
      return await operation();
    } catch (cause) {
      notify("Changes not saved: " + cause.message);
    }
  }
  async function changeSession(change) {
    if (saving || !state?.session) return;
    saving = true;
    emit();
    try {
      await commit((next) => change(next.session, next));
      route();
    } catch (cause) {
      notify("Changes not saved: " + cause.message);
    } finally {
      saving = false;
      emit();
    }
  }
  async function start(mode, diagnostic = false, options = {}) {
    if (saving || !state) return;
    if (state.session && state.session.index < state.session.ids.length && !confirmStart("Start a new exercise instead of the unfinished one? Your recorded answers will be kept.")) return;
    saving = true;
    emit();
    try {
      let ids, storyId;
      if (options.story) ({ids, storyId} = chooseStory(bank, state.events));
      else if (options.repair) {
        const repairs = repairWords(state.events);
        ids = repairs.length ? shuffle(repairs).slice(0,9) : pickRound(bank,state.events,mode);
      }
      else if (mode === "exam") ids = options.limit ? pickRound(bank,state.events,"listen",options.limit) : shuffle(bank.items.map((item) => item.id));
      else if (diagnostic) {
        const unseen = bank.items.filter((item) => wordStats(state.events, item.id).listen.attempts === 0);
        ids = unseen.length ? shuffle(unseen.slice(0, 9).map((item) => item.id)) : pickRound(bank, state.events, mode);
      } else ids = pickRound(bank, state.events, mode);
      await commit((next) => {
        next.session = { id: secureId(), mode, storyId, ids, index: 0, feedback: null, hinted: false, pasted: false, draft: "", variant: next.day === 1 ? 0 : 1, results: [], retried: [], paperAnswers: {}, paperRequestIds: Object.fromEntries(ids.map((id) => [id, secureId()])) };
      });
      go("practice");
    } catch (cause) {
      notify("Exercise not saved: " + cause.message);
    } finally {
      saving = false;
      emit();
    }
  }
  async function submitAnswer(answer, pasted = false) {
    if (saving || !state?.session || state.session.feedback) return;
    const session = state.session, item = bank.items.find((word) => word.id === session.ids[session.index]);
    if (!item) return;
    let event;
    try {
      event = { ...validateEvent(bank, { requestId: secureId(), sessionId: session.id, itemId: item.id, version: bank.version, mode: session.mode, answer, hinted: Boolean(session.storyId) || session.hinted || session.pasted || pasted }), createdAt: (/* @__PURE__ */ new Date()).toISOString(), confirmed: false };
    } catch (cause) {
      notify(cause.message);
      return;
    }
    saving = true;
    emit();
    try {
      await commit((next) => {
        next.events.push(event);
        next.session.results.push(event);
        next.session.draft = "";
        if (session.mode === "exam") {
          next.session.index++;
          next.session.pasted = false;
        } else {
          next.session.feedback = event;
          if (!event.correct && session.ids.length - session.index > 3 && !session.retried.includes(item.id)) {
            next.session.ids.splice(session.index + 3, 0, item.id);
            next.session.retried.push(item.id);
          }
        }
      });
      notify("Answer saved on this device · waiting for server confirmation.");
      route();
      void sync.flush();
    } catch (cause) {
      notify("Answer not saved: " + cause.message);
    } finally {
      saving = false;
      emit();
    }
  }
  function updateDraft(change) {
    const session = state?.session;
    if (!session) return Promise.resolve();
    const { id, index } = session;
    return run(() => commit((next) => {
      if (next.session?.id === id && next.session.index === index) change(next.session);
    }));
  }
  async function paperAnswer(id, value) {
    const session = state?.session;
    if (!session || session.mode !== "paper" || session.paperSaved || !session.ids.includes(id)) return false;
    const sessionId = session.id;
    paperPending++;
    emit();
    try {
      await commit((next) => {
        if (next.session?.id === sessionId) next.session.paperAnswers[id] = value;
      });
      return true;
    } catch (cause) {
      notify("Check not saved: " + cause.message);
      return false;
    } finally {
      paperPending--;
      emit();
    }
  }
  async function paperSave() {
    if (saving || paperPending || !state?.session || state.session.paperSaved) return;
    saving = true;
    emit();
    try {
      await commit((next) => {
        if (next.session.paperSaved) return;
        for (const id of next.session.ids) next.events.push({ ...validateEvent(bank, { requestId: next.session.paperRequestIds[id], sessionId: next.session.id, itemId: id, version: bank.version, mode: "paper", answer: "", hinted: false, selfCorrect: Boolean(next.session.paperAnswers[id]) }), createdAt: (/* @__PURE__ */ new Date()).toISOString(), confirmed: false });
        next.session.paperSaved = true;
      });
      route();
      void sync.flush();
    } catch (cause) {
      notify("Self-check not saved: " + cause.message);
    } finally {
      saving = false;
      emit();
    }
  }
  const online = () => {
    void sync?.flush();
  };
  const visible = () => {
    if (!pageDocument.hidden) online();
  };
  const safeArea = () => {
    for (const side of ["top", "left", "right", "bottom"]) pageDocument.documentElement.style.setProperty("--telegram-safe-" + side, Math.max(tg?.safeAreaInset?.[side] || 0, tg?.contentSafeAreaInset?.[side] || 0) + "px");
  };
  const back = () => navigation.hash === "#unit-2" ? go("") : navigation.hash ? go("unit-2") : navigation.assign("../tutoring/#catalog");
  async function boot() {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.("#f3f0e8");
    tg?.setBackgroundColor?.("#f3f0e8");
    safeArea();
    tg?.onEvent?.("safeAreaChanged", safeArea);
    tg?.onEvent?.("contentSafeAreaChanged", safeArea);
    try {
      const responses = await Promise.all([request("unit2.json"), request("config.json")]);
      if (responses.some((response) => !response.ok)) throw Error("Could not load the word set. Please reload the page.");
      const [loadedBank, config] = await Promise.all(responses.map((response) => response.json()));
      if (disposed) return;
      bank = loadedBank;
      const owner = tg?.initData ? `telegram:${tg.initDataUnsafe?.user?.id || "unknown"}` : "preview";
      store = await storeOpen(owner);
      state = await store.load();
      if (disposed) return;
      const persist = createCommitter(state, store);
      commit = async (change) => {
        await persist(change);
        emit();
      };
      sync = makeSync({ endpoint: config.endpoint, initData: tg?.initData, bank, state, commit, notify, request });
      tg?.BackButton?.onClick(back);
      events.addEventListener("hashchange", route);
      events.addEventListener("online", online);
      pageDocument.addEventListener("visibilitychange", visible);
      loading = false;
      route();
      void sync.flush();
    } catch (cause) {
      loading = false;
      error = cause.message;
      notify(cause.message);
    }
  }
  function dispose() {
    disposed = true;
    stopAudio();
    player.removeEventListener("ended", audioEnded);
    player.removeEventListener("error", audioError);
    events.removeEventListener("hashchange", route);
    events.removeEventListener("online", online);
    pageDocument.removeEventListener("visibilitychange", visible);
    tg?.BackButton?.offClick?.(back);
    tg?.offEvent?.("safeAreaChanged", safeArea);
    tg?.offEvent?.("contentSafeAreaChanged", safeArea);
    listeners.clear();
  }
  emit();
  return {
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    boot,
    dispose,
    go,
    play,
    stop: () => { stopAudio(); emit(); },
    playStory: (id, paragraph) => playSource(`assets/story/${id}${paragraph == null ? '' : '-p' + (paragraph + 1)}.mp3`, `story:${id}:${paragraph ?? 'all'}`),
    start,
    submitAnswer,
    paperSave,
    pause: () => go("unit-2"),
    next: () => changeSession((next) => {
      next.index++;
      next.feedback = null;
      next.hinted = false;
      next.pasted = false;
    }),
    draft: (value, pasted = false) => updateDraft((next) => {
      next.draft = value;
      if (pasted) next.pasted = true;
    }),
    hint: () => updateDraft((next) => {
      if (next.mode !== "exam") next.hinted = true;
    }),
    paperAnswer,
    day: (day) => run(() => commit((next) => {
      next.day = day;
    })),
    clear: (hash) => run(async () => {
      await commit((next) => {
        next.session = null;
      });
      go(hash);
    }),
    notify
  };
}
export {
  createVocabController,
  secureId
};
