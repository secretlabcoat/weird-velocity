// Procedural sprites, baked once. The frame loop only blits them.

import { hash, rng } from "./util.js";

let atlas = null;
const bodies = new Map();
const rocks = [];
const nebulas = new Map();

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 90);
  const g = Math.min(255, ((n >> 8) & 255) + 90);
  const b = Math.min(255, (n & 255) + 70);
  return `rgb(${r},${g},${b})`;
}

function glow(g, x, y, radius, color) {
  const grd = g.createRadialGradient(x, y, 2, x, y, radius);
  grd.addColorStop(0, color);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, radius, 0, Math.PI * 2);
  g.fill();
}

export function getAtlas() {
  if (atlas) return atlas;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  glow(g, 32, 32, 30, "rgba(126,224,214,0.95)");
  glow(g, 96, 32, 30, "rgba(255,130,160,0.95)");
  glow(g, 160, 32, 30, "rgba(255,177,90,0.95)");
  glow(g, 224, 32, 18, "rgba(255,255,255,0.95)");
  atlas = canvas;
  return atlas;
}

function bakeRock(kind) {
  const canvas = document.createElement("canvas");
  const logical = 72;
  canvas.width = canvas.height = logical * 2;
  canvas.logical = logical;
  const g = canvas.getContext("2d");
  g.scale(2, 2);
  g.translate(36, 36);
  if (kind === 2) {
    g.fillStyle = "#c4b49a";
    g.fillRect(-16, -12, 32, 24);
    g.strokeStyle = "#efe9dc";
    g.lineWidth = 2;
    g.strokeRect(-16, -12, 32, 24);
    g.beginPath();
    g.moveTo(-16, 0);
    g.lineTo(16, 0);
    g.moveTo(0, -12);
    g.lineTo(0, 12);
    g.stroke();
    return canvas;
  }
  const scrap = kind === 1;
  const rand = rng(hash("rock", kind));
  g.fillStyle = scrap ? "#5c6770" : "#8a7a4e";
  g.beginPath();
  const n = scrap ? 5 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = (scrap ? 12 : 16) + rand() * (scrap ? 14 : 8);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.lineWidth = 2;
  if (scrap) {
    g.strokeStyle = "#d5dde4";
    g.stroke();
  } else {
    g.strokeStyle = "#d7e27a";
    g.beginPath();
    g.moveTo(-10, 8);
    g.lineTo(0, 0);
    g.lineTo(12, -10);
    g.stroke();
  }
  return canvas;
}

export function rockSprite(kind) {
  if (!rocks[kind]) rocks[kind] = bakeRock(kind);
  return rocks[kind];
}

function sphere(g, body, cx, cy, r) {
  const grd = g.createRadialGradient(cx - r * 0.35, cy - r * 0.38, r * 0.15, cx, cy, r);
  grd.addColorStop(0, lighten(body.accent || "#aaa"));
  grd.addColorStop(0.6, body.accent || "#888");
  grd.addColorStop(1, "#120e18");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

function bakeEnvelope(body) {
  const logical = Math.ceil(body.r * 2 + 16);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = logical * 2;
  canvas.logical = logical;
  const g = canvas.getContext("2d");
  g.scale(2, 2);
  const cx = logical / 2;
  const cy = logical / 2;
  const w = body.r * 1.7;
  const h = body.r * 1.15;
  g.fillStyle = "#f3e6cf";
  g.beginPath();
  g.roundRect(cx - w / 2, cy - h / 2, w, h, 8);
  g.fill();
  g.fillStyle = "#e7c8a0";
  g.beginPath();
  g.moveTo(cx - w / 2, cy - h / 2);
  g.lineTo(cx, cy + 4);
  g.lineTo(cx + w / 2, cy - h / 2);
  g.closePath();
  g.fill();
  g.strokeStyle = "#8a5a44";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx - w / 2, cy + h / 2);
  g.lineTo(cx - 6, cy + 2);
  g.moveTo(cx + w / 2, cy + h / 2);
  g.lineTo(cx + 6, cy + 2);
  g.stroke();
  g.fillStyle = "#d4534a";
  g.beginPath();
  g.arc(cx, cy + 2, 7, 0, Math.PI * 2);
  g.fill();
  return canvas;
}

