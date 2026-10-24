export const statusLabel = { 'in-progress': 'Finish this', 'not-started': 'Not started' };

export function taskStatus(complete, started, known = true) {
  return complete ? 'complete' : started ? 'in-progress' : known ? 'not-started' : undefined;
}

export function dayStatus(saved = {}, known = true, evidence = 0) {
  return taskStatus(saved.complete, evidence > 0 || saved.index > 0 || saved.attempts > 0 ||
    saved.answers?.length || saved.seen?.length || saved.runs?.length ||
    Object.values(saved.drafts || {}).some(value => String(value).trim()), known);
}

export function grammarStatus(state = {}, known = true) {
  if (state.current?.variantId && !state.current.complete) return 'in-progress';
  return taskStatus(state.history?.some(attempt => attempt.score >= 90),
    state.theoryDone || state.theoryStep > 0 || state.current || state.history?.length, known);
}

export function vocabTaskStatus(state = {}, mode, size = 81, known = true, guided) {
  const matches = event => event.mode === mode && (guided === undefined || Boolean(event.hinted) === guided);
  const events = (state.events || []).filter(matches), sessions = new Map();
  for (const event of events) {
    if (!sessions.has(event.sessionId)) sessions.set(event.sessionId, new Set());
    sessions.get(event.sessionId).add(event.itemId);
  }
  const session = state.session, active = session?.mode === mode &&
    (guided === undefined || Boolean(session.storyId) === guided);
  const unfinished = active && session.index < session.ids?.length;
  const complete = !unfinished && ([...sessions.values()].some(items => items.size >= size) ||
    size === 81 && new Set(events.map(event => event.itemId)).size >= size);
  return taskStatus(complete, events.length || active, known);
}

export function vocabStatus(state = {}, known = true) {
  if (state.session?.index < state.session?.ids?.length) return 'in-progress';
  return taskStatus(['listen', 'context', 'exam'].every(mode =>
    vocabTaskStatus(state, mode, 81, known, mode === 'exam' ? false : undefined) === 'complete'),
  state.events?.length || state.session, known);
}
