// Flight simulation: steering, pirates, docking, and jumps.

import { WORLD, JUMP_FUEL, hash, rng, clamp, reduceMotion } from "./util.js";
import { system, bodyById, launchPose, PIRATE_NAMES, SOLO_NAMES, BARKS } from "./data/galaxy.js";
import { createPlayer, createGame, say } from "./state.js";
import { PLAYER_SPEC, PIRATE_SPEC, SOLO_SPEC, integrate, stickPilot, steerToward } from "./physics.js";
import { tryFire, updateBolts, ramPlayer } from "./combat.js";
import { refreshBoards, onDock } from "./missions.js";
import { burst, floater, pushParticle, updateFx } from "./fx.js";
import { sfx, setMuted } from "./audio.js";
import { persist } from "./save.js";
import copy from "./data/text.js";

function clampWorld(body) {
  const m = (body.radius || 20) + 16;
  if (body.x < m) { body.x = m; body.vx = Math.abs(body.vx) * 0.35; }
  if (body.y < m) { body.y = m; body.vy = Math.abs(body.vy) * 0.35; }
  if (body.x > WORLD - m) { body.x = WORLD - m; body.vx = -Math.abs(body.vx) * 0.35; }
  if (body.y > WORLD - m) { body.y = WORLD - m; body.vy = -Math.abs(body.vy) * 0.35; }
}

function solidBump(mover, solid) {
  const dx = mover.x - solid.x;
  const dy = mover.y - solid.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const min = mover.radius + solid.radius;
  if (d >= min) return;
  const nx = dx / d;
  const ny = dy / d;
  mover.x += nx * (min - d);
  mover.y += ny * (min - d);
  const vn = mover.vx * nx + mover.vy * ny;
  if (vn < 0) {
    mover.vx -= vn * nx * 1.35;
    mover.vy -= vn * ny * 1.35;
  }
}

function splitBump(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 0.001;
  const min = a.radius + b.radius;
  if (d >= min) return false;
  const nx = dx / d;
  const ny = dy / d;
  const push = (min - d) * 0.5;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  return true;
}

function blocked(game, x, y, pad) {
  if (game.player && Math.hypot(x - game.player.x, y - game.player.y) < pad) return true;
  for (const body of game.bodies) {
    if (Math.hypot(x - body.x, y - body.y) < body.radius + 160) return true;
  }
  for (const beacon of game.beacons) {
    if (Math.hypot(x - beacon.x, y - beacon.y) < 170) return true;
  }
  for (const rock of game.rocks) {
    if (Math.hypot(x - rock.x, y - rock.y) < rock.radius + 30) return true;
  }
  for (const pirate of game.pirates) {
    if (pirate.alive !== false && Math.hypot(x - pirate.x, y - pirate.y) < 110) return true;
  }
  return false;
}

function place(game, rand, prefer) {
  for (const pad of [prefer, 640, 280, 0]) {
    for (let i = 0; i < 26; i++) {
      const x = 340 + rand() * (WORLD - 680);
      const y = 340 + rand() * (WORLD - 680);
      if (!blocked(game, x, y, pad)) return { x, y };
    }
  }
  return { x: 520 + rand() * 400, y: 520 + rand() * 400 };
}

const DEFAULT_HOSTILES = 4;

function hostileCap(game) {
  const n = system(game.systemId).maxHostiles;
  return typeof n === "number" && n >= 0 ? n : DEFAULT_HOSTILES;
}

function spawnHostile(game, rand, index, solo) {
  const spot = place(game, rand, 1000);
  game.pirates.push(makePirate(game, spot.x, spot.y, solo, rand, index));
}

function fillHostiles(game, rand) {
  const cap = hostileCap(game);
  for (let i = game.pirates.length; i < cap; i++) {
    spawnHostile(game, rand, i, i === 0 && cap > 1);
  }
}

const DEBRIS = [
  { type: "mineral", kind: 0, shootable: true, hp: 44, yield: 2 },
  { type: "scrap", kind: 1, shootable: true, hp: 22, yield: 1 },
  { type: "cargo", kind: 2, shootable: false, hp: 0, yield: 0 },
];

function debrisName(type) {
  if (type === "scrap") return copy.debris.scrap;
  if (type === "cargo") return copy.debris.salvage;
  return copy.debris.asteroid;
}

