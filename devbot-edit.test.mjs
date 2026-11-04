import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  suggestFiles,
  searchWords,
  snippetFor,
  parseEditReply,
  applyEditPlan,
  fetchChat,
  dataOnlyBehaviorWarning,
} from "./devbot.js";

const request = "make the lasers red";
const render = readFileSync(new URL("./render.js", import.meta.url), "utf8");
const laserLine = 'bolt.color || (friendly ? "#ff69b4" : "#ff5555")';

const files = suggestFiles(request);
assert.equal(files[0], "render.js", "laser requests should start at the file that draws them");
assert.ok(files.includes("fx.js") && files.includes("combat.js"));

const snippet = snippetFor(render, searchWords(request));
assert.ok(snippet.includes(laserLine), "snippet should include the real laser color line");
assert.ok(snippet.length < render.length / 2, "snippet should be smaller than the whole file");

const mock = JSON.stringify({
  edits: [{
    path: "render.js",
    find: laserLine,
    replace: 'bolt.color || (friendly ? "#ff3040" : "#ff5555")',
  }],
  summary: "Player lasers are red.",
});
const plan = applyEditPlan([{ path: "render.js", text: render }], "```json\n" + mock + "\n```");
const next = plan.changed.get("render.js");
assert.ok(next.includes('friendly ? "#ff3040"'));
assert.equal(next.includes(laserLine), false);
assert.equal(plan.summary, "Player lasers are red.");

const loose = applyEditPlan([{ path: "render.js", text: render }], JSON.stringify({
  edits: [{
    path: "render.js",
    find: 'bolt.color   ||   (friendly ? "#ff69b4" : "#ff5555")',
    replace: 'bolt.color || (friendly ? "#ff3040" : "#ff5555")',
  }],
}));
assert.ok(loose.changed.get("render.js").includes('friendly ? "#ff3040"'));

const missed = applyEditPlan([{ path: "render.js", text: render }], JSON.stringify({
  edits: [{ path: "render.js", find: "this line is not in the file", replace: "nope" }],
}));
assert.equal(missed.changed.size, 0);
assert.match(missed.skipped[0], /render\.js/);

let thrown = null;
try { parseEditReply("sorry, I rewrote it in prose and not json"); }
catch (err) { thrown = err; }
assert.ok(thrown);
assert.equal(thrown.where, "edit");
assert.ok(thrown.reply.startsWith("sorry"));
assert.ok(thrown.reply.length <= 200);

const wrapped = applyEditPlan(
  [{ path: "fx.js", text: "export function burst() {\n  return 1;\n}\n" }],
  "<<<FILE fx.js>>>\nexport function burst() {\n  return 2;\n}\n<<<END>>>",
);
assert.match(wrapped.changed.get("fx.js"), /return 2/);

globalThis.__DEVBOT_PAUSE = async () => {};
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, opts) => {
  const body = JSON.parse(opts.body);
  const user = body.messages?.[0]?.content;
  calls.push(body.model);
  if (user === "cut") {
    return new Response(JSON.stringify({
      choices: [{ message: { content: "The AI's answer got cut" }, finish_reason: "length" }],
    }), { status: 200 });
  }
  if (body.model === "gemini-flash-latest") {
    return new Response("high demand", { status: 503, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({
    choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
  }), { status: 200 });
};
try {
  const reply = await fetchChat([{ role: "user", content: "hi" }], 64);
  assert.equal(reply.text, "ok");
  assert.deepEqual(calls.slice(0, 4), [
    "gemini-flash-latest",
    "gemini-flash-latest",
    "gemini-flash-latest",
    "gemini-flash-latest",
  ]);
  assert.equal(calls[4], "gemini-flash-lite-latest");
  await assert.rejects(
    () => fetchChat([{ role: "user", content: "cut" }], 20),
    (err) => err.where === "cutoff" && /cut off/.test(err.message),
  );
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__DEVBOT_PAUSE;
}

const warn = "Saved, but this may only be a text/data change; the feature may need a bigger update.";
assert.equal(
  dataOnlyBehaviorWarning("Have there only be one ship that attacks you", ["data/galaxy.js"]),
  warn,
);
assert.equal(
  dataOnlyBehaviorWarning("different types of space debris you can shoot", ["data/text.js"]),
  warn,
);
assert.equal(dataOnlyBehaviorWarning("rename the station", ["data/text.js"]), "");
assert.equal(dataOnlyBehaviorWarning("make the lasers red", ["render.js"]), "");

console.log("devbot edit test ok");
