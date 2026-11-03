// In-game editor. Loaded only from index.html when the URL has ?dev=1.
// The LLM key and GitHub token live in localStorage on this device, never in the repo.

const REPO = "secretlabcoat/weird-velocity";
const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-flash-latest";
const FALLBACK_MODEL = "gemini-flash-lite-latest";
const RETIRED_MODELS = new Set(["gemini-2.5-flash"]);
const BUSY_WAITS = [2000, 5000, 10000];
const MAX_FILES = 3;

const FILE_GUIDE = [
  ["index.html", "Page shell, phone meta tags, and which scripts load."],
  ["style.css", "Layout, safe areas, buttons, dock and chart screens."],
  ["main.js", "Animation loop, resize, and boot."],
  ["state.js", "The live voyage and the short on-screen log."],
  ["util.js", "Shared math and numbers like fuel cost and cargo space."],
  ["physics.js", "Thrust, turn, brake, and how the thumb stick steers."],
  ["data/galaxy.js", "Systems, planets, commodities, names, and descriptions."],
  ["trade.js", "Buy, sell, refuel, and repair prices."],
  ["missions.js", "Bounties, deliveries, and errands."],
  ["combat.js", "Shots, shields, armor, and pirate deaths."],
  ["fx.js", "Particles and floating text."],
  ["sim.js", "Flying, pirates, docking, and hyperspace jumps."],
  ["sprites.js", "Drawn ships, planets, stations, and nebulae."],
  ["render.js", "Stars, ships, compass, and the minimap."],
  ["input.js", "Thumb stick, Fire, Stop, and the keyboard."],
  ["ui.js", "Title, dock, trade, missions, and the chart."],
  ["save.js", "Saving the voyage in this browser."],
  ["audio.js", "Small sound effects."],
  ["devbot.js", "This panel. It only loads when the address has ?dev=1."],
  ["NOTES.md", "What the game is and how the files are split."],
  ["README.md", "How to play and how to run it."],
  ["manifest.webmanifest", "Add-to-home-screen name and colors."],
];

const LS = {
  base: "wv.dev.llmBase",
  key: "wv.dev.llmKey",
  model: "wv.dev.llmModel",
  gh: "wv.dev.githubToken",
};

const ALLOWED = new Set(FILE_GUIDE.map(([path]) => path));

function load(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}
function cleanSecret(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, "");
}

function normalizeBase(value) {
  let url = cleanSecret(value);
  if (!url) return DEFAULT_BASE;
  const scheme = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)\/\//);
  if (/^ttps:\/\//i.test(url) || /^htps:\/\//i.test(url)) {
    url = "https://" + url.slice(url.indexOf("://") + 3);
  } else if (url.startsWith("//")) url = "https:" + url;
  else if (!scheme) url = "https://" + url.replace(/^\/+/, "");
  url = url.replace(/\/+$/, "");
  while (/\/chat\/completions$/i.test(url)) {
    url = url.replace(/\/chat\/completions$/i, "").replace(/\/+$/, "");
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return DEFAULT_BASE;
    const host = parsed.hostname;
    const hostOk = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(".");
    if (!hostOk) return DEFAULT_BASE;
    let out = parsed.origin + parsed.pathname.replace(/\/+$/, "");
    while (/\/chat\/completions$/i.test(out)) {
      out = out.replace(/\/chat\/completions$/i, "").replace(/\/+$/, "");
    }
    return out || DEFAULT_BASE;
  } catch {
    return DEFAULT_BASE;
  }
}

function llmBase() {
  const saved = load(LS.base);
  const base = normalizeBase(saved);
  if (saved !== base) store(LS.base, base);
  return base;
}
function normalizeModel(value) {
  const model = cleanSecret(value) || DEFAULT_MODEL;
  return RETIRED_MODELS.has(model) ? DEFAULT_MODEL : model;
}
function llmModel() {
  const saved = load(LS.model);
  const model = normalizeModel(saved);
  if (saved !== model) store(LS.model, model);
  return model;
}
function sleep(ms) {
  if (typeof globalThis.__DEVBOT_PAUSE === "function") return globalThis.__DEVBOT_PAUSE(ms);
  return new Promise((resolve) => setTimeout(resolve, ms));
}
let reportStatus = () => {};

function chatUrl(base) {
  return normalizeBase(base) + "/chat/completions";
}