function spawnDebris(game, rand) {
  for (let i = 0; i < 6; i++) {
    const spec = DEBRIS[i % DEBRIS.length];
    const spot = place(game, rand, 0);
    const radius = spec.type === "cargo" ? 18 : 16 + rand() * 12;
    game.rocks.push({
      x: spot.x, y: spot.y, radius,
      vx: (rand() - 0.5) * 18,
      vy: (rand() - 0.5) * 18,
      spin: rand() * 6.28,
      spinRate: (rand() - 0.5) * 0.5,
      kind: spec.kind,
      type: spec.type,
      name: debrisName(spec.type),
      shootable: spec.shootable,
      hp: spec.hp,
      yield: spec.yield,
      alive: true,
    });
  }
}

function makePirate(game, x, y, solo, rand, index) {
  const name = solo
    ? SOLO_NAMES[hash(game.systemId, "solo", index) % SOLO_NAMES.length]
    : PIRATE_NAMES[hash(game.systemId, "pirate", index) % PIRATE_NAMES.length];
  return {
    x, y,
    vx: (rand() - 0.5) * 16,
    vy: (rand() - 0.5) * 16,
    angle: rand() * Math.PI * 2,
    homeX: x,
    homeY: y,
    orbit: rand() * Math.PI * 2,
    radius: solo ? 16 : 14,
    shield: solo ? 48 : 28,
    shieldMax: solo ? 48 : 28,
    armor: solo ? 46 : 26,
    armorMax: solo ? 46 : 26,
    cool: rand() * 0.5,
    hurt: 0,
    flash: 0,
    ram: 0,
    alive: true,
    mood: "patrol",
    solo,
    name,
    barked: false,
    spec: solo ? SOLO_SPEC : PIRATE_SPEC,
    thrusting: 0,
  };
}

export function populate(game) {
  const sys = system(game.systemId);
  game.bodies = sys.bodies.map((b) => ({ ...b, radius: b.r, accent: sys.accent }));
  game.beacons = sys.beacons.map((b) => ({
    ...b,
    r: 24,
    accent: system(b.to).accent,
    name: system(b.to).short,
  }));
  game.bolts = [];
  game.particles = [];
  game.floaters = [];
  game.rocks = [];
  game.pirates = [];
  const rand = rng(hash(sys.id, "scatter"));
  spawnDebris(game, rand);
  if (game.mode === "title") return;
  fillHostiles(game, rand);
}

function driftRocks(game, dt) {
  for (const rock of game.rocks) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.spin += rock.spinRate * dt;
    clampWorld(rock);
  }
}

function updateNear(game) {
  const player = game.player;
  if (!player || game.mode !== "flight") {
    game.near = null;
    return;
  }
  let best = null;
  for (const body of game.bodies) {
    const d = Math.hypot(player.x - body.x, player.y - body.y);
    if (d < body.r + 130 && (!best || d < best.d)) {
      best = { d, kind: "dock", id: body.id, name: body.name };
    }
  }
  if (game.jumpLock <= 0) {
    for (const beacon of game.beacons) {
      const d = Math.hypot(player.x - beacon.x, player.y - beacon.y);
      if (d < 96 && (!best || d < best.d)) {
        best = { d, kind: "jump", id: beacon.to, to: beacon.to, name: beacon.name };
      }
    }
  }
  game.near = best
    ? { kind: best.kind, id: best.id, to: best.to, name: best.name }
    : null;
}

