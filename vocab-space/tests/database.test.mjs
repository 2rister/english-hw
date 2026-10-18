import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`create schema auth;
  create role anon; create role authenticated; create role service_role bypassrls;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
  grant usage on schema auth to authenticated;`);
const migrations = new URL('../../tutoring/hasieva-sofia/go-getter-4/supabase/migrations/', import.meta.url);
// PGlite already provides gen_random_uuid; pgcrypto itself is not needed by these migrations.
await db.exec(readFileSync(new URL('202610130001_hasieva_core.sql', migrations), 'utf8').replace('create extension if not exists pgcrypto;', ''));
await db.exec(readFileSync(new URL('202610150001_vocab_space.sql', migrations), 'utf8'));
after(async () => { await db.close(); });
const params = (overrides = {}) => ({ learner: 101, request: randomUUID(), session: randomUUID(), item: 'u2-079', mode: 'listen', answer: 'wardrobe', hinted: false, self: null, ...overrides });
async function save(p) {
  const result = await db.query('select app.record_vocab_attempt($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) event', [p.learner, p.request, p.session, 'unit-2-home-housework', p.item, '2026-10-15.1', p.mode, p.answer, p.hinted, p.self]);
  return result.rows[0].event;
}
async function role(roleName, user, query, args = []) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
  await db.exec(`set role ${roleName}`);
  try { return await db.query(query, args); } finally { await db.exec('reset role'); }
}

test('real PostgreSQL migration accepts all 81 definitions and computes correctness itself', async () => {
  assert.equal((await db.query("select jsonb_array_length(definition->'items') n from vocab_sets")).rows[0].n, 81);
  const p = params({ answer: 'wardrob' }); const result = await save(p);
  assert.equal(result.correct, false); assert.equal(result.confirmed, true);
  await assert.rejects(save(params({ item: 'u2-999' })), /Unknown word/);
  assert.equal((await save(params({ item: 'u2-075', answer: 'tv' }))).correct, false);
  assert.equal((await save(params({ item: 'u2-049', answer: '  MAKE   the BED ' }))).correct, true);
});
test('idempotency survives retry and rejects changing the meaning of a request ID', async () => {
  const p = params(); const first = await save(p), second = await save(p);
  assert.deepEqual(second, first);
  assert.equal((await db.query('select answers from vocab_sessions where session_id=$1', [p.session])).rows[0].answers, 1);
  await assert.rejects(save({ ...p, answer: 'wrong' }), /reused/);
});
test('scaffolds and self-reported handwriting never advance verified skill progress', async () => {
  const before = (await db.query('select sum(independent_attempts)::int n from vocab_progress')).rows[0].n;
  assert.equal((await save(params({ mode: 'letters' }))).hinted, true);
  assert.equal((await save(params({ mode: 'paper', answer: '', self: true }))).correct, null);
  assert.equal((await db.query('select sum(independent_attempts)::int n from vocab_progress')).rows[0].n, before);
});
test('verified days require server-time spacing; a later independent error clears readiness', async () => {
  const p = params({ learner: 303, item: 'u2-081', answer: 'wood' });
  await save(p);
  await db.query("update vocab_attempts set received_at=clock_timestamp()-interval '1 day' where request_id=$1", [p.request]);
  await save(params({ learner: 303, item: 'u2-081', answer: 'wood' }));
  assert.equal((await db.query("select verified_days from vocab_progress where item_id='u2-081'")).rows[0].verified_days, 2);
  await save(params({ learner: 303, item: 'u2-081', answer: 'wod' }));
  assert.equal((await db.query("select verified_days from vocab_progress where item_id='u2-081'")).rows[0].verified_days, 0);
});
test('learner RLS, assigned teacher scope and server-only RPC are enforced by PostgreSQL', async () => {
  await save(params({ learner: 202 }));
  const userA = randomUUID(), userB = randomUUID(), teacher = randomUUID(), stranger = randomUUID();
  await db.query('update learners set auth_user_id=$1 where telegram_user_id=101', [userA]);
  await db.query('update learners set auth_user_id=$1 where telegram_user_id=202', [userB]);
  const own = await role('authenticated', userA, 'select distinct learner_id from vocab_attempts'); assert.equal(own.rows.length, 1);
  const b = (await db.query('select id from learners where telegram_user_id=202')).rows[0].id;
  assert.equal((await role('authenticated', userA, 'select * from vocab_attempts where learner_id=$1', [b])).rows.length, 0);
  await assert.rejects(role('authenticated', userA, 'update vocab_progress set verified_days=100'), /permission denied/);
  await assert.rejects(role('authenticated', userA, "select app.load_vocab(202,'unit-2-home-housework')"), /permission denied/);
  await db.query('insert into vocab_teacher_learners select $1,id from learners where telegram_user_id=101', [teacher]);
  assert.equal((await role('authenticated', teacher, 'select distinct learner_id from vocab_attempts')).rows.length, 1);
  assert.equal((await role('authenticated', stranger, 'select * from vocab_attempts')).rows.length, 0);
  await assert.rejects(role('anon', '', 'select * from vocab_attempts'), /permission denied/);
  const state = await role('service_role', '', "select app.load_vocab(101,'unit-2-home-housework') events"); assert.ok(state.rows[0].events.length > 0);
});
