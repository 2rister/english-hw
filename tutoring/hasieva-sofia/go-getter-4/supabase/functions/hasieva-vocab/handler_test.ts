import { createHandler } from './handler.ts';
import bank from '../_shared/vocab/unit2.json' with { type: 'json' };

const token = 'SYNTHETIC_TEST_TOKEN';
const encoder = new TextEncoder();
async function hmac(key: Uint8Array, value: string) {
  const material = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', material, encoder.encode(value)));
}
async function login(id: number) {
  const fields = new Map([['auth_date', String(Math.floor(Date.now() / 1000))], ['user', JSON.stringify({ id })]]);
  const check = [...fields.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = await hmac(encoder.encode('WebAppData'), token);
  fields.set('hash', [...await hmac(secret, check)].map(byte => byte.toString(16).padStart(2, '0')).join(''));
  return new URLSearchParams(fields).toString();
}
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message); };
const saved: Array<{ id: number; event: Record<string, unknown> }> = [];
const handler = createHandler({ botToken: token, allowedIds: new Set([101, 202]), origin: 'https://test.invalid', load: async id => saved.filter(row => row.id === id).map(row => row.event), save: async (id, event) => { saved.push({ id, event }); return { ...event, confirmed: true }; } });
const request = (body: unknown, origin = 'https://test.invalid') => new Request('https://test.invalid/vocab', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });

Deno.test('auth and assignment reject anonymous, wrong origin and unassigned users', async () => {
  assert((await handler(request({ action: 'load', setId: bank.id }))).status === 401);
  assert((await handler(request({ action: 'load', setId: bank.id, initData: await login(999) }))).status === 403);
  assert((await handler(request({}, 'https://evil.invalid'))).status === 403);
});
Deno.test('signed identity owns the record; forged correctness and client learner ID are ignored', async () => {
  const event = { requestId: crypto.randomUUID(), sessionId: crypto.randomUUID(), itemId: 'u2-079', version: bank.version, mode: 'listen', answer: 'wardrob', hinted: false, correct: true };
  const response = await handler(request({ action: 'attempt', setId: bank.id, initData: await login(101), telegramId: 202, event }));
  assert(response.status === 200); const result = await response.json(); assert(result.event.correct === false); assert(saved.at(-1)?.id === 101);
  const other = await handler(request({ action: 'load', setId: bank.id, initData: await login(202) })); assert((await other.json()).events.length === 0);
});
Deno.test('unknown content and invalid events never reach storage', async () => {
  const before = saved.length;
  const response = await handler(request({ action: 'attempt', setId: bank.id, initData: await login(101), event: { itemId: 'unknown' } }));
  assert(response.status === 400); assert(saved.length === before);
});
