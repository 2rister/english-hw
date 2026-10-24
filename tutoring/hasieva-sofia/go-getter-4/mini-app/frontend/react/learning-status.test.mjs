import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskStatus, dayStatus, grammarStatus, vocabTaskStatus, vocabStatus } from './learning-status.mjs';

test('unknown progress stays neutral; recorded activity and completion remain visible', () => {
  assert.equal(taskStatus(false, false, false), undefined);
  assert.equal(taskStatus(false, true, false), 'in-progress');
  assert.equal(taskStatus(true, true, false), 'complete');
  assert.equal(dayStatus({}, false), undefined);
  assert.equal(dayStatus(), 'not-started');
  for (const state of [{ index: 3 }, { attempts: 1 }, { answers: [{ correct: false }] }, { drafts: { 0: 'draft' } }]) assert.equal(dayStatus(state), 'in-progress');
  assert.equal(dayStatus({}, true, 2), 'in-progress');
  assert.equal(dayStatus({ complete: true, attempts: 1 }), 'complete');
});

test('grammar distinguishes untouched theory, ongoing practice and attained mastery', () => {
  assert.equal(grammarStatus({}, false), undefined);
  assert.equal(grammarStatus({}), 'not-started');
  assert.equal(grammarStatus({ theoryStep: 2 }), 'in-progress');
  assert.equal(grammarStatus({ theoryDone: true, history: [{ score: 60 }] }), 'in-progress');
  assert.equal(grammarStatus({ history: [{ score: 95 }] }), 'complete');
  assert.equal(grammarStatus({ current: { variantId: '02', index: 0 }, history: [{ score: 95 }] }), 'in-progress');
});

const events = (mode, count, sessionId = 'synthetic', hinted = false) => Array.from({ length: count }, (_, i) => ({ mode, sessionId, itemId: 'word-' + i, hinted }));
test('vocab separates guided stories, 25-word checks and the full 81-word dictation', () => {
  const state = { events: events('exam', 25, 'story', true) };
  assert.equal(vocabTaskStatus(state, 'exam', 25, true, false), 'not-started');
  assert.equal(vocabTaskStatus(state, 'exam', 25, true, true), 'complete');
  state.events.push(...events('exam', 25, 'independent'));
  assert.equal(vocabTaskStatus(state, 'exam', 25, true, false), 'complete');
  assert.equal(vocabTaskStatus(state, 'exam', 81, true, false), 'in-progress');
  assert.equal(vocabTaskStatus({ session: { mode: 'context', ids: ['word-0'], index: 0 } }, 'context'), 'in-progress');
  assert.equal(vocabTaskStatus({}, 'listen', 81, false), undefined);
  assert.equal(vocabStatus({}, false), undefined);
});

test('vocab completion requires distinct items and a complete round, not duplicate answers', () => {
  const repeated = { events: Array(81).fill({ mode: 'exam', sessionId: 'repeat', itemId: 'word-0' }) };
  assert.equal(vocabTaskStatus(repeated, 'exam'), 'in-progress');
  const partial = { events: [...events('exam', 12, 'one'), ...events('exam', 13, 'two')] };
  assert.equal(vocabTaskStatus(partial, 'exam', 25), 'in-progress');
  assert.equal(vocabTaskStatus({ events: events('paper', 9) }, 'paper', 9), 'complete');
  assert.equal(vocabStatus({ events: ['listen', 'context', 'exam'].flatMap(mode => events(mode, 81)) }), 'complete');
  assert.equal(vocabTaskStatus({ events: events('exam',81), session: { mode:'exam',index:2,ids:Array(81) } },'exam'), 'in-progress');
});
