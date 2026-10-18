import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTelegramInitData } from "../_shared/telegram.ts";

const allowedUnits = new Set(["street-style", "grammar-snack-01"]);
const allowedOrigin = Deno.env.get("HASIEVA_APP_ORIGIN") ??
  "https://2rister.github.io";
const corsHeaders = { "Content-Type": "application/json", "Vary": "Origin" };

function respond(
  status: number,
  body: Record<string, unknown>,
  origin?: string | null,
): Response {
  const headers = new Headers(corsHeaders);
  if (origin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== allowedOrigin) {
    return respond(403, { error: "Origin is not allowed" }, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "POST required" }, origin);
  }
  try {
    const payload = await request.json();
    if (
      !payload || typeof payload !== "object" || !allowedUnits.has(payload.unit)
    ) throw new Error("Unknown unit");
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
    const verified = await verifyTelegramInitData(payload.initData, botToken);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server is not configured");
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (payload.action === "load") {
      const { data: learner, error: learnerError } = await admin.from(
        "learners",
      ).select("id").eq("telegram_user_id", verified.user.id).maybeSingle();
      if (learnerError) throw learnerError;
      if (!learner) {
        return respond(200, { ok: true, state: null, revision: 0 }, origin);
      }
      const { data, error } = await admin.from("learner_progress").select(
        "state, revision",
      ).eq("learner_id", learner.id).eq("unit_id", payload.unit).maybeSingle();
      if (error) throw error;
      return respond(200, {
        ok: true,
        state: data?.state ?? null,
        revision: data?.revision ?? 0,
      }, origin);
    }
    if (
      payload.action !== "save" || !Number.isInteger(payload.revision) ||
      payload.revision < 0 || !payload.state ||
      typeof payload.state !== "object" || typeof payload.requestId !== "string"
    ) {
      throw new Error("Invalid progress request");
    }
    const { data, error } = await admin.schema("app").rpc(
      "server_save_progress",
      {
        p_telegram_user_id: verified.user.id,
        p_unit_id: payload.unit,
        p_expected_revision: payload.revision,
        p_state: payload.state,
        p_request_id: payload.requestId,
      },
    ).single();
    if (error) throw error;
    if (
      !data || typeof data !== "object" || !("conflict" in data) ||
      !("revision" in data) || typeof data.conflict !== "boolean" ||
      !Number.isInteger(data.revision)
    ) {
      throw new Error("Invalid server progress response");
    }
    return respond(
      200,
      data.conflict
        ? { ok: false, conflict: true, revision: data.revision }
        : { ok: true, saved: true, revision: data.revision },
      origin,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return respond(
      message.includes("could not be verified") ||
        message.includes("Open this app")
        ? 401
        : 400,
      { error: message.slice(0, 180) },
      origin,
    );
  }
});
