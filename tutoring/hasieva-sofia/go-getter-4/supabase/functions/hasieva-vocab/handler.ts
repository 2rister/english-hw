import bank from '../_shared/vocab/unit2.json' with { type: 'json' };
import { validateEvent } from '../_shared/vocab/engine.mjs';
import { verifyTelegramInitData } from '../_shared/telegram.ts';

export type Dependencies = {
  botToken: string;
  allowedIds: Set<number>;
  origin: string;
  load: (telegramId: number) => Promise<unknown>;
  save: (telegramId: number, event: Record<string, unknown>) => Promise<unknown>;
};

export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Vary': 'Origin' };
    if (origin === deps.origin) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (origin && origin !== deps.origin) return reply(403, { error: 'Origin is not allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' } });
    if (request.method !== 'POST') return reply(405, { error: 'POST required' });
    if (Number(request.headers.get('content-length') || 0) > 16000) return reply(413, { error: 'Request is too large' });
    let authenticated = false;
    try {
      const raw = await request.text();
      if (raw.length > 16000) return reply(413, { error: 'Request is too large' });
      const payload = JSON.parse(raw);
      const verified = await verifyTelegramInitData(payload.initData, deps.botToken);
      authenticated = true;
      if (!deps.allowedIds.has(verified.user.id)) return reply(403, { error: 'This learning space is not assigned to this account' });
      if (payload.setId !== bank.id) return reply(400, { error: 'Unknown set' });
      if (payload.action === 'load') return reply(200, { ok: true, events: await deps.load(verified.user.id) });
      if (payload.action !== 'attempt') return reply(400, { error: 'Unknown action' });
      const event = validateEvent(bank, payload.event);
      const sessionId = payload.event.sessionId;
      if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) return reply(400, { error: 'Invalid session ID' });
      const saved = await deps.save(verified.user.id, { ...event, sessionId });
      return reply(200, { ok: true, event: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      return reply(authenticated ? 400 : 401, { error: message.slice(0, 180) });
    }
  };
}
