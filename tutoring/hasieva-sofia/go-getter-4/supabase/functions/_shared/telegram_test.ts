import { verifyTelegramInitData } from "./telegram.ts";

const encoder = new TextEncoder();
async function hmac(key: Uint8Array, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data)),
  );
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
async function signedInitData(token: string, fields: Record<string, string>) {
  const check = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = await hmac(encoder.encode("WebAppData"), token);
  const hash = hex(await hmac(secret, check));
  return Object.entries({ ...fields, hash }).map(([key, value]) =>
    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  ).join("&");
}

Deno.test("accepts a current, correctly signed Telegram WebApp payload", async () => {
  const raw = await signedInitData("test-token", {
    auth_date: "1000",
    query_id: "AAE",
    user: '{"id":42,"first_name":"Synthetic"}',
  });
  const result = await verifyTelegramInitData(raw, "test-token", 1001);
  if (result.user.id !== 42 || result.authDate !== 1000) {
    throw new Error("valid payload was not retained");
  }
});

Deno.test("rejects a tampered or duplicate Telegram WebApp field", async () => {
  const raw = await signedInitData("test-token", {
    auth_date: "1000",
    user: '{"id":42}',
  });
  await Promise.all([
    verifyTelegramInitData(
      raw.replace("id%22%3A42", "id%22%3A43"),
      "test-token",
      1001,
    ).then(() => {
      throw new Error("tampering accepted");
    }, () => undefined),
    verifyTelegramInitData(`${raw}&auth_date=1000`, "test-token", 1001).then(
      () => {
        throw new Error("duplicate accepted");
      },
      () => undefined,
    ),
  ]);
});

Deno.test("rejects an expired but correctly signed payload", async () => {
  const raw = await signedInitData("test-token", {
    auth_date: "1000",
    user: '{"id":42}',
  });
  await verifyTelegramInitData(raw, "test-token", 87_401).then(() => {
    throw new Error("expired payload accepted");
  }, () => undefined);
});
