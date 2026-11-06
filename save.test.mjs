import assert from "node:assert/strict";
import { test } from "node:test";
import { readSave, snapshot } from "./save.js";
import { createGame } from "./state.js";

test("readSave validates credits and system IDs without changing valid saves", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let raw;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => raw },
  });
  try {
    const valid = snapshot(createGame());
    for (const credits of [0, 680, 2 ** 31, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      raw = JSON.stringify({ ...valid, credits });
      assert.deepEqual(readSave(), JSON.parse(raw));
    }
    for (const credits of [-1, "680", null, 12.5, Number.MAX_SAFE_INTEGER + 1]) {
      raw = JSON.stringify({ ...valid, credits });
      assert.equal(readSave(), null);
    }
    // JSON numeric overflow parses as Infinity, despite valid JSON syntax.
    raw = JSON.stringify(valid).replace('"credits":680', '"credits":1e400');
    assert.equal(readSave(), null);
    for (const systemId of ["missing", "toString", "__proto__", 1, {}, null]) {
      raw = JSON.stringify({ ...valid, systemId });
      assert.equal(readSave(), null);
    }
    for (raw of [null, "{", "null", '{"version":2}']) {
      assert.equal(readSave(), null);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});


test("restore preserves large safe balances without 32-bit wrapping", async () => {
  // audio.js registers a browser listener at import time; no audio is needed here.
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { addEventListener() {} },
  });
  try {
    const { restore } = await import("./sim.js");
    for (const credits of [0, 680, 2 ** 31 - 1, 2 ** 31, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      const game = createGame();
      const data = JSON.parse(JSON.stringify({ ...snapshot(game), credits }));
      restore(game, data);
      assert.equal(game.credits, credits);
      assert.equal(snapshot(game).credits, credits);
    }
    for (const credits of [-1, 12.5, "680", null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const game = createGame();
      restore(game, { ...snapshot(game), credits });
      assert.equal(game.credits, 0, "direct restore must not introduce invalid balances");
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});
