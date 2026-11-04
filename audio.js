// Tiny synthesized bleeps. The context starts on the first gesture.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = !!value;
}

export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

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
  if (ctx.state !== "running") ctx.resume().catch(() => {});
}

export function chime() {
  unlockAudio();
  const play = () => sfx("ui");
  if (!ctx) return;
  if (ctx.state === "running") play();
  else ctx.resume().then(play).catch(() => {});
}

export function sfx(name) {
  if (muted || !ctx || ctx.state !== "running") return;
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
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
