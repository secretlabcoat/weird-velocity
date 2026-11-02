// Small shared math and game constants.

export const WORLD = 4000;
export const JUMP_FUEL = 16;
export const HOLD_MAX = 36;
export const FUEL_MAX = 100;
export const FUEL_PRICE = 2;
export const REPAIR_PRICE = 4;
export const DT_CAP = 0.05;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function angDelta(from, to) {
  let d = to - from;
  const tau = Math.PI * 2;
  while (d > Math.PI) d -= tau;
  while (d < -Math.PI) d += tau;
  return d;
}

export function hash(...parts) {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function reduceMotion() {
  return typeof window !== "undefined"
    && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[c]));
}
