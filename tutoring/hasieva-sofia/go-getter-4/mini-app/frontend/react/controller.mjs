import { freshState, normalise, mergeProgress, buildItems } from "./progress.mjs";
function createQuestController({ data, tutoring, storage, location, events, clock = globalThis }) {
  const key = "street-style-quest-v1" + (tutoring?.authenticated ? ":" + tutoring.userId : "");
  const preview = Boolean(tutoring?.preview && (tutoring.authenticated || tutoring.previewToken));
  const read = (k) => {
    try {
      return storage.getItem(k);
    } catch {
      return null;
    }
  };
  const write = (k, v) => {
    try {
      storage.setItem(k, v);
      return true;
    } catch {
      status("Device storage unavailable. Keep this page open; progress is not backed up here.");
      return false;
    }
  };
  let state;
  try {
    state = { ...freshState(), ...JSON.parse(read(key) || "{}") };
  } catch {
    state = freshState();
  }
  if (!state.days || typeof state.days !== "object" || Array.isArray(state.days)) state.days = {};
  if (!Array.isArray(state.badges)) state.badges = [];
  let session = null, view = { kind: "home" }, revision = 0, restored = !tutoring?.authenticated;
  let syncing = false, syncPending = false, syncUrgent = false, timer, backoff = 0, disposed = false;
  let evidence = {}, diagnostics = null, browserToken = null, completion = { text: "Saved on this device.", ready: true };
  const listeners = /* @__PURE__ */ new Set();
  let snapshot;
  function status(text) {
    tutoring?.setStatus?.(text);
  }
  function emit() {
    if (disposed) return;
    snapshot = { state, session, view, restored, preview, evidence, diagnostics, browserToken, completion };
    listeners.forEach((listener) => listener());
  }
  function schedule(delay) {
    clock.clearTimeout(timer);
    if (!disposed) timer = clock.setTimeout(syncProgress, delay);
  }
  function save(immediate = false) {
    if (preview) {
      emit();
      return;
    }
    write(key, JSON.stringify(state));
    if (tutoring?.authenticated) {
      write(key + ":pending", "1");
      syncPending = true;
      if (restored) {
        tutoring.saving(immediate ? "sending" : "queued");
        if (immediate) {
          syncUrgent = true;
          syncProgress();
        } else schedule(900);
      }
    }
    emit();
  }
  async function syncProgress() {
    if (disposed || syncing || !syncPending || !restored || preview) return;
    syncing = true;
    syncPending = false;
    status("Saving your progress…");
    tutoring.saving("sending");
    completion = { text: "Saving your result to your tutor…", ready: false };
    emit();
    try {
      const result = await tutoring.call("save", JSON.parse(JSON.stringify(state)), revision);
      if (disposed) return;
      if (result.conflict) {
        const latest = await tutoring.call("load");
        if (disposed) return;
        state = mergeProgress(latest.state, state);
        revision = latest.revision;
        syncPending = true;
        syncUrgent = true;
        status("Progress reconnected. Saving your latest answer…");
        return;
      }
      if (!result.saved) throw Error("Progress could not be saved.");
      revision = result.revision;
      backoff = 0;
      write(key + ":revision", String(revision));
      if (!syncPending) {
        try {
          storage.removeItem(key + ":pending");
        } catch {
        }
      }
      const text = result.delivery === "pending" ? "Progress saved · tutor report waiting for delivery." : "Progress saved.";
      status(text);
      tutoring.saving("done");
      completion = { text, ready: true };
    } catch (error) {
      if (!disposed) {
        syncPending = true;
        status(error.message);
        tutoring.saving("error");
        completion = { text: "Saved on this device. Keep the app open to retry.", ready: true };
      }
    } finally {
      const urgent = syncUrgent;
      syncUrgent = false;
      syncing = false;
      if (syncPending && restored && !disposed) {
        backoff = Math.min(backoff ? backoff * 2 : urgent ? 400 : 15e3, 3e4);
        schedule(backoff);
      } else backoff = 0;
      emit();
    }
  }
  function resetQuestion() {
    if (session) {
      const pending = session.answers.find((answer2) => answer2.q === session.items[session.index]?.q && answer2.pending);
      session.hintLevel = 0;
      session.usedHint = false;
      session.wrongThisQuestion = Boolean(pending);
      session.wrongAnswers = [...pending?.wrong || []];
      session.feedback = pending ? { kind: "try", text: "Not yet. Check the job of the word and try again." } : null;
      session.answered = false;
    }
  }
  function route() {
    const hash = location.hash;
    tutoring?.back?.(hash);
    const match = /^#(day|retry|review)-(\d+)$/.exec(hash);
    if (match) {
      const dayNumber = Number(match[2]), day = data.days[dayNumber - 1];
      if (!day) {
        location.hash = "home";
        view = { kind: "home" };
        emit();
        return;
      }
      const saved = state.days[day.id] || {};
      if (match[1] === "review") {
        view = { kind: "review", dayNumber, index: 0 };
        session = null;
      } else if (saved.complete && match[1] !== "retry") {
        view = { kind: "summary", dayNumber };
        session = null;
      } else {
        session = { day, dayNumber, items: buildItems(data, dayNumber), index: match[1] === "retry" ? 0 : saved.index || 0, correct: match[1] === "retry" ? 0 : saved.correct || 0, attempts: saved.attempts || 0, answers: match[1] === "retry" ? [] : [...saved.answers || []] };
        view = { kind: "mission", dayNumber };
        resetQuestion();
        if (session.index >= session.items.length) completeMission();
      }
    } else {
      session = null;
      view = { kind: hash === "#catalog" || location.catalogStart && hash !== "#home" ? "catalog" : "home" };
    }
    emit();
  }
  async function start() {
    if (tutoring?.gated) return;
    events.addEventListener("hashchange", route);
    events.addEventListener("online", online);
    route();
    if (tutoring?.authenticated && !preview) {
      const dump = Object.fromEntries([key, key + ":pending", key + ":revision"].map((k) => [k, read(k)]).filter(([, v]) => v !== null));
      tutoring.call("deviceDump", null, null, null, JSON.stringify(dump)).catch(() => {
      });
    }
    if (tutoring?.authenticated || preview) {
      try {
        const result = await tutoring.call(preview ? "preview" : "load");
        if (disposed) return;
        revision = result.revision;
        evidence = result.evidenceByDay || {};
        if (preview) {
          state = { ...freshState(), ...result.state || {} };
          browserToken = result.browserToken || null;
          diagnostics = { learnerId: result.learner?.id, history: result.history, rowsForUnit: result.rowsForUnit, resultsRows: result.resultsRows, recovered: result.recovered || 0 };
          restored = false;
          status(`Tutor preview · ${result.learner?.name || "learner"} · read only`);
          route();
          return;
        }
        const unconfirmed = Boolean(read(key + ":pending")) && Number(read(key + ":revision") || 0) !== revision;
        state = mergeProgress(result.state || {}, state);
        restored = true;
        if (unconfirmed) {
          syncPending = true;
          syncUrgent = true;
          status("Progress merged. Saving your latest answer…");
        }
        save();
        if (result.recovered) status(`Progress restored from your history (${result.recovered} days).`);
        else if (!unconfirmed) status("Progress connected.");
      } catch (error) {
        if (disposed) return;
        if (preview) {
          restored = false;
          status("Preview could not reach the tutor sheet. Reopen the link from Telegram or refresh.");
        } else {
          restored = true;
          syncPending = read(key) !== null;
          status(error.message + " You can keep working; it syncs when the connection returns.");
        }
      }
    }
    route();
  }
  function award(id) {
    if (id && !state.badges.includes(id)) {
      state.badges.push(id);
      state.xp += 25;
    }
  }
  function putDay(patch) {
    const previous = state.days[session.day.id] || {};
    state.days[session.day.id] = { ...previous, index: session.index, correct: session.correct, attempts: session.attempts, answers: session.answers, ...patch };
  }
  function seen(q) {
    return [.../* @__PURE__ */ new Set([...state.days[session.day.id]?.seen || [], q])];
  }
  function answer(value) {
    if (!session || session.answered) return;
    const item = session.items[session.index];
    if (!["mc", "type"].includes(item?.type) || !String(value).trim()) return;
    session.attempts++;
    const ok = [item.a, ...item.accept || []].map(normalise).includes(normalise(value));
    if (!ok) {
      const text = String(value).trim().slice(0, 200);
      session.wrongThisQuestion = true;
      if (!session.wrongAnswers.includes(text)) session.wrongAnswers.push(text);
      session.answers = session.answers.filter((answer2) => answer2.q !== item.q);
      session.answers.push({ q: item.q, correct: false, pending: true, firstTry: false, recovered: false, wrong: session.wrongAnswers.slice(-8), expected: String(item.a).slice(0, 200), at: (/* @__PURE__ */ new Date()).toISOString() });
      session.feedback = { kind: "try", text: "Not yet. Check the job of the word and try again." };
      putDay({ seen: seen(item.q) });
      save(true);
      return;
    }
    session.answered = true;
    session.correct++;
    state.xp += 10;
    if (session.usedHint) {
      state.hintRecoveries++;
      award("comeback");
    }
    session.feedback = { kind: "ok", text: item.a };
    session.answers = session.answers.filter((answer2) => answer2.q !== item.q);
    session.answers.push({ q: item.q, correct: true, firstTry: !session.wrongThisQuestion && !session.usedHint, recovered: Boolean(session.usedHint), wrong: session.wrongAnswers.slice(-8), expected: String(item.a).slice(0, 200) });
    putDay({ index: session.index + 1, seen: seen(item.q) });
    save(true);
  }
  function hint() {
    const item = session?.items[session.index];
    if (!item?.hint?.length || session.answered) return;
    session.feedback = { kind: "hint", text: item.hint[Math.min(session.hintLevel, item.hint.length - 1)] };
    session.hintLevel++;
    session.usedHint = true;
    emit();
  }
  function draft(value) {
    if (!session || preview) return;
    const previous = state.days[session.day.id] || {};
    putDay({ drafts: { ...previous.drafts || {}, [session.index]: String(value).slice(0, 4e3) } });
    save();
  }
  function production(text, checks) {
    if (!session || session.answered) return;
    const item = session.items[session.index];
    const required = item.type === "writing" ? item.checks : item.prompts;
    if (!["writing", "speaking"].includes(item.type) || checks.length !== required.length || checks.some((value) => value !== true)) return;
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    if (item.type === "writing" && words < item.minWords) return;
    session.answered = true;
    session.attempts++;
    session.correct++;
    session.answers.push(item.type === "writing" ? { q: item.q, production: true, text: String(text).trim().slice(0, 4e3), status: "TEACHER_PENDING", words } : { q: item.q, speaking: true, status: "SELF_REPORTED" });
    advance();
  }
  function advance() {
    if (!session || !session.answered) return;
    session.index++;
    putDay({});
    save();
    resetQuestion();
    if (session.index >= session.items.length) completeMission();
    else emit();
  }
  function completeMission() {
    const total = session.items.length, score = Math.round(session.correct / total * 100), previous = state.days[session.day.id] || {}, at = (/* @__PURE__ */ new Date()).toISOString();
    const runs = [...previous.runs || [], { at, score, correct: session.correct, total, attempt: session.attempts }];
    putDay({ index: total, complete: true, score: Math.max(Number(previous.score) || 0, score), completedAt: previous.completedAt || at, lastAttemptAt: at, runs });
    state.xp += 30;
    if (score >= 70) award(session.day.badge);
    if (data.days.every((day) => state.days[day.id]?.complete)) award("week");
    view = { kind: "complete", dayNumber: session.dayNumber, score, at, runs: runs.length };
    completion = { text: preview ? "Preview run — kept in memory, nothing sent to the tutor." : tutoring?.authenticated ? "Saving your result to your tutor…" : "Saved on this device.", ready: !tutoring?.authenticated || preview };
    save(true);
  }
  function online() {
    if (restored && tutoring?.authenticated && !preview) {
      syncPending = true;
      syncProgress();
    }
  }
  function dispose() {
    disposed = true;
    clock.clearTimeout(timer);
    events.removeEventListener("hashchange", route);
    events.removeEventListener("online", online);
    listeners.clear();
  }
  emit();
  return {
    data,
    tutoring,
    key,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    dispose,
    answer,
    hint,
    draft,
    production,
    advance,
    syncProgress,
    reviewAt(index) {
      view = { ...view, index };
      emit();
    }
  };
}
export {
  createQuestController
};