function stripFences(text) {
  const trimmed = String(text || "").trim();
  const wrapped = trimmed.match(/^```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n```$/);
  if (wrapped) return wrapped[1];
  const inner = trimmed.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
  if (inner) return inner[1];
  return trimmed;
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64ToUtf8(b64) {
  const bin = atob(String(b64).replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function contentsUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${REPO}/contents/${encoded}`;
}

function ghHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + cleanSecret(token),
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "weird-velocity-devbot",
  };
}

function looksValid(path, text) {
  if (!text || text.trim().length < 20) return false;
  if (path.endsWith(".js")) return /\b(export|import|function|const|let)\b/.test(text);
  if (path.endsWith(".html")) return text.includes("<");
  if (path.endsWith(".css")) return text.includes("{");
  if (path.endsWith(".json") || path.endsWith(".webmanifest")) {
    JSON.parse(text);
    return true;
  }
  return true;
}

function catalogText() {
  return FILE_GUIDE.map(([path, line]) => `${path} — ${line}`).join("\n");
}

function parsePick(text) {
  const cleaned = stripFences(text);
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw Object.assign(new Error("No JSON in the file pick."), { where: "pick" });
    }
    try { data = JSON.parse(match[0]); }
    catch {
      throw Object.assign(new Error("File pick was not valid JSON."), { where: "pick" });
    }
  }
  const list = Array.isArray(data) ? data : data.files;
  const files = [];
  for (const item of list || []) {
    const path = (typeof item === "string" ? item : item && item.path || "")
      .trim()
      .replace(/^\.\//, "");
    if (ALLOWED.has(path) && !files.includes(path)) files.push(path);
    if (files.length === MAX_FILES) break;
  }
  if (!files.length) {
    throw Object.assign(new Error("The pick listed no known files."), { where: "pick" });
  }
  return files;
}

const HINTS = [
  {
    test: /laser|bolt|colour|color|visual|glow|draw/i,
    files: ["render.js", "fx.js", "combat.js", "style.css"],
    words: ["laser", "bolt", "strokeStyle"],
  },
  { test: /price|cargo|trade|buy|sell|fuel/i, files: ["trade.js", "data/galaxy.js"], words: ["price", "cargo"] },
  { test: /mission|bounty|errand|quest/i, files: ["missions.js", "ui.js"], words: ["mission", "bounty"] },
  { test: /pirate|damage|shield|armor|weapon/i, files: ["combat.js", "sim.js"], words: ["shield", "armor"] },
  { test: /thrust|turn|brake|stick|physic/i, files: ["physics.js", "input.js"], words: ["thrust", "brake"] },
  { test: /button|layout|font|safe area/i, files: ["style.css", "ui.js"], words: ["button"] },
  { test: /planet|system|commodit|galaxy/i, files: ["data/galaxy.js"], words: ["planet"] },
];

const STOP_WORDS = new Set(["the", "and", "for", "make", "with", "that", "this", "from", "into", "please", "them", "your"]);

export function suggestFiles(request) {
  const files = [];
  for (const hint of HINTS) {
    if (!hint.test.test(request)) continue;
    for (const path of hint.files) {
      if (!files.includes(path)) files.push(path);
      if (files.length === MAX_FILES) return files;
    }
  }
  return files;
}

export function searchWords(request) {
  const words = new Set();
  const raw = String(request || "").toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || [];
  for (const word of raw) {
    if (STOP_WORDS.has(word)) continue;
    words.add(word);
    if (word.endsWith("s") && word.length > 4) words.add(word.slice(0, -1));
  }
  for (const hint of HINTS) {
    if (hint.test.test(request)) hint.words.forEach((word) => words.add(word.toLowerCase()));
  }
  return [...words];
}

export function snippetFor(text, words, pad = 40) {
  const lines = String(text || "").split("\n");
  const lowered = words.map((word) => word.toLowerCase()).filter(Boolean);
  if (!lowered.length) return "";
  const hits = [];
  lines.forEach((line, index) => {
    const low = line.toLowerCase();
    const hit = lowered.some((word) => {
      if (word.length < 5) {
        return new RegExp("(?:^|[^a-z0-9])" + escapeRegExp(word) + "(?:[^a-z0-9]|$)").test(low);
      }
      return low.includes(word);
    });
    if (hit) hits.push(index);
  });
  if (!hits.length) return "";
  const ranges = [];
  for (const hit of hits) {
    const start = Math.max(0, hit - pad);
    const end = Math.min(lines.length - 1, hit + pad);
    const last = ranges[ranges.length - 1];
    if (last && start <= last.end + 1) last.end = Math.max(last.end, end);
    else ranges.push({ start, end });
  }
  const chunks = [];
  let used = 0;
  for (const range of ranges) {
    if (used >= 120) break;
    const end = Math.min(range.end, range.start + (120 - used) - 1);
    chunks.push(lines.slice(range.start, end + 1).join("\n"));
    used += end - range.start + 1;
  }
  return chunks.join("\n...\n");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyOne(source, find, replace) {
  if (!find) return null;
  const at = source.indexOf(find);
  if (at !== -1) return source.slice(0, at) + replace + source.slice(at + find.length);
  const parts = find.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const match = new RegExp(parts.map(escapeRegExp).join("\\s+")).exec(source);
  if (!match) return null;
  return source.slice(0, match.index) + replace + source.slice(match.index + match[0].length);
}

function wrappedFiles(text) {
  const found = [];
  const re = /<<<FILE ([^>\n]+)>>>[\r\n]*([\s\S]*?)<<<END>>>/g;
  let match;
  while ((match = re.exec(text))) {
    const path = match[1].trim().replace(/^\.\//, "");
    if (!ALLOWED.has(path)) continue;
    found.push({ path, content: match[2].replace(/\s+$/, "\n") });
  }
  return found;
}

function unusable(text) {
  const err = new Error("No usable edits in the reply.");
  err.where = "edit";
  err.reply = String(text || "").slice(0, 200);
  return err;
}

export function parseEditReply(text) {
  const raw = String(text || "");
  const cleaned = stripFences(raw);
  let data = null;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { data = JSON.parse(match[0]); } catch { data = null; }
    }
  }
  if (data && Array.isArray(data.edits)) {
    const edits = [];
    for (const item of data.edits) {
      if (!item || typeof item.find !== "string" || typeof item.replace !== "string") continue;
      const path = String(item.path || "").trim().replace(/^\.\//, "");
      if (!ALLOWED.has(path)) continue;
      edits.push({ path, find: item.find, replace: item.replace });
    }
    if (edits.length) return { kind: "edits", edits, summary: String(data.summary || "") };
  }
  const files = wrappedFiles(cleaned);
  if (files.length) return { kind: "files", files, summary: "" };
  throw unusable(raw);
}

export function applyEditPlan(originals, replyText) {
  const parsed = parseEditReply(replyText);
  const byPath = new Map(originals.map((file) => [file.path, file.text]));
  const changed = new Map();
  const skipped = [];
  if (parsed.kind === "files") {
    for (const file of parsed.files) {
      const prior = byPath.get(file.path);
      if (prior == null) {
        skipped.push(file.path + ": that file was not loaded.");
        continue;
      }
      let valid = false;
      try { valid = looksValid(file.path, file.content); } catch { valid = false; }
      if (!valid) {
        skipped.push(file.path + ": the replacement did not look like a whole file, so it was skipped.");
        continue;
      }
      if (file.content.trim() !== prior.trim()) changed.set(file.path, file.content.endsWith("\n") ? file.content : file.content + "\n");
    }
    return { changed, skipped, summary: parsed.summary };
  }
  for (const edit of parsed.edits) {
    const source = changed.get(edit.path) ?? byPath.get(edit.path);
    if (source == null) {
      skipped.push(edit.path + ": that file was not loaded, so that edit was skipped.");
      continue;
    }
    const next = applyOne(source, edit.find, edit.replace);
    if (next == null) {
      skipped.push(edit.path + ": couldn't find that text, so that edit was skipped.");
      continue;
    }
    changed.set(edit.path, next);
  }
  return { changed, skipped, summary: parsed.summary };
}

function detailLine(err) {
  const parts = [];
  const name = err && err.name ? err.name : "";
  const message = err && err.message ? err.message : "";
  if (name || message) parts.push([name, message].filter(Boolean).join(": "));
  if (err && err.status) parts.push("HTTP " + err.status);
  if (err && err.url) parts.push(err.url);
  if (err && err.body && !parts.join(" ").includes(String(err.body).slice(0, 80))) parts.push(err.body);
  if (err && err.reply && !parts.join(" ").includes(String(err.reply).slice(0, 40))) parts.push(err.reply);
  const line = parts.join(" — ").trim();
  return (line || String(err || "Unknown error")).slice(0, 700);
}

function explain(err) {
  const raw = detailLine(err);
  const status = err && err.status;
  const where = err && err.where;
  const low = raw.toLowerCase();
  const gemini = /generativelanguage|googleapis/.test(llmBase());
  let plain = "Something went wrong. Try again.";
  const modelMissing = status === 404 || /no longer available|model.*(not found|unsupported|does not exist)|unknown model|invalid model|not supported/.test(low);
  if (where === "pick") {
    plain = "The AI couldn't tell which file to change. Try saying it more simply.";
  } else if (where === "cutoff") {
    plain = "The AI's answer got cut off, try a smaller request";
  } else if (where === "pages") {
    plain = err && err.message ? err.message : "Publishing failed. Try again.";
  } else if (where === "edit") {
    plain = "The AI didn't return a usable file. Nothing was saved.";
  } else if (where === "github" || where === "save") {
    if (status === 401 || status === 403 || /bad credentials|resource not accessible|must have push access/.test(low)) {
      plain = "GitHub token can't write to this repo.";
    } else if (status === 409) {
      plain = "Someone else saved first. Try again.";
    } else if (!status && /failed to fetch|networkerror|load failed|network request failed/.test(low)) {
      plain = "Couldn't reach GitHub.";
    } else {
      plain = "GitHub didn't save the change.";
    }
  } else if (status === 401 || status === 403 || /api key|unauthor|permission denied|invalid.*(key|credential)/.test(low)) {
    plain = gemini ? "Your Gemini key was rejected." : "Your AI key was rejected.";
  } else if (modelMissing) {
    plain = "That model name looks wrong. Try gemini-flash-latest.";
  } else if (status === 429 || status === 500 || status === 503 || /overload|unavailable|high demand|rate limit|resource exhausted/.test(low)) {
    plain = "AI service is busy, try again in a minute.";
  } else if (!status && /failed to fetch|networkerror|load failed|network request failed/.test(low)) {
    plain = "Couldn't reach the AI service. Check the address and your connection.";
  } else if (where === "llm" || !where) {
    plain = "The AI service didn't answer.";
  }
  return { plain, raw };
}

function choiceText(choice) {
  const content = choice?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text || part.content || "").join("\n");
  return "";
}

async function chatOnce(messages, maxTokens, model, json) {
  const url = chatUrl(llmBase());
  const key = cleanSecret(load(LS.key));
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        stream: false,
        max_tokens: maxTokens || 4096,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    });
  } catch (err) {
    const wrapped = new Error(err && err.message ? err.message : "Failed to fetch");
    wrapped.name = err && err.name ? err.name : "TypeError";
    wrapped.where = "llm";
    wrapped.url = url;
    throw wrapped;
  }
  const raw = await response.text();
  if (!response.ok) {
    const failed = new Error("LLM " + response.status + " " + raw.slice(0, 300));
    failed.where = "llm";
    failed.status = response.status;
    failed.body = raw.slice(0, 500);
    failed.url = url;
    throw failed;
  }
  let data;
  try { data = JSON.parse(raw); }
  catch {
    const failed = new Error("AI returned non-JSON. " + raw.slice(0, 200));
    failed.where = "llm";
    failed.body = raw.slice(0, 300);
    failed.url = url;
    throw failed;
  }
  const choice = data.choices?.[0] || {};
  const text = choiceText(choice);
  const finishReason = String(choice.finish_reason || "");
  if (finishReason === "length" || finishReason === "MAX_TOKENS") {
    const failed = new Error("The AI's answer got cut off, try a smaller request");
    failed.where = "cutoff";
    failed.reply = text.slice(0, 200);
    failed.url = url;
    throw failed;
  }
  if (!text) {
    const failed = new Error("The model returned no text.");
    failed.where = "llm";
    failed.url = url;
    throw failed;
  }
  return { text, finishReason };
}

function busy(err) {
  return !!(err && (err.status === 503 || err.status === 429));
}

export async function fetchChat(messages, maxTokens, json) {
  const primary = llmModel();
  let lastErr;
  for (let attempt = 0; attempt <= BUSY_WAITS.length; attempt++) {
    try {
      return await chatOnce(messages, maxTokens, primary, json);
    } catch (err) {
      lastErr = err;
      if (!busy(err) || attempt === BUSY_WAITS.length) break;
      reportStatus("AI is busy, retrying…", detailLine(err));
      await sleep(BUSY_WAITS[attempt]);
    }
  }
  if (busy(lastErr) && primary !== FALLBACK_MODEL) {
    reportStatus("AI is busy, retrying…", detailLine(lastErr));
    try {
      return await chatOnce(messages, maxTokens, FALLBACK_MODEL, json);
    } catch (err) {
      throw err;
    }
  }
  throw lastErr;
}

async function ghJson(url, token, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...ghHeaders(token), ...(options.headers || {}) },
    });
  } catch (err) {
    throw Object.assign(new Error(err.message || "Failed to fetch"), { where: "github" });
  }
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw.slice(0, 300) }; }
  if (!response.ok) {
    throw Object.assign(new Error(data.message || "GitHub " + response.status), {
      where: options.method === "PUT" ? "save" : "github",
      status: response.status,
      body: (data.message || raw).slice(0, 500),
    });
  }
  return data;
}

function install() {
  document.body.classList.add("dev");
  const style = document.createElement("style");
  style.textContent = `
    #devbot, #devbot * { box-sizing: border-box; }
    #devbot, #devbot input, #devbot textarea {
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
      touch-action: manipulation;
    }
    #devbot {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
      display: flex; flex-direction: column;
      max-height: min(68vh, 560px);
      background: rgba(8, 10, 16, 0.96);
      border-top: 1px solid rgba(255,244,220,0.2);
      font: 16px/1.35 ui-sans-serif, system-ui, sans-serif;
      color: #efe9dc;
    }
    #devbot.pinned-top {
      top: calc(env(safe-area-inset-top) + 8px);
      bottom: auto;
      left: calc(env(safe-area-inset-left) + 8px);
      right: calc(env(safe-area-inset-right) + 8px);
      max-height: 60vh;
      overflow: auto;
      border-radius: 16px;
      border: 1px solid rgba(255,244,220,0.22);
      box-shadow: 0 16px 40px rgba(0,0,0,0.45);
    }
    #devbot.pinned-top #dev-status { padding-bottom: 8px; }
    #dev-main { overflow: visible; padding: 8px 8px 4px; display: flex; flex-direction: column; gap: 6px; }
    #devbot textarea, #devbot input {
      font: 16px/1.35 ui-sans-serif, system-ui, sans-serif;
      color: #efe9dc; background: #12151f;
      border: 1px solid rgba(255,244,220,0.22); border-radius: 10px;
      padding: 8px; width: 100%;
      -webkit-user-select: text;
      user-select: text;
      -webkit-touch-callout: default;
    }
    #dev-text { min-height: 52px; max-height: 120px; resize: vertical; }
    #devbot label { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: #b7b0a2; }
    #devbot .row { display: flex; gap: 6px; }
    #devbot button {
      min-width: 44px; min-height: 44px; border-radius: 10px; padding: 0 10px;
      border: 1px solid rgba(255,244,220,0.25); background: #1b2030;
      color: #efe9dc; font: 16px/1.1 ui-sans-serif, system-ui, sans-serif;
    }
    #devbot button.grow { flex: 1; }
    #devbot button:disabled { opacity: 0.45; }
    #devbot button.on { background: #ffb15a; color: #1a1208; }
    #dev-status {
      flex-shrink: 0;
      margin: 0;
      padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
      border-top: 1px solid rgba(255,244,220,0.12);
      background: #10131c;
    }
    #dev-status-main { font-size: 16px; line-height: 1.35; color: #efe9dc; }
    #dev-status-main.ok { color: #b6f2a2; }
    #dev-status-main.bad { color: #ffb4a8; }
    #dev-status-main a { color: #ffb15a; }
    #dev-status-detail { margin: 4px 0 0; font-size: 13px; line-height: 1.35; color: #b7b0a2; word-break: break-word; }
    #dev-keytest { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    #dev-keytest li { font-size: 15px; line-height: 1.35; }
    #dev-keytest .ok { color: #b6f2a2; }
    #dev-keytest .bad { color: #ffb4a8; }
    #dev-keytest .err-detail {
      margin: 2px 0 8px;
      color: #efe9dc;
      font-size: 13px;
      line-height: 1.35;
      word-break: break-word;
    }
    #dev-advanced { align-self: flex-start; min-height: 36px; background: transparent; }
    body.dev #controls { bottom: var(--devbot-h, 210px); }
    body.dev #overlay { bottom: var(--devbot-h, 210px); overflow: hidden; }
    body.dev #overlay .sheet { max-height: 100%; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "devbot";
  root.innerHTML = `
    <div id="dev-main">
      <div id="dev-compose">
        <textarea id="dev-text" placeholder="Tell the bot what to change…" autocomplete="off" autocapitalize="sentences"></textarea>
        <div class="row">
          <button type="button" id="dev-mic" aria-label="Microphone">Mic</button>
          <button type="button" id="dev-go" class="grow">Go</button>
          <button type="button" id="dev-gear" aria-label="Settings">⚙</button>
        </div>
      </div>
      <form id="dev-settings" hidden>
        <label>AI key
          <input id="dev-key" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
        </label>
        <label>Model
          <input id="dev-model" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
        </label>
        <label>GitHub token
          <input id="dev-gh" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="Fine-grained token, contents read and write">
        </label>
        <button type="button" id="dev-advanced">Advanced</button>
        <div id="dev-base-wrap" hidden>
          <label>AI address
            <input id="dev-base" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
          </label>
        </div>
        <div class="row">
          <button type="submit" id="dev-save" class="grow">Save</button>
          <button type="button" id="dev-test" class="grow">Test my keys</button>
        </div>
        <ul id="dev-keytest"></ul>
        <button type="button" id="dev-back">Back</button>
      </form>
    </div>
    <div id="dev-status" role="status" aria-live="polite">
      <div id="dev-status-main">Keys stay on this phone only.</div>
      <p id="dev-status-detail" hidden></p>
    </div>
  `;
  document.body.appendChild(root);

  const statusMain = root.querySelector("#dev-status-main");
  const statusDetail = root.querySelector("#dev-status-detail");
  const compose = root.querySelector("#dev-compose");
  const settings = root.querySelector("#dev-settings");
  const go = root.querySelector("#dev-go");
  const testBtn = root.querySelector("#dev-test");
  const keyInput = root.querySelector("#dev-key");
  const baseInput = root.querySelector("#dev-base");
  const modelInput = root.querySelector("#dev-model");
  reportStatus = (text, detail) => setStatus(text, detail || "");

  function setStatus(main, detail, kind) {
    statusMain.className = kind || "";
    statusMain.textContent = main;
    statusDetail.hidden = !detail;
    statusDetail.textContent = detail || "";
  }

  function showDone(files, url) {
    statusMain.className = "ok";
    statusMain.textContent = "Done! Saved. The live game updates in about a minute — reload then. ";
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "See the save";
      statusMain.appendChild(link);
    }
    statusDetail.hidden = false;
    statusDetail.textContent = files.join(", ");
  }

  function showError(err) {
    const { plain } = explain(err);
    setStatus(plain, detailLine(err), "bad");
  }

  const ghInput = root.querySelector("#dev-gh");

  function fillSettings() {
    baseInput.value = llmBase();
    keyInput.value = cleanSecret(load(LS.key));
    modelInput.value = llmModel();
    ghInput.value = cleanSecret(load(LS.gh));
  }

  function placePinned() {
    if (!root.classList.contains("pinned-top")) {
      root.style.top = "";
      root.style.maxHeight = "";
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const margin = 8;
    root.style.top = (vv.offsetTop + margin) + "px";
    const available = Math.max(140, vv.height - margin * 2);
    root.style.maxHeight = Math.min(window.innerHeight * 0.6, available) + "px";
  }

  function pinDevbot(pin) {
    root.classList.toggle("pinned-top", pin);
    placePinned();
    const pinned = root.classList.contains("pinned-top");
    document.documentElement.style.setProperty("--devbot-h", pinned ? "0px" : root.offsetHeight + "px");
  }

  function openSettings(open) {
    settings.hidden = !open;
    compose.hidden = open;
    root.querySelector("#dev-gear").classList.toggle("on", open);
    if (open) fillSettings();
    const typing = root.contains(document.activeElement) && document.activeElement.matches("input, textarea");
    pinDevbot(open || typing);
  }

  root.addEventListener("focusin", (event) => {
    const field = event.target;
    if (!field.matches || !field.matches("input, textarea")) return;
    pinDevbot(true);
    setTimeout(() => field.scrollIntoView({ block: "center", inline: "nearest" }), 60);
  });
  root.addEventListener("focusout", () => {
    setTimeout(() => {
      const active = document.activeElement;
      const stillTyping = root.contains(active) && active.matches && active.matches("input, textarea");
      if (!stillTyping && settings.hidden) pinDevbot(false);
    }, 80);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", placePinned);
    window.visualViewport.addEventListener("scroll", placePinned);
  }

  let recognition = null;
  root.querySelector("#dev-mic").addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("This browser has no speech recognition. On iPhone, tap the text box and use the microphone on the keyboard.");
      return;
    }
    if (recognition) {
      recognition.stop();
      return;
    }
    const mic = root.querySelector("#dev-mic");
    recognition = new SR();
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const said = event.results[0][0].transcript;
      const box = root.querySelector("#dev-text");
      box.value = (box.value ? box.value + " " : "") + said;
    };
    recognition.onerror = () => { recognition = null; mic.classList.remove("on"); };
    recognition.onend = () => { recognition = null; mic.classList.remove("on"); };
    mic.classList.add("on");
    recognition.start();
  });

  root.querySelector("#dev-gear").addEventListener("click", () => openSettings(settings.hidden));
  root.querySelector("#dev-back").addEventListener("click", () => openSettings(false));
  root.querySelector("#dev-advanced").addEventListener("click", () => {
    const wrap = root.querySelector("#dev-base-wrap");
    const open = wrap.hidden;
    wrap.hidden = !open;
    root.querySelector("#dev-advanced").textContent = open ? "Hide address" : "Advanced";
  });

  settings.addEventListener("submit", (event) => {
    event.preventDefault();
    store(LS.base, normalizeBase(baseInput.value));
    store(LS.key, cleanSecret(keyInput.value));
    store(LS.model, normalizeModel(modelInput.value));
    store(LS.gh, cleanSecret(ghInput.value));
    fillSettings();
    setStatus("Saved on this phone. Checking the keys…");
    testKeys();
  });
  testBtn.addEventListener("click", () => testKeys());
  go.addEventListener("click", () => runEdit());

  const watcher = new ResizeObserver(() => {
    const pinned = root.classList.contains("pinned-top");
    document.documentElement.style.setProperty("--devbot-h", pinned ? "0px" : root.offsetHeight + "px");
  });
  watcher.observe(root);

  async function testKeys() {
    testBtn.disabled = true;
    go.disabled = true;
    const list = root.querySelector("#dev-keytest");
    list.innerHTML = "";
    const add = (ok, text, detail) => {
      const li = document.createElement("li");
      li.className = ok ? "ok" : "bad";
      const line = document.createElement("div");
      line.textContent = (ok ? "✓ " : "✗ ") + text;
      li.appendChild(line);
      if (!ok && detail) {
        const small = document.createElement("div");
        small.className = "err-detail";
        small.textContent = detail;
        li.appendChild(small);
      }
      list.appendChild(li);
    };
    try {
      const key = cleanSecret(settings.hidden ? load(LS.key) : keyInput.value);
      const token = cleanSecret(settings.hidden ? load(LS.gh) : ghInput.value);
      const base = normalizeBase(settings.hidden ? load(LS.base) : baseInput.value);
      const model = normalizeModel(settings.hidden ? llmModel() : modelInput.value);
      let aiDetail = "";
      if (!settings.hidden) {
        store(LS.base, base);
        store(LS.key, key);
        store(LS.model, model);
        modelInput.value = llmModel();
        store(LS.gh, token);
      }
      if (!key) add(false, "AI key is empty.");
      else {
        try {
          const reply = await fetchChat([
            { role: "user", content: "Reply with the single word ok" },
          ], 64);
          if (/\bok\b/i.test(reply.text)) add(true, "AI key works. It replied ok.");
          else add(false, "AI key reached the service, but the reply was not ok. The model name might be wrong.");
        } catch (err) {
          const { plain } = explain(err);
          aiDetail = detailLine(err);
          add(false, "AI: " + plain, aiDetail);
        }
      }
      let ghDetail = "";
      if (!token) add(false, "GitHub token is empty.");
      else {
        try {
          const repo = await ghJson(`https://api.github.com/repos/${REPO}`, token);
          if (repo.permissions && repo.permissions.push === true) {
            add(true, "GitHub token can write to this repo.");
          } else {
            const read = await fetch(contentsUrl("NOTES.md") + "?ref=main", { headers: ghHeaders(token) });
            if (read.ok) add(false, "GitHub token can read this repo but not write. It needs Contents: Read and write.");
            else add(false, "GitHub token can't read this repo.");
          }
        } catch (err) {
          const { plain } = explain(err);
          ghDetail = detailLine(err);
          add(false, "GitHub: " + plain, ghDetail);
        }
      }
      const bits = [...list.querySelectorAll("li")].map((li) => li.textContent);
      const bad = list.querySelector(".bad");
      setStatus(
        bad ? "Key check finished with a problem." : "Key check passed.",
        [bits.join(" "), aiDetail, ghDetail].filter(Boolean).join("\n"),
        bad ? "bad" : "ok",
      );
    } finally {
      testBtn.disabled = false;
      go.disabled = false;
    }
  }

  async function runEdit() {
    const instruction = root.querySelector("#dev-text").value.trim();
    if (!instruction) {
      setStatus("Write what you want changed first.", "", "bad");
      return;
    }
    go.disabled = true;
    setStatus("Received ✓ — working on it…");
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!load(LS.key).trim() || !load(LS.gh).trim()) {
        setStatus("Add your AI key and GitHub token with the gear first.", "", "bad");
        return;
      }
      const token = cleanSecret(load(LS.gh));
      setStatus("Picking which file to change…");
      let paths = suggestFiles(instruction);
      if (!paths.length) {
        const picked = await fetchChat([
          {
            role: "system",
            content: "You choose source files for a tiny plain-ES-module game with no build step. Reply with JSON only: {\"files\":[\"path\"]}. Pick 1 to 3 paths from the list. Do not invent paths. Hints: lasers, colors, and visuals -> render.js, fx.js, combat.js, style.css. Prices -> trade.js. Missions -> missions.js.",
          },
          {
            role: "user",
            content: `Files:\n${catalogText()}\n\nRequest: ${instruction}`,
          },
        ], 512, true);
        paths = parsePick(picked.text);
      }

      setStatus("Asking AI for the change…");
      const originals = [];
      for (const path of paths) {
        const got = await ghJson(contentsUrl(path) + "?ref=main", token);
        originals.push({ path, sha: got.sha, text: b64ToUtf8(got.content || "") });
      }
      const words = searchWords(instruction);
      const bundle = originals.map((file) => {
        const snippet = snippetFor(file.text, words);
        return `FILE ${file.path}\n${snippet || "(no matching lines)"}`;
      }).join("\n\n");
      const reply = await fetchChat([
        {
          role: "system",
          content: "Return ONLY JSON: {\"edits\":[{\"path\":\"file.js\",\"find\":\"exact existing text\",\"replace\":\"new text\"}],\"summary\":\"...\"}. Copy find exactly from the snippets, with no line numbers. Change as little as possible. Do not rewrite the whole file.",
        },
        {
          role: "user",
          content: `Request: ${instruction}\n\n${bundle}`,
        },
      ], 4096, true);
      let plan;
      try {
        plan = applyEditPlan(originals, reply.text);
      } catch (err) {
        if (!err.reply) err.reply = String(reply.text || "").slice(0, 200);
        throw err;
      }
      const ready = [];
      for (const [path, text] of plan.changed) {
        const prior = originals.find((file) => file.path === path);
        if (!prior || text.trim() === prior.text.trim()) continue;
        ready.push({
          path,
          sha: prior.sha,
          body: text.endsWith("\n") ? text : text + "\n",
        });
      }
      if (!ready.length) {
        const note = plan.skipped.join(" ") || "The AI didn't change anything. Nothing was saved.";
        setStatus(note, String(reply.text || "").slice(0, 200), "bad");
        return;
      }

      setStatus("Saving to GitHub…");
      const saved = [];
      let lastSha = "";
      for (const edit of ready) {
        const put = await ghJson(contentsUrl(edit.path), token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: ("devbot: " + instruction.replace(/\s+/g, " ")).slice(0, 72),
            content: utf8ToB64(edit.body),
            sha: edit.sha,
            branch: "main",
          }),
        });
        saved.push(edit.path);
        if (put.commit?.sha) lastSha = put.commit.sha;
      }
      if (!lastSha) {
        setStatus("Saved, but the commit id was missing. Reload in a minute.", "", "bad");
        return;
      }
      if (!saved.length) {
        setStatus("The AI didn't change anything. Nothing was saved.");
        return;
      }
      const published = await publishPages(token, lastSha);
      if (published === "errored") return;
      showLive(plan, saved);
    } catch (err) {
      showError(err);
    } finally {
      go.disabled = false;
    }
  }

  async function publishPages(token, sha) {
    setStatus("Saved ✓ — publishing…", sha.slice(0, 7));
    const deadline = Date.now() + 4 * 60 * 1000;
    while (Date.now() < deadline) {
      let build;
      try {
        build = await ghJson(`https://api.github.com/repos/${REPO}/pages/builds/latest`, token);
      } catch (err) {
        err.where = "pages";
        err.message = "Saved, but publishing could not be checked. Try again in a minute.";
        throw err;
      }
      const commit = String(build.commit || "");
      const matches = commit && (commit.startsWith(sha) || sha.startsWith(commit));
      if (matches && build.status === "built") return "built";
      if (matches && build.status === "errored") {
        const why = build.error && build.error.message ? build.error.message : "GitHub Pages reported an error.";
        setStatus("Publishing failed. Try again.", why, "bad");
        return "errored";
      }
      await sleep(4000);
    }
    const err = new Error("Publishing is taking too long. Try again in a minute.");
    err.where = "pages";
    throw err;
  }

  function showLive(plan, saved) {
    statusMain.className = "ok";
    statusMain.textContent = "Live now! ";
    const button = document.createElement("button");
    button.type = "button";
    button.id = "dev-reload";
    button.textContent = "Tap to see it";
    button.addEventListener("click", () => location.reload());
    statusMain.appendChild(button);
    statusDetail.hidden = false;
    statusDetail.textContent = [plan.summary, plan.skipped.join(" "), saved.join(", ")].filter(Boolean).join("\n");
  }

  llmModel();
  llmBase();
}

if (typeof document !== "undefined") install();
