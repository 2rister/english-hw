export const SET_ID = 'unit-2-home-housework';
export const MODES = ['listen', 'context', 'letters', 'exam', 'paper'];

export function normalize(answer, item) {
  const value = String(answer).normalize('NFC').trim().replace(/\s+/g, ' ');
  return item.english === 'TV' ? value : value.toLocaleLowerCase('en-GB');
}

export function checkAnswer(item, answer) {
  return normalize(answer, item) === normalize(item.english, item);
}

export function validateEvent(bank, event) {
  if (!event || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.requestId || '')) throw new Error('Invalid request ID');
  const item = bank.items.find(word => word.id === event.itemId);
  if (!item || event.version !== bank.version || !MODES.includes(event.mode)) throw new Error('Unknown word, exercise or content version');
  if (typeof event.answer !== 'string' || event.answer.length > 240 || typeof event.hinted !== 'boolean') throw new Error('Invalid answer');
  if (event.mode === 'paper' && typeof event.selfCorrect !== 'boolean') throw new Error('Paper check needs a self-report');
  if (event.mode !== 'paper' && !event.answer.trim()) throw new Error('Write an answer first');
  return {
    requestId: event.requestId, sessionId: event.sessionId, itemId: item.id, version: bank.version,
    mode: event.mode, answer: event.answer,
    hinted: event.hinted || event.mode === 'letters',
    correct: event.mode === 'paper' ? null : checkAnswer(item, event.answer),
    selfCorrect: event.mode === 'paper' ? event.selfCorrect : null,
  };
}

export function dayKey(time) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
}

export function wordStats(events, itemId) {
  const records = events.filter(event => event.itemId === itemId);
  const skill = mode => {
    const attempts = records.filter(event => mode === 'listen' ? ['listen', 'exam'].includes(event.mode) : event.mode === mode);
    const independent = attempts.filter(event => !event.hinted);
    const last = independent.at(-1);
    // A later error invalidates earlier successes for the current readiness signal.
    const lastError = independent.findLastIndex(event => !event.correct);
    const clean = independent.slice(lastError + 1).filter(event => event.correct);
    const confirmed = clean.filter(event => event.confirmed && event.receivedAt);
    const confirmedDays = new Set(confirmed.map(event => dayKey(event.receivedAt)));
    if (confirmed.length && new Date(confirmed.at(-1).receivedAt) - new Date(confirmed[0].receivedAt) < 12 * 3600000) confirmedDays.clear();
    return { attempts: independent.length, lastCorrect: last?.correct ?? null, clean: clean.length, days: confirmedDays.size, correct: independent.filter(event => event.correct).length };
  };
  return { listen: skill('listen'), context: skill('context'), seen: records.length > 0, paper: records.filter(event => event.mode === 'paper') };
}

export function summary(bank, events) {
  const words = bank.items.map(item => ({ item, ...wordStats(events, item.id) }));
  return {
    total: words.length,
    checked: words.filter(word => word.listen.attempts).length,
    written: words.filter(word => word.listen.lastCorrect === true).length,
    retained: words.filter(word => word.listen.days >= 2).length,
    context: words.filter(word => word.context.lastCorrect === true).length,
    weak: words.filter(word => word.listen.lastCorrect === false).length,
    pending: events.filter(event => !event.confirmed).length,
  };
}

export function pickRound(bank, events, mode, limit = 9) {
  const skill = mode === 'context' ? 'context' : 'listen';
  const ranked = bank.items.map((item, index) => {
    const state = wordStats(events, item.id)[skill];
    const last = events.findLastIndex(event => event.itemId === item.id && (skill === 'context' ? event.mode === 'context' : ['listen', 'exam'].includes(event.mode)));
    return { item, index, rank: state.lastCorrect === false ? 0 : state.attempts === 0 ? 1 : 2, last };
  });
  ranked.sort((a, b) => a.rank - b.rank || a.last - b.last || a.index - b.index);
  // Round order changes; spelling cannot be memorised as a fixed answer sequence.
  return shuffle(ranked.slice(0, limit).map(entry => entry.item.id));
}

export function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function gap(item, variant = 0) {
  const escaped = item.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return item.contexts[variant % item.contexts.length].replace(new RegExp('\\b' + escaped + '\\b', 'i'), '________');
}

export function mask(item) {
  let letter = 0;
  return [...item.english].map(char => /[a-z]/i.test(char) && ++letter % 2 === 0 ? '_' : char).join('');
}