function paintLook(g, body, cx, cy, r, rand) {
  if (body.look === "banded") {
    g.fillStyle = "rgba(7,40,46,0.35)";
    for (let i = -2; i <= 2; i++) {
      g.fillRect(cx - r, cy + i * r * 0.28 - 3, r * 2, 5);
    }
  } else if (body.look === "grove") {
    g.fillStyle = "#214d28";
    for (let i = 0; i < 9; i++) {
      const x = cx + (rand() - 0.5) * r * 1.2;
      const y = cy + (rand() - 0.5) * r * 1.1;
      g.beginPath();
      g.moveTo(x, y - 10);
      g.lineTo(x + 7, y + 8);
      g.lineTo(x - 7, y + 8);
      g.fill();
    }
  } else if (body.look === "bow") {
    g.strokeStyle = "rgba(40,20,60,0.55)";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(cx, cy + r * 0.05, r * 0.38, 0.2, Math.PI - 0.2);
    g.stroke();
    g.fillStyle = "rgba(40,20,60,0.55)";
    g.beginPath();
    g.arc(cx - r * 0.16, cy - r * 0.08, 3, 0, 7);
    g.arc(cx + r * 0.16, cy - r * 0.08, 3, 0, 7);
    g.fill();
  } else if (body.look === "plaque") {
    g.fillStyle = "rgba(255,244,220,0.82)";
    g.fillRect(cx - r * 0.42, cy - r * 0.48, r * 0.84, r * 0.96);
    g.fillStyle = "#5c4030";
    for (let i = 0; i < 5; i++) g.fillRect(cx - r * 0.28, cy - r * 0.32 + i * 12, r * 0.5, 2);
  } else if (body.look === "census") {
    g.fillStyle = "rgba(255,255,255,0.75)";
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        g.fillRect(cx + x * 14 - 2, cy + y * 14 - 2, 4, 4);
      }
    }
    g.strokeStyle = "#e8fff0";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - 8, cy + 4);
    g.lineTo(cx - 2, cy + 12);
    g.lineTo(cx + 14, cy - 10);
    g.stroke();
  } else if (body.look === "note") {
    g.strokeStyle = "rgba(40,20,8,0.8)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - r * 0.55, cy);
    g.lineTo(cx + r * 0.55, cy);
    g.moveTo(cx + r * 0.2, cy);
    g.lineTo(cx + r * 0.2, cy - r * 0.45);
    g.stroke();
    g.fillStyle = "#2a1608";
    g.beginPath();
    g.ellipse(cx + r * 0.02, cy + 2, 10, 7, -0.4, 0, Math.PI * 2);
    g.fill();
  }
}

function bakePlanet(body) {
  if (body.look === "envelope") return bakeEnvelope(body);
  const pad = body.ring ? 34 : 8;
  const logical = Math.ceil(body.r * 2 + pad * 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = logical * 2;
  canvas.logical = logical;
  const g = canvas.getContext("2d");
  g.scale(2, 2);
  const cx = logical / 2;
  const cy = logical / 2;
  const rand = rng(hash(body.id, "skin"));
  sphere(g, body, cx, cy, body.r);
  g.save();
  g.beginPath();
  g.arc(cx, cy, body.r - 1, 0, Math.PI * 2);
  g.clip();
  paintLook(g, body, cx, cy, body.r, rand);
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.38)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx - body.r * 0.12, cy - body.r * 0.12, body.r * 0.72, Math.PI * 1.15, Math.PI * 1.75);
  g.stroke();
  if (body.ring) {
    g.strokeStyle = "rgba(239,233,220,0.6)";
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(cx, cy, body.r * 1.42, body.r * 0.4, -0.45, 0, Math.PI * 2);
    g.stroke();
  }
  return canvas;
}

function bakeStation(body) {
  const logical = Math.ceil(body.r * 2 + 28);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = logical * 2;
  canvas.logical = logical;
  const g = canvas.getContext("2d");
  g.scale(2, 2);
  const cx = logical / 2;
  const cy = logical / 2;
  const r = body.r;
  g.fillStyle = "#1b1f2a";
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = body.accent || "#7ee0d6";
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "#0c1018";
  g.beginPath();
  g.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = body.accent || "#ffb15a";
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.fillRect(cx + Math.cos(a) * r * 0.62 - 2, cy + Math.sin(a) * r * 0.62 - 2, 4, 4);
  }
  return canvas;
}

export function bodySprite(body) {
  let sprite = bodies.get(body.id);
  if (!sprite) {
    sprite = body.kind === "station" ? bakeStation(body) : bakePlanet(body);
    bodies.set(body.id, sprite);
  }
  return sprite;
}

export function nebulaSprite(sys) {
  let sprite = nebulas.get(sys.id);
  if (sprite) return sprite;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 768;
  const g = canvas.getContext("2d");
  const rand = rng(hash(sys.id, "nebula"));
  for (let i = 0; i < 5; i++) {
    const x = rand() * 768;
    const y = rand() * 768;
    const radius = 140 + rand() * 200;
    const grd = g.createRadialGradient(x, y, radius * 0.08, x, y, radius);
    grd.addColorStop(0, sys.nebula[i % sys.nebula.length]);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, radius, radius * (0.55 + rand() * 0.5), rand() * 6, 0, Math.PI * 2);
    g.fill();
  }
  sprite = canvas;
  nebulas.set(sys.id, sprite);
  return sprite;
}
