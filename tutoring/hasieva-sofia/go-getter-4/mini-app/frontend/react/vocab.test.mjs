import { test } from "node:test";
import assert from "node:assert/strict";
import { secureId } from "./vocab-controller.mjs";
test("Vocab answer IDs stay secure when randomUUID is absent", () => {
  const id = secureId({ getRandomValues: (bytes) => crypto.getRandomValues(bytes) });
  assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.throws(() => secureId({}), /Secure answer IDs/);
  assert.notEqual(id, secureId());
});