function updatePirate(game, pirate, dt) {
  if (!pirate.alive) return;
  pirate.cool -= dt;
  pirate.ram = Math.max(0, pirate.ram - dt);
  pirate.hurt = Math.max(0, pirate.hurt - dt);
  if (pirate.flash > 0) pirate.flash -= dt;
  if (pirate.hurt <= 0) pirate.shield = Math.min(pirate.shieldMax, pirate.shield + 6 * dt);

  const player = game.player;
  const d = Math.hypot(player.x - pirate.x, player.y - pirate.y);
  if (pirate.mood === "patrol" && player.alive && (d < (pirate.solo ? 720 : 460) || pirate.hurt > 0)) {
    pirate.mood = "hunt";
  }

  let thrust = 0;
  let brake = false;
  if (pirate.mood === "hunt" && player.alive) {
    const desired = Math.atan2(player.x - pirate.x, -(player.y - pirate.y));
    const err = steerToward(pirate, desired, pirate.spec.turnRate, dt);
    if (d > 180 && Math.abs(err) < 0.95) thrust = 1;
    if (d < 140) brake = true;
    if (d < 490 && Math.abs(err) < 0.3 && tryFire(game, pirate, false)) {
      sfx("enemy");
      if (!pirate.barked) {
        pirate.barked = true;
        floater(game, pirate.x, pirate.y - 22, BARKS[hash(pirate.name) % BARKS.length], "#ff8fb8");
      }
    }
  } else {
    pirate.orbit += dt * 0.4;
    const tx = pirate.homeX + Math.cos(pirate.orbit) * 150;
    const ty = pirate.homeY + Math.sin(pirate.orbit) * 110;
    steerToward(pirate, Math.atan2(tx - pirate.x, -(ty - pirate.y)), pirate.spec.turnRate, dt);
    thrust = 0.5;
  }
  pirate.thrusting = thrust;
  integrate(pirate, pirate.spec, thrust, 0, brake, dt);
  clampWorld(pirate);
}

function exhaust(game, player, thrust, dt) {
  if (thrust <= 0.2) {
    player.exhaust = 0;
    return;
  }
  player.exhaust = (player.exhaust || 0) + dt;
  const fx = Math.sin(player.angle);
  const fy = -Math.cos(player.angle);
  let guard = 0;
  while (player.exhaust > 0.028 && guard++ < 4) {
    player.exhaust -= 0.028;
    pushParticle(game, {
      x: player.x - fx * 14,
      y: player.y - fy * 14,
      vx: -fx * 80 + (Math.random() - 0.5) * 28 + player.vx * 0.15,
      vy: -fy * 80 + (Math.random() - 0.5) * 28 + player.vy * 0.15,
      life: 0.26,
      max: 0.26,
      size: 2.5,
      color: "#ffb15a",
    });
  }
}

export function openDock(game, id) {
  const body = game.bodies.find((b) => b.id === id);
  if (!body) return;
  game.dockId = id;
  game.lastDockId = id;
  if (!game.dockTab) game.dockTab = "trade";
  if (game.player) {
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.shield = game.player.shieldMax;
  }
  onDock(game);
  game.mode = "dock";
  game.uiRev++;
  sfx("dock");
  persist(game);
}

export function launch(game) {
  const found = bodyById(game.dockId || game.lastDockId) || bodyById("pickle");
  const pose = launchPose(found.body);
  if (!game.player) game.player = createPlayer(pose.x, pose.y, pose.angle);
  if (game.systemId !== found.system.id) {
    game.systemId = found.system.id;
    game.mode = "flight";
    populate(game);
  }
  game.player.x = pose.x;
  game.player.y = pose.y;
  game.player.vx = Math.sin(pose.angle) * 28;
  game.player.vy = -Math.cos(pose.angle) * 28;
  game.player.angle = pose.angle;
  game.player.alive = true;
  game.player.invuln = 1.2;
  game.systemId = found.system.id;
  game.lastDockId = found.body.id;
  game.mode = "flight";
  if (!game.pirates.length) fillHostiles(game, rng(hash(game.systemId, "late")));
  game.snap = true;
  game.uiRev++;
  updateNear(game);
  persist(game);
}

export function openMap(game, ret) {
  game.mapReturn = ret === "dock" ? "dock" : "flight";
  game.mapFocus = game.systemId;
  game.mode = "map";
  game.uiRev++;
}

export function closeMap(game) {
  game.mode = game.mapReturn === "dock" ? "dock" : "flight";
  game.uiRev++;
  if (game.mode === "flight") updateNear(game);
}

export function beginJump(game, toId) {
  const here = system(game.systemId);
  if (!here.links.includes(toId)) return;
  if (game.fuel < JUMP_FUEL) {
    say(game, copy.messages.lowFuel);
    sfx("no");
    return;
  }
  game.warp = { t: 0, to: toId, from: game.systemId, switched: false };
  game.mode = "warp";
  game.near = null;
  game.uiRev++;
  sfx("jump");
}

