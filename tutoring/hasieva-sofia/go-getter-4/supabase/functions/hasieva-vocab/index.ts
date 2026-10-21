import { verifyBrowserSession } from './browser-auth.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import bank from '../_shared/vocab/unit2.json' with { type: 'json' };
import { createHandler } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'unconfigured', { auth: { persistSession: false } });
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await admin.schema('app').rpc(name, args);
  if (error) throw new Error('Progress could not be saved. Please retry.');
  return data;
}
Deno.serve(createHandler({
  botToken: Deno.env.get('TELEGRAM_BOT_TOKEN') || '',
  allowedIds: new Set((Deno.env.get('HASIEVA_VOCAB_LEARNER_IDS') || '').split(',').filter(Boolean).map(Number)),
  origin: Deno.env.get('HASIEVA_APP_ORIGIN') || 'https://2rister.github.io',
  verifyBrowser: browserSession => verifyBrowserSession(browserSession),
  load: id => rpc('load_vocab', { p_telegram_id: id, p_set_id: bank.id }),
  save: (id, event) => rpc('record_vocab_attempt', {
    p_telegram_id: id, p_request_id: event.requestId, p_session_id: event.sessionId,
    p_set_id: bank.id, p_item_id: event.itemId, p_version: bank.version,
    p_mode: event.mode, p_answer: event.answer, p_hinted: event.hinted, p_self_correct: event.selfCorrect,
  }),
}));
