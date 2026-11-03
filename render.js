// World drawing. Stars and bolts are batched; planets are cached blits.
// module rev sw-2

import { WORLD, reduceMotion, rng, hash } from "./util.js";
import { system } from "./data/galaxy.js";
import copy, { fill } from "./data/text.js";
import { compassTarget } from "./missions.js";
import { getAtlas, bodySprite, rockSprite, nebulaSprite } from "./sprites.js";

let starLayers = null;
let vignette = null;
let vignetteKey = "";

function makeStars(count, seed, min, max) {
  const rand = rng(hash("stars", seed));
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * 1024,
      y: rand() * 1024,
      s: min + rand() * (max - min),
    });
  }
  return stars;
}

function getStars() {
  if (starLayers) return starLayers;
  starLayers = [
    { stars: makeStars(80, 11, 1.1, 1.5), parallax: 0.15, color: "#c9d4ff", alpha: 0.55 },
    { stars: makeStars(55, 29, 1.3, 1.8), parallax: 0.38, color: "#ffffff", alpha: 0.8 },
    { stars: makeStars(32, 47, 1.7, 2.3), parallax: 0.62, color: "#ffe6c2", alpha: 0.92 },
  ];
  return starLayers;
}

function drawStars(ctx, layer, cam, view, time, phase) {
  const tile = 1024;
  const twinkle = 0.86 + 0.14 * Math.sin(time * 1.3 + phase);
  ctx.fillStyle = layer.color;
  ctx.globalAlpha = layer.alpha * twinkle;
  ctx.beginPath();
  const ox = cam.x * layer.parallax;
  const oy = cam.y * layer.parallax;
  for (const star of layer.stars) {
    let x = star.x - ox;
    let y = star.y - oy;
    x = ((x % tile) + tile) % tile;
    y = ((y % tile) + tile) % tile;
    for (const ix of [-1, 0, 1]) {
      for (const iy of [-1, 0, 1]) {
        const px = x + ix * tile;
        const py = y + iy * tile;
        if (px > -4 && py > -4 && px < view.w + 4 && py < view.h + 4) ctx.rect(px, py, star.s, star.s);
      }
    }
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

function updateCamera(game, dt) {
  const view = game.view;
  let tx;
  let ty;
  if (!game.player || game.mode === "title") {
    const dock = game.bodies.find((b) => b.kind === "station") || { x: 2000, y: 2000 };
    tx = dock.x - view.w / 2;
    ty = dock.y - view.h * 0.28;
  } else {
    const lead = game.mode === "warp" ? 0.05 : 0.22;
    tx = game.player.x + game.player.vx * lead - view.w / 2;
    ty = game.player.y + game.player.vy * lead - view.h / 2;
  }
  if (game.snap) {
    game.cam.x = tx;
    game.cam.y = ty;
    game.snap = false;
  } else {
    const k = 1 - Math.exp(-4.2 * dt);
    game.cam.x += (tx - game.cam.x) * k;
    game.cam.y += (ty - game.cam.y) * k;
  }
  let sx = 0;
  let sy = 0;
  if (game.cam.shake > 0.35 && !reduceMotion()) {
    sx = (Math.random() - 0.5) * game.cam.shake * 2;
    sy = (Math.random() - 0.5) * game.cam.shake * 2;
  }
  return { x: game.cam.x + sx, y: game.cam.y + sy };
}

function drawShip(ctx, x, y, angle, opts) {
  const atlas = getAtlas();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.9 * (opts.alpha ?? 1);
  const cell = opts.kind === "pirate" ? 64 : 0;
  ctx.drawImage(atlas, cell, 0, 64, 64, -42, -42, 84, 84);
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = opts.kind === "pirate" ? "#ffd5e0" : "#e9fffb";
  ctx.beginPath();
  if (opts.kind === "pirate") {
    ctx.moveTo(0, -16);
    ctx.lineTo(12, -4);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 6);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-6, -2);
  } else {
    ctx.moveTo(0, -18);
    ctx.lineTo(8, -2);
    ctx.lineTo(6, 14);
    ctx.lineTo(0, 7);
    ctx.lineTo(-13, 16);
    ctx.lineTo(-7, -3);
  }
  ctx.closePath();
  ctx.fill();
  if (opts.thrust > 0.12) {
    const len = 8 + opts.thrust * 16 + Math.sin(opts.time * 42) * 3;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(atlas, 128, 0, 64, 64, -16, 6, 32, 28 + len);
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.fillStyle = "#ffb15a";
    ctx.beginPath();
    ctx.moveTo(-3.5, 12);
    ctx.lineTo(0, 12 + len);
    ctx.lineTo(3.5, 12);
    ctx.fill();
  }
  ctx.fillStyle = opts.kind === "pirate" ? "#ff4d6a" : "#ffb15a";
  ctx.beginPath();
  ctx.arc(0, -6, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (opts.shield > 0.02) {
    ctx.strokeStyle = opts.kind === "pirate"
      ? `rgba(255,143,184,${0.3 + opts.shield * 0.5})`
      : `rgba(126,224,214,${0.3 + opts.shield * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * opts.shield);
    ctx.stroke();
  }
  if (opts.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, opts.flash * 4)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBolts(ctx, bolts, cam, friendly) {
  const groups = new Map();
  for (const bolt of bolts) {
    if (bolt.friendly !== friendly) continue;
    const color = bolt.color || (friendly ? "#ff69b4" : "#ff5555");
    let list = groups.get(color);
    if (!list) groups.set(color, list = []);
    list.push(bolt);
  }
  for (const [color, list] of groups) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const bolt of list) {
      const len = Math.hypot(bolt.vx, bolt.vy) || 1;
      const x = bolt.x - cam.x;
      const y = bolt.y - cam.y;
      ctx.moveTo(x, y);
      ctx.lineTo(x - (bolt.vx / len) * 12, y - (bolt.vy / len) * 12);
    }
    ctx.stroke();
  }
}

function drawLabel(ctx, text, x, y) {
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(7,6,15,0.75)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "rgba(239,233,220,0.92)";
  ctx.fillText(text, x, y);
}

function drawCompass(ctx, game, cam) {
  const target = compassTarget(game);
  if (!target || !game.player || game.mode !== "flight") return;
  const view = game.view;
  const sx = target.x - cam.x;
  const sy = target.y - cam.y;
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb15a";
  ctx.strokeStyle = "#ffb15a";
  const pad = 46;
  if (sx > pad && sy > pad + 70 && sx < view.w - pad && sy < view.h - 150) {
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.stroke();
    drawLabel(ctx, target.label, sx, sy - 28);
    return;
  }
  const dx = target.x - game.player.x;
  const dy = target.y - game.player.y;
  const ang = Math.atan2(dy, dx);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const hw = view.w / 2 - 30;
  const hh = view.h / 2 - 78;
  let t = 1e9;
  if (cos > 0.001) t = Math.min(t, hw / cos);
  if (cos < -0.001) t = Math.min(t, -hw / cos);
  if (sin > 0.001) t = Math.min(t, hh / sin);
  if (sin < -0.001) t = Math.min(t, -hh / sin);
  const x = view.w / 2 + cos * t;
  const y = view.h / 2 + sin * t;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(-8, 6);
  ctx.lineTo(-8, -6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawLabel(ctx, target.label, x, y - 16);
}

function drawVignette(ctx, view) {
  const key = view.w + "x" + view.h;
  if (!vignette || vignetteKey !== key) {
    vignette = document.createElement("canvas");
    vignette.width = Math.max(1, view.w);
    vignette.height = Math.max(1, view.h);
    const g = vignette.getContext("2d");
    const grd = g.createRadialGradient(
      view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.28,
      view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.72,
    );
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = grd;
    g.fillRect(0, 0, view.w, view.h);
    vignetteKey = key;
  }
  ctx.drawImage(vignette, 0, 0, view.w, view.h);
}

function drawWarp(ctx, game) {
  if (game.mode !== "warp" || !game.warp) return;
  const view = game.view;
  const k = Math.sin(Math.min(1, game.warp.t / 1.05) * Math.PI);
  const cx = view.w / 2;
  const cy = view.h / 2;
  ctx.strokeStyle = `rgba(239,233,220,${0.15 + k * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const r0 = 16;
    const r1 = 40 + k * Math.max(view.w, view.h) * 0.55;
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  ctx.stroke();
  const flash = 1 - Math.min(1, Math.abs(game.warp.t - 0.42) / 0.14);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.85})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

export function draw(game, ctx, dt) {
  const view = game.view;
  const dpr = view.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.setLineDash([]);
  ctx.fillStyle = "#07060f";
  ctx.fillRect(0, 0, view.w, view.h);
  const cam = updateCamera(game, dt);
  const layers = getStars();
  drawStars(ctx, layers[0], cam, view, game.time, 0);
  drawStars(ctx, layers[1], cam, view, game.time, 1);
  const sys = system(game.systemId);
  if (sys) {
    ctx.globalAlpha = 0.95;
    ctx.drawImage(nebulaSprite(sys), -cam.x, -cam.y, WORLD, WORLD);
    ctx.globalAlpha = 1;
  }
  drawStars(ctx, layers[2], cam, view, game.time, 2);

  for (const beacon of game.beacons) {
    const x = beacon.x - cam.x;
    const y = beacon.y - cam.y;
    if (x < -80 || y < -80 || x > view.w + 80 || y > view.h + 80) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(game.time * 0.7);
    ctx.strokeStyle = beacon.accent || "#ffb15a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(-18, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, fill(copy.hud.jumpMark, { name: beacon.name }), x, y + 32);
  }

  for (const rock of game.rocks) {
    const sprite = rockSprite(rock.kind);
    const x = rock.x - cam.x;
    const y = rock.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rock.spin);
    ctx.drawImage(sprite, -sprite.logical / 2, -sprite.logical / 2, sprite.logical, sprite.logical);
    ctx.restore();
  }

  const player = game.player;
  for (const body of game.bodies) {
    const sprite = bodySprite(body);
    const x = body.x - cam.x;
    const y = body.y - cam.y;
    ctx.drawImage(sprite, x - sprite.logical / 2, y - sprite.logical / 2, sprite.logical, sprite.logical);
    if (body.kind === "station") {
      const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(game.time * 4 + body.x));
      ctx.globalAlpha = blink;
      ctx.fillStyle = "#ffb15a";
      ctx.fillRect(x - 2, y - body.r - 8, 4, 4);
      ctx.globalAlpha = 1;
    }
    drawLabel(ctx, body.name, x, y - body.r - 14);
    if (player && game.mode === "flight") {
      const d = Math.hypot(player.x - body.x, player.y - body.y);
      if (d < body.r + 280) {
        ctx.strokeStyle = "rgba(126,224,214,0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.arc(x, y, body.r + 130, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  drawBolts(ctx, game.bolts, cam, true);
  drawBolts(ctx, game.bolts, cam, false);

  const groups = new Map();
  for (const particle of game.particles) {
    const bucket = particle.color + (particle.life < particle.max * 0.45 ? ":dim" : "");
    let list = groups.get(bucket);
    if (!list) groups.set(bucket, list = []);
    list.push(particle);
  }
  for (const [bucket, list] of groups) {
    ctx.globalAlpha = bucket.endsWith(":dim") ? 0.45 : 0.9;
    ctx.fillStyle = list[0].color;
    ctx.beginPath();
    for (const particle of list) {
      const size = Math.max(0.8, particle.size * (particle.life / particle.max));
      ctx.rect(particle.x - cam.x, particle.y - cam.y, size, size);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const pirate of game.pirates) {
    if (!pirate.alive) continue;
    const alpha = pirate.invuln > 0 ? 0.65 : 1;
    drawShip(ctx, pirate.x - cam.x, pirate.y - cam.y, pirate.angle, {
      kind: "pirate",
      thrust: pirate.thrusting || 0,
      shield: pirate.shield / pirate.shieldMax,
      flash: pirate.flash,
      time: game.time,
      alpha,
    });
    drawLabel(ctx, pirate.name, pirate.x - cam.x, pirate.y - cam.y - 26);
  }

  if (player && player.alive && game.mode !== "title") {
    let alpha = 1;
    if (player.invuln > 0) alpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(game.time * 28));
    drawShip(ctx, player.x - cam.x, player.y - cam.y, player.angle, {
      kind: "player",
      thrust: player.thrusting || 0,
      shield: player.shield / player.shieldMax,
      flash: player.flash,
      time: game.time,
      alpha,
    });
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 20) {
      ctx.strokeStyle = "rgba(255,177,90,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(player.x - cam.x, player.y - cam.y);
      ctx.lineTo(player.x - cam.x + player.vx * 0.22, player.y - cam.y + player.vy * 0.22);
      ctx.stroke();
    }
  }

  if (game.mode === "title") {
    const dock = game.bodies.find((b) => b.kind === "station");
    if (dock) {
      const a = game.time * 0.55;
      const x = dock.x + Math.cos(a) * 100;
      const y = dock.y + Math.sin(a) * 64;
      const ang = Math.atan2(-Math.sin(a), -Math.cos(a));
      drawShip(ctx, x - cam.x, y - cam.y, ang, {
        kind: "player", thrust: 0.85, shield: 0.8, flash: 0, time: game.time, alpha: 1,
      });
    }
  }

  for (const floater of game.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, floater.life));
    drawLabel(ctx, floater.text, floater.x - cam.x, floater.y - cam.y);
  }
  ctx.globalAlpha = 1;

  drawCompass(ctx, game, cam);
  drawVignette(ctx, view);
  drawWarp(ctx, game);
}

export function drawMinimap(game, ctx) {
  if (!ctx || (game.mode !== "flight" && game.mode !== "warp")) return;
  const dpr = game.view?.dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, 92, 92);
  const scale = 82 / WORLD;
  const X = (x) => 5 + x * scale;
  const Y = (y) => 5 + y * scale;
  ctx.fillStyle = "rgba(126,224,214,0.85)";
  for (const body of game.bodies) {
    ctx.beginPath();
    ctx.arc(X(body.x), Y(body.y), Math.max(1.6, body.r * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffb15a";
  for (const beacon of game.beacons) ctx.fillRect(X(beacon.x) - 1.4, Y(beacon.y) - 1.4, 2.8, 2.8);
  ctx.fillStyle = "#ff6b8a";
  for (const pirate of game.pirates) {
    if (pirate.alive) ctx.fillRect(X(pirate.x) - 1.2, Y(pirate.y) - 1.2, 2.4, 2.4);
  }
  if (game.player) {
    ctx.fillStyle = "#efe9dc";
    ctx.beginPath();
    ctx.arc(X(game.player.x), Y(game.player.y), 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function resizeCanvas(canvas, mini, game) {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width || window.innerWidth));
  const h = Math.max(1, Math.round(vv?.height || window.innerHeight));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  if (mini) {
    mini.width = Math.round(92 * dpr);
    mini.height = Math.round(92 * dpr);
  }
  game.view = { w, h, dpr };
  vignette = null;
}