function arrive(game, toId, fromId) {
  game.fuel = Math.max(0, game.fuel - JUMP_FUEL);
  const raw = system(toId).beacons.find((b) => b.to === fromId);
  const player = game.player;
  if (raw) {
    const dx = WORLD / 2 - raw.x;
    const dy = WORLD / 2 - raw.y;
    const d = Math.hypot(dx, dy) || 1;
    player.x = raw.x + (dx / d) * 180;
    player.y = raw.y + (dy / d) * 180;
    player.vx = (dx / d) * 40;
    player.vy = (dy / d) * 40;
    player.angle = Math.atan2(dx, -dy);
  }
  player.invuln = 1.6;
  player.alive = true;
  game.systemId = toId;
  if (!game.visited.includes(toId)) game.visited.push(toId);
  game.stats.jumps += 1;
  game.marketTrips = (game.marketTrips || 0) + 1;
  game.mode = "warp";
  populate(game);
  game.jumpLock = 1.5;
  game.snap = true;
  if (game.marketTrips % 3 === 0) game.salt += 1;
  refreshBoards(game);
  updateNear(game);
}

function stepWarp(game, dt) {
  const warp = game.warp;
  if (!warp) {
    game.mode = "flight";
    return;
  }
  warp.t += dt;
  if (!warp.switched && warp.t >= 0.42) {
    arrive(game, warp.to, warp.from);
    warp.switched = true;
  }
  if (warp.t >= 1.05) {
    game.mode = "flight";
    game.warp = null;
    game.uiRev++;
    updateNear(game);
    persist(game);
  }
}

export function bootTitle(game) {
  game.mode = "title";
  game.systemId = "brine";
  game.player = null;
  populate(game);
  game.snap = true;
}

export function startNew(game, names = {}) {
  const view = game.view;
  const mute = game.mute;
  Object.assign(game, createGame());
  game.shipName = names.shipName || copy.ship.name;
  game.pilotName = names.pilotName || copy.pilot.name;
  game.view = view;
  game.mute = mute;
  game.hasSave = true;
  game.credits = 680;
  game.cargo = { starlight: 6 };
  game.visited = ["brine"];
  game.lastDockId = "pickle";
  game.systemId = "brine";
  game.mode = "flight";
  const pose = launchPose(bodyById("pickle").body);
  game.player = createPlayer(pose.x, pose.y, pose.angle);
  game.player.invuln = 2.4;
  populate(game);
  refreshBoards(game);
  game.snap = true;
  game.uiRev++;
  updateNear(game);
  setMuted(game.mute);
  persist(game);
}

export function restore(game, data) {
  const view = game.view;
  game.shipName = data.shipName || copy.ship.name;
  game.pilotName = data.pilotName || copy.pilot.name;
  game.credits = data.credits | 0;
  game.cargo = { ...(data.cargo || {}) };
  game.fuel = clamp(data.fuel ?? 100, 0, game.fuelMax);
  game.salt = data.salt || 4;
  game.serial = data.serial || 1;
  game.missions = JSON.parse(JSON.stringify(data.missions || []));
  game.boards = JSON.parse(JSON.stringify(data.boards || {}));
  game.visited = data.visited?.length ? [...data.visited] : ["brine"];
  game.log = Array.isArray(data.log) ? data.log.slice(0, 5) : [];
  game.lastDockId = data.lastDockId || "pickle";
  game.navSystem = data.navSystem || null;
  game.dockId = data.dockId || game.lastDockId;
  game.mute = !!data.mute;
  game.stats = {
    kills: 0, jumps: 0, earned: 0, bought: 0, sold: 0,
    ...(data.stats || {}),
  };
  game.marketTrips = data.marketTrips || 0;
  game.systemId = system(data.systemId) ? data.systemId : "brine";
  game.player = createPlayer(data.x || 2000, data.y || 2200, data.angle || Math.PI);
  game.player.vx = data.vx || 0;
  game.player.vy = data.vy || 0;
  game.player.shield = clamp(data.shield ?? 84, 0, game.player.shieldMax);
  game.player.armor = clamp(data.armor ?? 72, 8, game.player.armorMax);
  game.player.invuln = 1.5;
  game.mode = data.mode === "dock" && bodyById(game.dockId) ? "dock" : "flight";
  game.view = view;
  game.hasSave = true;
  populate(game);
  if (!game.boards[game.lastDockId]) refreshBoards(game);
  game.snap = true;
  game.uiRev++;
  setMuted(game.mute);
  updateNear(game);
}

