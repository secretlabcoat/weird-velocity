// In-game editor. Loaded only from index.html when the URL has ?dev=1.
// The LLM key and GitHub token live in localStorage on this device, never in the repo.

const REPO = "secretlabcoat/weird-velocity";
const FILES = [
  "index.html",
  "style.css",
  "main.js",
  "state.js",
  "util.js",
  "physics.js",
  "data/galaxy.js",
  "trade.js",
  "missions.js",
  "combat.js",
  "fx.js",
  "sim.js",
  "sprites.js",
  "render.js",
  "input.js",
  "ui.js",
  "save.js",
  "audio.js",
  "devbot.js",
  "NOTES.md",
  "README.md",
  "manifest.webmanifest",
];

const LS = {
  base: "wv.dev.llmBase",
  key: "wv.dev.llmKey",
  model: "wv.dev.llmModel",
  gh: "wv.dev.githubToken",
};

const HINTS = [
  [/star|draw|graphic|compass|minimap|camera|vignette/i, "render.js"],
  [/sprite|planet look|nebula|atlas/i, "sprites.js"],
  [/joystick|keyboard|stick|touch control|button fire/i, "input.js"],
  [/price|cargo|trade|buy|sell|refuel|repair/i, "trade.js"],
  [/mission|bounty|contract|errand|delivery/i, "missions.js"],
  [/pirate|weapon|damage|shield|bolt|laser|armor/i, "combat.js"],
  [/thrust|turn rate|brake|physic|speed/i, "physics.js"],
  [/spawn|hyperspace|warp|dock|jump|pirate ai/i, "sim.js"],
  [/save|localstorage/i, "save.js"],
  [/sound|audio|beep/i, "audio.js"],
  [/css|layout|safe area|portrait|landscape|font/i, "style.css"],
  [/viewport|meta tag|html/i, "index.html"],
  [/commodity|planet name|system|blurb|galaxy|faction/i, "data/galaxy.js"],
  [/notes\.md|architecture note/i, "NOTES.md"],
  [/readme/i, "README.md"],
  [/devbot|llm|microphone/i, "devbot.js"],
  [/hud|menu|title screen|trade screen|chart screen/i, "ui.js"],
];

function load(key, fallback = "") {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

function guessFile(text) {
  const named = FILES.find((file) => text.toLowerCase().includes(file.toLowerCase()));
  if (named) return named;
  for (const [pattern, file] of HINTS) if (pattern.test(text)) return file;
  return null;
}

function chatUrl(base) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return trimmed + "/chat/completions";
}

