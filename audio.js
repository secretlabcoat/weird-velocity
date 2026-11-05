// Web Audio API engine supporting MP3 sound effects, background music loop, and synthesized fallback bleeps.

let ctx = null;
let muted = false;
let sfxGainNode = null;
let musicGainNode = null;
let musicStarted = false;
let lastShotTime = 0;
const buffers = {};

const FILE_GAINS = { shot: 0.35, enemy: 0.3, hit: 0.4, boom: 0.6 };

const PRESETS = {
  shot: [520, 0.07, "square", 0.04],
  enemy: [180, 0.09, "sawtooth", 0.03],
  hit: [140, 0.08, "triangle", 0.05],
  boom: [70, 0.22, "sawtooth", 0.06],
  dock: [330, 0.12, "sine", 0.05],
  jump: [90, 0.28, "sine", 0.05],
  ui: [480, 0.06, "sine", 0.04],
  mission: [523, 0.14, "triangle", 0.05],
  no: [110, 0.12, "square", 0.04],
  coin: [660, 0.08, "sine", 0.04],
};

function loadSound(name) {
  const url = new URL(`./assets/sound/${name}.mp3`, import.meta.url).href;
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      return new Promise((resolve) => {
        let res;
        try {
          res = ctx.decodeAudioData(buf, (b) => resolve(b), () => resolve(null));
        } catch {
          resolve(null);
        }
        if (res && typeof res.then === "function") {
          res.then(resolve).catch(() => resolve(null));
        }
      });
    })
    .then((decoded) => {
      if (decoded) {
        buffers[name] = decoded;
        if (name === "music") startMusicIfReady();
      }
    })
    .catch(() => {});
}

function startMusicIfReady() {
  if (musicStarted || !buffers.music || !ctx || ctx.state !== "running") return;
  musicStarted = true;
  const src = ctx.createBufferSource();
  src.buffer = buffers.music;
  src.loop = true;
  src.connect(musicGainNode);
  src.start(0);
}

function initContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  sfxGainNode = ctx.createGain();
  sfxGainNode.gain.value = muted ? 0 : 1;
  sfxGainNode.connect(ctx.destination);

  musicGainNode = ctx.createGain();
  musicGainNode.gain.value = muted ? 0 : 0.25;
  musicGainNode.connect(ctx.destination);

  ["shot", "enemy", "hit", "boom", "music"].forEach(loadSound);
}

export function setMuted(value) {
  muted = !!value;
  if (ctx && sfxGainNode && musicGainNode) {
    const t = ctx.currentTime;
    sfxGainNode.gain.setTargetAtTime(muted ? 0 : 1, t, 0.01);
    musicGainNode.gain.setTargetAtTime(muted ? 0 : 0.25, t, 0.01);
  }
}

export function unlockAudio() {
  if (!ctx) initContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(startMusicIfReady).catch(() => {});
  } else {
    startMusicIfReady();
  }
}

export function primeAudio() {
  unlockAudio();
  if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch { /* autoplay */ }
  if (ctx.state !== "running") {
    ctx.resume().then(startMusicIfReady).catch(() => {});
  } else {
    startMusicIfReady();
  }
}

export function chime() {
  unlockAudio();
  const play = () => sfx("ui");
  if (!ctx) return;
  if (ctx.state === "running") {
    play();
    startMusicIfReady();
  } else {
    ctx.resume().then(() => { play(); startMusicIfReady(); }).catch(() => {});
  }
}

export function sfx(name) {
  if (muted || !ctx || ctx.state !== "running") return;
  if (name === "shot") {
    const now = performance.now();
    if (now - lastShotTime < 70) return;
    lastShotTime = now;
  }

  const buf = buffers[name];
  if (buf && FILE_GAINS[name] !== undefined) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = FILE_GAINS[name];
    src.connect(g);
    g.connect(sfxGainNode);
    src.start();
    return;
  }

  const preset = PRESETS[name];
  if (!preset) return;
  const [freq, dur, type, gain] = preset;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (name === "jump") osc.frequency.exponentialRampToValueAtTime(40, t + dur);
  if (name === "mission") osc.frequency.exponentialRampToValueAtTime(880, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(sfxGainNode);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) {
    ctx.suspend().catch(() => {});
  } else {
    ctx.resume().then(startMusicIfReady).catch(() => {});
  }
});