export function respawn(game) {
  const loss = Math.min(game.credits, Math.floor(game.credits * 0.1));
  game.credits -= loss;
  const found = bodyById(game.lastDockId) || bodyById("pickle");
  const pose = launchPose(found.body);
  game.systemId = found.system.id;
  game.lastDockId = found.body.id;
  game.player.x = pose.x;
  game.player.y = pose.y;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.angle = pose.angle;
  game.player.alive = true;
  game.player.armor = Math.max(36, Math.round(game.player.armorMax * 0.55));
  game.player.shield = game.player.shieldMax;
  game.player.invuln = 2.6;
  game.player.hurt = 0;
  game.mode = "flight";
  populate(game);
  game.snap = true;
  game.uiRev++;
  updateNear(game);
  persist(game);
}

export function step(game, input, dt) {
  game.time += dt;
  updateFx(game, dt);
  if (reduceMotion()) game.cam.shake = 0;
  else game.cam.shake *= Math.exp(-3.4 * dt);

  if (input.justClose && game.mode === "map") {
    closeMap(game);
    return;
  }
  if (input.justMap && (game.mode === "map" || game.mode === "flight" || game.mode === "dock")) {
    if (game.mode === "map") closeMap(game);
    else openMap(game, game.mode === "dock" ? "dock" : "flight");
    return;
  }
  if (game.mode === "warp") {
    stepWarp(game, dt);
    return;
  }
  if (game.mode === "title") {
    driftRocks(game, dt);
    return;
  }
  if (game.mode !== "flight") return;

  const player = game.player;
  if (!player || !player.alive) return;

  player.cool -= dt;
  player.invuln = Math.max(0, player.invuln - dt);
  player.hurt = Math.max(0, player.hurt - dt);
  if (player.flash > 0) player.flash -= dt;
  if (player.hurt <= 0) player.shield = Math.min(player.shieldMax, player.shield + 16 * dt);
  game.jumpLock = Math.max(0, game.jumpLock - dt);

  let thrust = input.thrust;
  let turn = input.turn;
  if (input.joy && input.stickMag > 0.12) {
    const stick = stickPilot(player.angle, input.stickAng, input.stickMag);
    thrust = stick.thrust;
    turn = stick.turn;
  }
  player.thrusting = thrust;
  integrate(player, PLAYER_SPEC, thrust, turn, input.brake, dt);
  clampWorld(player);
  for (const body of game.bodies) solidBump(player, body);
  for (const rock of game.rocks) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.spin += rock.spinRate * dt;
    clampWorld(rock);
    solidBump(player, rock);
  }
  exhaust(game, player, thrust, dt);

  if ((input.fire || input.fireLatch) && tryFire(game, player, true)) sfx("shot");

  updateNear(game);
  if (input.justAct && game.near) {
    if (game.near.kind === "dock") openDock(game, game.near.id);
    else beginJump(game, game.near.to);
    if (game.mode !== "flight") return;
  }

  for (const pirate of game.pirates) updatePirate(game, pirate, dt);
  updateBolts(game, dt);
  if (game.mode !== "flight") return;

  for (const pirate of game.pirates) {
    if (!pirate.alive) continue;
    for (const body of game.bodies) solidBump(pirate, body);
    if (splitBump(player, pirate)) ramPlayer(game, pirate);
    if (game.mode !== "flight") return;
  }
  for (let i = 0; i < game.pirates.length; i++) {
    for (let j = i + 1; j < game.pirates.length; j++) {
      if (game.pirates[i].alive && game.pirates[j].alive) splitBump(game.pirates[i], game.pirates[j]);
    }
  }

  const before = game.pirates.length;
  game.pirates = game.pirates.filter((p) => p.alive);
  game.rocks = game.rocks.filter((rock) => rock.alive !== false);
  const cap = hostileCap(game);
  if (game.pirates.length < cap) {
    if (game.pirates.length < before) game.respawnIn = Math.min(game.respawnIn, 16);
    game.respawnIn -= dt;
    if (game.respawnIn <= 0) {
      const rand = rng(hash(game.systemId, game.time, game.stats.kills));
      spawnHostile(game, rand, game.stats.kills + 3, false);
      game.respawnIn = 18;
    }
  } else {
    game.respawnIn = 12;
  }
}