function stripFences(text) {
  const trimmed = text.trim();
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
  throw new Error("The model returned no text.");
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
  const bin = atob(b64.replace(/\n/g, ""));
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

function install() {
  document.body.classList.add("dev");
  const style = document.createElement("style");
  style.textContent = `
    #devbot, #devbot * { touch-action: manipulation; }
    #devbot, #devbot textarea, #devbot select, #devbot input {
      user-select: text; -webkit-user-select: text;
    }
    #devbot {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
      display: flex; flex-direction: column; gap: 6px;
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      background: rgba(8, 10, 16, 0.94);
      border-top: 1px solid rgba(255,244,220,0.2);
      font: 16px/1.3 ui-sans-serif, system-ui, sans-serif;
      color: #efe9dc;
    }
    #devbot textarea, #devbot select {
      font: 16px/1.3 ui-sans-serif, system-ui, sans-serif;
      color: #efe9dc; background: #12151f;
      border: 1px solid rgba(255,244,220,0.2); border-radius: 10px;
      padding: 8px; width: 100%;
    }
    #devbot textarea { min-height: 52px; resize: vertical; }
    #devbot .row { display: flex; gap: 6px; }
    #devbot button {
      min-width: 44px; min-height: 44px; border-radius: 10px;
      border: 1px solid rgba(255,244,220,0.25); background: #1b2030;
      color: #efe9dc; font: 16px/1 ui-sans-serif, system-ui, sans-serif;
    }
    #devbot button.on { background: #ffb15a; color: #1a1208; }
    #devbot .status { margin: 0; font-size: 13px; color: #b7b0a2; }
    body.dev #controls { bottom: 176px; }
    body.dev #overlay { bottom: 176px; }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "devbot";
  root.innerHTML = `
    <select id="dev-file" aria-label="File to edit"></select>
    <textarea id="dev-text" placeholder="Tell the bot what to change…" autocomplete="off" autocapitalize="sentences"></textarea>
    <div class="row">
      <button type="button" id="dev-mic" aria-label="Microphone">Mic</button>
      <button type="button" id="dev-go">Go</button>
      <button type="button" id="dev-gear" aria-label="Settings">⚙</button>
    </div>
    <p class="status" id="dev-status">Keys stay in this browser's localStorage.</p>
  `;
  document.body.appendChild(root);

  const fileEl = root.querySelector("#dev-file");
  const textEl = root.querySelector("#dev-text");
  const statusEl = root.querySelector("#dev-status");
  for (const file of FILES) {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    fileEl.appendChild(option);
  }
  let pickedByHand = false;
  fileEl.addEventListener("change", () => { pickedByHand = true; });
  textEl.addEventListener("input", () => {
    if (pickedByHand) return;
    const guess = guessFile(textEl.value);
    if (guess) fileEl.value = guess;
  });

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
      textEl.value = (textEl.value ? textEl.value + " " : "") + said;
      textEl.dispatchEvent(new Event("input"));
    };
    recognition.onerror = () => { recognition = null; mic.classList.remove("on"); };
    recognition.onend = () => { recognition = null; mic.classList.remove("on"); };
    mic.classList.add("on");
    recognition.start();
  });

  root.querySelector("#dev-gear").addEventListener("click", () => {
    const base = prompt("LLM base URL (OpenAI-compatible, usually ending in /v1)", load(LS.base));
    if (base === null) return;
    const key = prompt("LLM API key", load(LS.key));
    if (key === null) return;
    const model = prompt("Model name", load(LS.model, "auto"));
    if (model === null) return;
    const token = prompt("GitHub fine-grained token (contents: read and write)", load(LS.gh));
    if (token === null) return;
    store(LS.base, base.trim());
    store(LS.key, key.trim());
    store(LS.model, (model.trim() || "auto"));
    store(LS.gh, token.trim());
    statusEl.textContent = "Saved on this device only.";
  });

  root.querySelector("#dev-go").addEventListener("click", () => run(fileEl, textEl, statusEl));
}

async function run(fileEl, textEl, statusEl) {
  const instruction = textEl.value.trim();
  const path = fileEl.value;
  if (!instruction) {
    statusEl.textContent = "Write an instruction first.";
    return;
  }
  const base = load(LS.base);
  const apiKey = load(LS.key);
  const model = load(LS.model, "auto") || "auto";
  const token = load(LS.gh);
  if (!base || !apiKey || !token) {
    statusEl.textContent = "Open the gear and set the LLM URL, API key, and GitHub token.";
    return;
  }
  const go = document.getElementById("dev-go");
  go.disabled = true;
  try {
    statusEl.textContent = "Reading " + path + "…";
    const got = await fetch(contentsUrl(path) + "?ref=main", { headers: ghHeaders(token) });
    const gotBody = await got.json().catch(() => ({}));
    if (!got.ok) throw new Error("GitHub read failed (" + got.status + "). " + (gotBody.message || ""));
    const original = b64ToUtf8(gotBody.content || "");
    const sha = gotBody.sha;
    statusEl.textContent = "Asking the model…";
    const response = await fetch(chatUrl(base), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        stream: false,
        messages: [
          {
            role: "system",
            content: "You edit one file in Weird Velocity, a plain-ES-module game with no build step. Return the complete updated file and nothing else. No markdown fences. No commentary. Keep it valid. Do not include secrets.",
          },
          {
            role: "user",
            content: `File: ${path}\n\nInstruction: ${instruction}\n\nCurrent file:\n${original}`,
          },
        ],
      }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error("LLM " + response.status + " " + raw.slice(0, 180));
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error("LLM returned non-JSON."); }
    const updated = stripFences(messageText(data)).replace(/\r\n/g, "\n");
    if (updated.trim() === original.trim()) {
      statusEl.textContent = "The model returned the same file. Nothing committed.";
      return;
    }
    try {
      if (!looksValid(path, updated)) throw new Error("invalid");
    } catch {
      statusEl.textContent = "The model did not return a usable file. Nothing committed.";
      return;
    }
    statusEl.textContent = "Committing…";
    const put = await fetch(contentsUrl(path), {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: ("devbot: " + instruction.replace(/\s+/g, " ")).slice(0, 72),
        content: utf8ToB64(updated.endsWith("\n") ? updated : updated + "\n"),
        sha,
        branch: "main",
      }),
    });
    const putBody = await put.json().catch(() => ({}));
    if (!put.ok) throw new Error("GitHub commit failed (" + put.status + "). " + (putBody.message || ""));
    statusEl.textContent = "Committed " + (putBody.commit?.sha || "").slice(0, 7) + ". Reload in about a minute.";
  } catch (err) {
    statusEl.textContent = err.message || String(err);
  } finally {
    go.disabled = false;
  }
}

install();
