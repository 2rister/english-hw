const encoder = new TextEncoder();
const MAX_INIT_DATA_LENGTH = 12_000;

export type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};
export type VerifiedTelegramInitData = { user: TelegramUser; authDate: number };

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
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

function constantTimeEquals(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^
      (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

/** Verifies Telegram WebApp initData without trusting initDataUnsafe from the browser. */
export async function verifyTelegramInitData(
  raw: unknown,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<VerifiedTelegramInitData> {
  if (
    typeof raw !== "string" || raw.length === 0 ||
    raw.length > MAX_INIT_DATA_LENGTH || !botToken
  ) {
    throw new Error("Open this app through Telegram");
  }
  const fields = new Map<string, string>();
  for (const part of raw.split("&")) {
    const separator = part.indexOf("=");
    if (separator < 1) throw new Error("Invalid Telegram login");
    const key = decodeURIComponent(part.slice(0, separator));
    if (fields.has(key)) throw new Error("Duplicate login field");
    fields.set(
      key,
      decodeURIComponent(part.slice(separator + 1).replace(/\+/g, " ")),
    );
  }
  const receivedHash = fields.get("hash") ?? "";
  fields.delete("hash");
  const dataCheckString = [...fields.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )
    .map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = await hmac(encoder.encode("WebAppData"), botToken);
  const expectedHash = bytesToHex(await hmac(secret, dataCheckString));
  if (!constantTimeEquals(expectedHash, receivedHash)) {
    throw new Error("Telegram login could not be verified");
  }

  const authDate = Number(fields.get("auth_date"));
  if (
    !Number.isFinite(authDate) || nowSeconds - authDate < -60 ||
    nowSeconds - authDate > 86_400
  ) {
    throw new Error("Please close and reopen the app");
  }
  let user: TelegramUser;
  try {
    user = JSON.parse(fields.get("user") ?? "{}");
  } catch {
    throw new Error("Invalid Telegram user");
  }
  if (!Number.isSafeInteger(user.id) || user.id <= 0) {
    throw new Error("Invalid Telegram user");
  }
  return { user, authDate };
}
