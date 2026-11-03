// In-game editor. Loaded only from index.html when the URL has ?dev=1.
// The LLM key and GitHub token live in localStorage on this device, never in the repo.

const REPO = "secretlabcoat/weird-velocity";
const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.5-flash";
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
function llmBase() {
  return (load(LS.base) || DEFAULT_BASE).trim();
}
function llmModel() {
  return (load(LS.model) || DEFAULT_MODEL).trim();
}

function chatUrl(base) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return trimmed + "/chat/completions";
}

function stripFences(text) {
  const trimmed = String(text || "").trim();
  const wrapped = trimmed.match(/^```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n```$/);
  if (wrapped) return wrapped[1];
  const inner = trimmed.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)```/);
  if (inner) return inner[1];
  return trimmed;
}

function messageText(data) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text || part.content || "").join("\n");
  }
  throw Object.assign(new Error("The model returned no text."), { where: "llm" });
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
    Authorization: "Bearer " + token,
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

function parseEdits(text, expected) {
  const cleaned = stripFences(text);
  const found = new Map();
  const re = /<<<FILE ([^>\n]+)>>>[\r\n]*([\s\S]*?)<<<END>>>/g;
  let match;
  while ((match = re.exec(cleaned))) {
    const path = match[1].trim().replace(/^\.\//, "");
    if (expected.includes(path)) found.set(path, match[2].replace(/\s+$/, "\n"));
  }
  if (!found.size) {
    try {
      const data = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
      const list = data.files || [];
      for (const item of list) {
        if (item && expected.includes(item.path) && typeof item.content === "string") {
          found.set(item.path, item.content.replace(/\s+$/, "\n"));
        }
      }
    } catch { /* the wrapper is the format we asked for */ }
  }
  return expected.filter((path) => found.has(path)).map((path) => ({ path, content: found.get(path) }));
}

function explain(err) {
  const raw = (err && (err.body || err.message)) ? String(err.body || err.message) : String(err);
  const status = err && err.status;
  const where = err && err.where;
  const low = raw.toLowerCase();
  const gemini = /generativelanguage|googleapis/.test(llmBase());
  let plain = "Something went wrong. Try again.";
  if (where === "pick") {
    plain = "The AI couldn't tell which file to change. Try saying it more simply.";
  } else if (where === "edit") {
    plain = "The AI didn't return a usable file. Nothing was saved.";
  } else if (where === "llm" || !where) {
    if (status === 401 || status === 403 || /api key|unauthor|permission denied|invalid.*(key|credential)/.test(low)) {
      plain = gemini ? "Your Gemini key was rejected." : "Your AI key was rejected.";
    } else if (status === 404 || /model.*(not found|unsupported|does not exist)|unknown model|invalid model|not supported/.test(low)) {
      plain = "That model name looks wrong. Try gemini-2.5-flash.";
    } else if (status === 429 || status === 500 || status === 503 || /overload|unavailable|rate limit|resource exhausted|try again/.test(low)) {
      plain = "AI service is busy, try again in a minute.";
    } else if (/failed to fetch|networkerror|load failed|network request failed/.test(low)) {
      plain = "Couldn't reach the AI service. Check the address and your connection.";
    } else if (where === "llm") {
      plain = "The AI service didn't answer.";
    }
  }
  if (where === "github" || where === "save") {
    if (status === 401 || status === 403 || /bad credentials|resource not accessible|must have push access/.test(low)) {
      plain = "GitHub token can't write to this repo.";
    } else if (status === 409) {
      plain = "Someone else saved first. Try again.";
    } else if (/failed to fetch|networkerror|load failed/.test(low)) {
      plain = "Couldn't reach GitHub.";
    } else {
      plain = "GitHub didn't save the change.";
    }
  }
  return { plain, raw: raw.slice(0, 500) };
}

async function fetchChat(messages, maxTokens) {
  let response;
  try {
    response = await fetch(chatUrl(llmBase()), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + load(LS.key).trim(),
      },
      body: JSON.stringify({
        model: llmModel(),
        temperature: 0.2,
        stream: false,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        messages,
      }),
    });
  } catch (err) {
    throw Object.assign(new Error(err.message || "Failed to fetch"), { where: "llm" });
  }
  const raw = await response.text();
  if (!response.ok) {
    throw Object.assign(new Error("LLM " + response.status), {
      where: "llm",
      status: response.status,
      body: raw.slice(0, 500),
    });
  }
  let data;
  try { data = JSON.parse(raw); }
  catch {
    throw Object.assign(new Error("AI returned non-JSON."), { where: "llm", body: raw.slice(0, 300) });
  }
  return messageText(data);
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
    #dev-keywarn { margin: 0; color: #ffb15a; font-size: 14px; }
    #dev-keytest { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    #dev-keytest li { font-size: 15px; line-height: 1.35; }
    #dev-keytest .ok { color: #b6f2a2; }
    #dev-keytest .bad { color: #ffb4a8; }
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
        <label>AI address
          <input id="dev-base" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
        </label>
        <label>AI key
          <input id="dev-key" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
        </label>
        <p id="dev-keywarn" hidden>Gemini keys usually start with AIza. If this is a Gemini key, double-check it.</p>
        <label>Model
          <input id="dev-model" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off">
        </label>
        <label>GitHub token
          <input id="dev-gh" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="Fine-grained token, contents read and write">
        </label>
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
  const warn = root.querySelector("#dev-keywarn");

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
    const { plain, raw } = explain(err);
    setStatus(plain, raw, "bad");
  }

  function fillSettings() {
    baseInput.value = load(LS.base) || DEFAULT_BASE;
    keyInput.value = load(LS.key);
    root.querySelector("#dev-model").value = load(LS.model) || DEFAULT_MODEL;
    root.querySelector("#dev-gh").value = load(LS.gh);
    refreshKeyWarn();
  }

  function refreshKeyWarn() {
    const key = keyInput.value.trim();
    const base = baseInput.value.trim();
    const gemini = !base || /generativelanguage|googleapis/.test(base);
    warn.hidden = !(key && gemini && !key.startsWith("AIza"));
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

  keyInput.addEventListener("input", refreshKeyWarn);
  baseInput.addEventListener("input", refreshKeyWarn);

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

  settings.addEventListener("submit", (event) => {
    event.preventDefault();
    store(LS.base, baseInput.value.trim() || DEFAULT_BASE);
    store(LS.key, keyInput.value.trim());
    store(LS.model, root.querySelector("#dev-model").value.trim() || DEFAULT_MODEL);
    store(LS.gh, root.querySelector("#dev-gh").value.trim());
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
    const add = (ok, text) => {
      const li = document.createElement("li");
      li.className = ok ? "ok" : "bad";
      li.textContent = (ok ? "✓ " : "✗ ") + text;
      list.appendChild(li);
    };
    try {
      const key = (settings.hidden ? load(LS.key) : keyInput.value).trim();
      const token = (settings.hidden ? load(LS.gh) : root.querySelector("#dev-gh").value).trim();
      const base = (settings.hidden ? llmBase() : baseInput.value.trim() || DEFAULT_BASE);
      const model = (settings.hidden ? llmModel() : root.querySelector("#dev-model").value.trim() || DEFAULT_MODEL);
      if (!settings.hidden) {
        store(LS.base, base);
        store(LS.key, key);
        store(LS.model, model);
        store(LS.gh, token);
      }
      if (!key) add(false, "AI key is empty.");
      else {
        try {
          const reply = await fetchChat([
            { role: "user", content: "Reply with the single word ok" },
          ], 64);
          if (/\bok\b/i.test(reply)) add(true, "AI key works. It replied ok.");
          else add(false, "AI key reached the service, but the reply was not ok. The model name might be wrong.");
        } catch (err) {
          const { plain } = explain(err);
          add(false, "AI: " + plain);
        }
      }
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
          add(false, "GitHub: " + plain);
        }
      }
      const bits = [...list.querySelectorAll("li")].map((li) => li.textContent);
      const bad = list.querySelector(".bad");
      setStatus(bad ? "Key check finished with a problem." : "Key check passed.", bits.join(" "), bad ? "bad" : "ok");
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
      const token = load(LS.gh).trim();
      setStatus("Picking which file to change…");
      const pickText = await fetchChat([
        {
          role: "system",
          content: "You choose source files for a tiny plain-ES-module game with no build step. Reply with JSON only, no markdown: {\"files\":[\"path\"]}. Pick 1 to 3 paths from the list. Do not invent paths. Prefer the smallest set.",
        },
        {
          role: "user",
          content: `Files:\n${catalogText()}\n\nRequest: ${instruction}`,
        },
      ], 200);
      const paths = parsePick(pickText);

      setStatus("Asking AI for the change…");
      const originals = [];
      for (const path of paths) {
        const got = await ghJson(contentsUrl(path) + "?ref=main", token);
        originals.push({ path, sha: got.sha, text: b64ToUtf8(got.content || "") });
      }
      const bundle = originals.map((file) => `FILE ${file.path}\n${file.text}`).join("\n\n");
      const editedText = await fetchChat([
        {
          role: "system",
          content: "You edit Weird Velocity, plain ES modules, no build step. Return each changed file in full, using this wrapper and nothing else:\n<<<FILE path>>>\ncomplete file\n<<<END>>>\nNo commentary. No secrets. Return whole files.",
        },
        {
          role: "user",
          content: `Request: ${instruction}\n\n${bundle}`,
        },
      ]);
      const edits = parseEdits(editedText, paths);
      if (!edits.length) {
        throw Object.assign(new Error("No wrapped files in the reply."), { where: "edit" });
      }
      const ready = [];
      for (const edit of edits) {
        const prior = originals.find((file) => file.path === edit.path);
        if (!prior || edit.content.trim() === prior.text.trim()) continue;
        let valid = false;
        try { valid = looksValid(edit.path, edit.content); }
        catch { valid = false; }
        if (!valid) {
          throw Object.assign(new Error("Rejected an unusable copy of " + edit.path), { where: "edit" });
        }
        ready.push({
          path: edit.path,
          sha: prior.sha,
          body: edit.content.endsWith("\n") ? edit.content : edit.content + "\n",
        });
      }
      if (!ready.length) {
        setStatus("The AI didn't change anything. Nothing was saved.");
        return;
      }

      setStatus("Saving to GitHub…");
      const saved = [];
      let lastUrl = "";
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
        lastUrl = put.commit?.html_url || (put.commit?.sha
          ? `https://github.com/${REPO}/commit/${put.commit.sha}`
          : lastUrl);
      }
      if (!saved.length) {
        setStatus("The AI didn't change anything. Nothing was saved.");
        return;
      }
      showDone(saved, lastUrl);
    } catch (err) {
      showError(err);
    } finally {
      go.disabled = false;
    }
  }
}

install();
