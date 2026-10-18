const freshState = () => ({ xp: 0, days: {}, badges: [], hintRecoveries: 0 });
const normalise = (value) => String(value).toLowerCase().trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
function mergeProgress(remote = {}, local = {}) {
  const merged = { ...freshState(), ...remote, ...local, days: {}, badges: [.../* @__PURE__ */ new Set([...remote.badges || [], ...local.badges || []])], xp: Math.max(remote.xp || 0, local.xp || 0), hintRecoveries: Math.max(remote.hintRecoveries || 0, local.hintRecoveries || 0) };
  for (const id of /* @__PURE__ */ new Set([...Object.keys(remote.days || {}), ...Object.keys(local.days || {})])) {
    const a = remote.days?.[id] || {}, b = local.days?.[id] || {};
    const rank = (day) => (day.complete ? 1e6 : 0) + (Number(day.index) || 0) * 1e3 + (day.answers?.length || 0);
    const newer = rank(b) >= rank(a) ? b : a, older = newer === b ? a : b;
    const runs = [...older.runs || [], ...newer.runs || []].filter((run, index, list) => list.findIndex((other) => other.at === run.at) === index).sort((a2, b2) => String(a2.at).localeCompare(String(b2.at)));
    const answers = new Map((older.answers || []).map((answer) => [answer.q, answer]));
    for (const answer of newer.answers || []) {
      const prior = answers.get(answer.q);
      answers.set(answer.q, { ...prior, ...answer, wrong: [.../* @__PURE__ */ new Set([...prior?.wrong || [], ...answer.wrong || []])] });
    }
    merged.days[id] = { ...older, ...newer, complete: Boolean(a.complete || b.complete), score: Math.max(a.score || 0, b.score || 0), seen: [.../* @__PURE__ */ new Set([...a.seen || [], ...b.seen || []])], answers: [...answers.values()], drafts: { ...older.drafts || {}, ...newer.drafts || {} }, runs };
  }
  return merged;
}
function daySeen(day, state, evidence = {}) {
  const saved = state.days[day.id] || {}, seen = new Set(saved.seen || []);
  for (const answer of saved.answers || []) if (answer?.q) seen.add(answer.q);
  return Math.min(Math.max(seen.size, Number(evidence[day.id]) || 0), day.questions.length);
}
function weeklyItems(data, state, evidence = {}) {
  const total = data.days.reduce((sum, day) => sum + day.questions.length, 0), done = data.days.reduce((sum, day) => sum + daySeen(day, state, evidence), 0);
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}
function buildItems(data, dayNumber) {
  const day = data.days[dayNumber - 1];
  if (!day) return [];
  const source = data.days[Math.max(0, dayNumber - 2)].questions;
  return [...day.questions, ...source.filter((q) => ["mc", "type"].includes(q.type)).slice(0, 6).map((q) => ({ ...q, q: `Memory sprint · ${q.q}` }))];
}
function reviewErrors(data, state, dayNumber) {
  const day = data.days[dayNumber - 1];
  if (!day) return [];
  const all = data.days.flatMap((day2) => day2.questions || []);
  return (state.days[day.id]?.answers || []).filter((answer) => answer.wrong?.length).map((answer) => {
    const item = day.questions.find((item2) => item2.q === answer.q) || all.find((item2) => String(answer.q).endsWith(item2.q));
    return { q: String(answer.q).replace(/^Memory sprint · /, ""), wrong: answer.wrong.filter(Boolean).slice(0, 3), expected: answer.expected || item?.a || "—", hint: (item?.hint || []).slice(0, 3) };
  });
}
export {
  buildItems,
  daySeen,
  freshState,
  mergeProgress,
  normalise,
  reviewErrors,
  weeklyItems
};
