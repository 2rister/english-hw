import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { checkAnswer, validateEvent, summary, pickRound, gap } from '../../tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/vocab/engine.mjs';
import { mergeEvents, createSync, createCommitter } from '../progress.mjs';
const bank = JSON.parse(readFileSync(new URL('../../tutoring/hasieva-sofia/go-getter-4/supabase/functions/_shared/vocab/unit2.json', import.meta.url)));
const word = english => bank.items.find(item => item.english === english);
const event = (english, overrides = {}) => ({ requestId: randomUUID(), sessionId: randomUUID(), itemId: word(english).id, version: bank.version, mode: 'listen', answer: english, hinted: false, ...overrides });

test('all 81 source units have two usable contexts, unique IDs and matching keys', () => {
  assert.equal(bank.items.length, 81); assert.equal(new Set(bank.items.map(item => item.id)).size, 81);
  for (const item of bank.items) {
    assert.equal(checkAnswer(item, item.english), true);
    for (let v = 0; v < 2; v++) { assert.ok(gap(item, v).includes('________'), item.english); assert.ok(!new RegExp('\\b' + item.english + '\\b', 'i').test(gap(item, v)), item.english); }
  }
});
test('context gaps match words, not pieces of everyone or bathroom', () => {
  assert.equal(gap(word('even'), 1), 'Everyone helps at home, ________ my little brother.');
  assert.equal(gap(word('bath'), 0), 'There is a big ________ in the bathroom.');
});
test('full phrases, actual letters, word boundaries and TV case are required', () => {
  assert.equal(checkAnswer(word('make the bed'), '  MAKE   the BED '), true);
  assert.equal(checkAnswer(word('make the bed'), 'make bed'), false);
  assert.equal(checkAnswer(word('chest of drawers'), 'chest drawers'), false);
  assert.equal(checkAnswer(word('wardrobe'), 'wardrob'), false);
  assert.equal(checkAnswer(word('shelves'), 'shelf'), false);
  assert.equal(checkAnswer(word('TV'), 'tv'), false);
  assert.equal(checkAnswer(word('cupboard'), 'cup board'), false);
});
test('client correctness is ignored; letter scaffolds and paper reports cannot establish mastery', () => {
  assert.equal(validateEvent(bank, event('wardrobe', { answer: 'wardrob', correct: true })).correct, false);
  const letters = validateEvent(bank, event('wardrobe', { mode: 'letters' })); assert.equal(letters.hinted, true);
  const paper = validateEvent(bank, event('wardrobe', { mode: 'paper', answer: '', selfCorrect: true })); assert.equal(paper.correct, null);
  assert.equal(summary(bank, [letters, paper]).written, 0);
  assert.throws(() => validateEvent(bank, event('wardrobe', { version: 'stale' })), /version/);
});
test('retention needs confirmed independent successes on different days with actual spacing; later error clears it', () => {
  const first = { ...validateEvent(bank, event('wardrobe')), confirmed: true, receivedAt: '2026-10-15T12:00:00Z' };
  const second = { ...first, requestId: randomUUID(), receivedAt: '2026-10-16T12:00:00Z' };
  assert.equal(summary(bank, [first, { ...second, confirmed: false }]).retained, 0);
  assert.equal(summary(bank, [first, second]).retained, 1);
  assert.equal(summary(bank, [first, second, { ...second, correct: false }]).retained, 0);
  assert.equal(summary(bank, [{ ...first, receivedAt: '2026-10-15T20:59:00Z' }, { ...second, receivedAt: '2026-10-15T21:01:00Z' }]).retained, 0);
});
test('rounds prioritise actual errors and untested words without duplicate IDs', () => {
  const weak = validateEvent(bank, event('wood', { answer: 'wod' }));
  const round = pickRound(bank, [weak], 'listen'); assert.equal(round.length, 9); assert.equal(new Set(round).size, 9); assert.ok(round.includes(word('wood').id));
});
test('server event replaces optimistic evidence for the same stable request ID', () => {
  const local = validateEvent(bank, event('wood'));
  const merged = mergeEvents([{ ...local, confirmed: true, receivedAt: '2026-10-15T10:00:00Z' }], [{ ...local, confirmed: false }]);
  assert.equal(merged.length, 1); assert.equal(merged[0].confirmed, true);
});
test('failed uploads stay pending; retry preserves IDs and confirms exactly once', async () => {
  const original = { ...validateEvent(bank, event('wood')), confirmed: false, createdAt: '2026-10-15T10:00:00Z' };
  const state = { events: [original] }; let fail = true; const requests = [], notices = [];
  const commit = createCommitter(state, { save: async () => {} });
  const sync = createSync({ endpoint: 'https://test.invalid', initData: 'synthetic', bank, state, commit, notify: (...args) => notices.push(args), request: async (url, options) => {
    const data = JSON.parse(options.body); if (data.action === 'load') return Response.json({ ok: true, events: [] });
    requests.push(data.event.requestId); if (fail) throw new Error('offline');
    return Response.json({ ok: true, event: { ...original, confirmed: true, receivedAt: '2026-10-15T10:00:00Z' } });
  } });
  await sync.flush(); assert.equal(state.events[0].confirmed, false);
  fail = false; await sync.flush(); assert.equal(state.events.length, 1); assert.equal(state.events[0].confirmed, true);
  assert.deepEqual(requests, [original.requestId, original.requestId]); assert.equal(notices.at(-1)[1], true);
});
test('answer and background merge share one commit queue; stale snapshots cannot erase evidence', async () => {
  const state = { events: [], session: { index: 0 } }; let disk, release;
  const gate = new Promise(resolve => { release = resolve; }); let writes = 0;
  const commit = createCommitter(state, { save: async next => { if (++writes === 1) await gate; disk = structuredClone(next); } });
  const first = commit(next => { next.events.push(validateEvent(bank, event('wood'))); next.session.index++; });
  await Promise.resolve();
  const background = commit(next => { next.events = mergeEvents([], next.events); });
  release(); await Promise.all([first, background]);
  assert.equal(state.events.length, 1); assert.equal(disk.events.length, 1); assert.equal(disk.session.index, 1);
});
test('a rejected commit leaves the current answer and position intact and the queue can recover', async () => {
  const state = { events: [], session: { index: 0 } }; let fail = true;
  const commit = createCommitter(state, { save: async () => { if (fail) throw new Error('quota'); } });
  await assert.rejects(commit(next => { next.session.index++; }), /quota/); assert.equal(state.session.index, 0);
  fail = false; await commit(next => { next.session.index++; }); assert.equal(state.session.index, 1);
});
test('answers added during an upload are drained before a confirmed status is shown', async () => {
  const first = { ...validateEvent(bank, event('wood')), confirmed: false }, second = { ...validateEvent(bank, event('wardrobe')), confirmed: false };
  const state = { events: [first] }, uploads = []; let release, started;
  const gate = new Promise(resolve => { release = resolve; }), uploading = new Promise(resolve => { started = resolve; });
  const commit = createCommitter(state, { save: async () => {} });
  const sync = createSync({ endpoint: 'https://test.invalid', initData: 'synthetic', bank, state, commit, notify: (text, confirmed) => { if (confirmed) assert.equal(state.events.some(event => !event.confirmed), false); }, request: async (url, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'load') return Response.json({ ok: true, events: [] });
    uploads.push(body.event.requestId); if (uploads.length === 1) { started(); await gate; }
    return Response.json({ ok: true, event: { ...body.event, confirmed: true, receivedAt: '2026-10-15T10:00:00Z' } });
  } });
  const running = sync.flush(); await uploading;
  await commit(next => { next.events.push(second); }); const pending = sync.flush(); release(); await Promise.all([running, pending]);
  assert.deepEqual(uploads, [first.requestId, second.requestId]); assert.equal(state.events.every(event => event.confirmed), true);
});
