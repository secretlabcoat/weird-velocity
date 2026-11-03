// Bolts, shields, armor, and the Rude Chorus falling apart.

import { GOODS } from "./data/galaxy.js";
import { burst, floater } from "./fx.js";
import { onPirateKilled } from "./missions.js";
import { sfx } from "./audio.js";
import { cargoUsed } from "./trade.js";

function swept(bolt, target) {
  const dx = bolt.x - bolt.px;
  const dy = bolt.y - bolt.py;
  const fx = bolt.px - target.x;
  const fy = bolt.py - target.y;
  const a = dx * dx + dy * dy || 1;
  let t = -(fx * dx + fy * dy) / a;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const px = bolt.px + dx * t;
  const py = bolt.py + dy * t;
  const r = target.radius + bolt.r;
  return (px - target.x) ** 2 + (py - target.y) ** 2 <= r * r;
}

export function tryFire(game, owner, friendly) {
  if (!owner.alive || owner.cool > 0) return false;
  owner.cool = friendly ? 0.22 : (owner.solo ? 0.7 : 0.92);
  const fx = Math.sin(owner.angle);
  const fy = -Math.cos(owner.angle);
  const speed = friendly ? 640 : 450;
  const nose = owner.radius + 6;
  const x = owner.x + fx * nose;
  const y = owner.y + fy * nose;
  game.bolts.push({
    x, y, px: x, py: y,
    vx: fx * speed + owner.vx * 0.2,
    vy: fy * speed + owner.vy * 0.2,
    life: friendly ? 0.7 : 0.85,
    dmg: friendly ? 22 : (owner.solo ? 11 : 8),
    friendly,
    r: 3.5,
    color: friendly ? "#ff3333" : "#ff5555"
  });
  return true;
}

function hurtShip(ship, dmg) {
  ship.hurt = 2.4;
  ship.flash = 0.14;
  let rest = dmg;
  if (ship.shield > 0) {
    const absorbed = Math.min(ship.shield, rest);
    ship.shield -= absorbed;
    rest -= absorbed;
  }
  if (rest > 0) ship.armor -= rest;
  return ship.armor <= 0;
}

export function damagePlayer(game, dmg) {
  const player = game.player;
  if (!player || !player.alive || player.invuln > 0) return false;
  const dead = hurtShip(player, dmg);
  game.cam.shake = Math.min(10, game.cam.shake + 3.2);
  sfx("hit");
  if (dead) {
    player.armor = 0;
    player.alive = false;
    burst(game, player.x, player.y, "#ffb15a", 24, 180);
    game.mode = "dead";
    game.uiRev++;
    sfx("boom");
    return true;
  }
  return false;
}

function damagePirate(game, pirate, dmg) {
  if (!pirate.alive) return;
  pirate.mood = "hunt";
  const dead = hurtShip(pirate, dmg);
  burst(game, pirate.x, pirate.y, "#ff8fb8", 6, 90);
  if (!dead) return;
  pirate.alive = false;
  const pay = pirate.solo ? 100 + Math.floor(Math.random() * 40) : 45 + Math.floor(Math.random() * 40);
  game.credits += pay;
  game.stats.kills += 1;
  floater(game, pirate.x, pirate.y, "+" + pay + " cr", "#ffb15a");
  if (Math.random() < 0.5 && cargoUsed(game) < game.holdMax) {
    const good = GOODS[Math.floor(Math.random() * GOODS.length)];
    game.cargo[good.id] = (game.cargo[good.id] || 0) + 1;
    floater(game, pirate.x, pirate.y - 18, good.name, "#b6f2a2");
  }
  burst(game, pirate.x, pirate.y, "#ffd0dc", 18, 150);
  sfx("boom");
  onPirateKilled(game);
}

function hitBody(game, bolt) {
  for (const body of game.bodies) {
    if (Math.hypot(bolt.x - body.x, bolt.y - body.y) < body.r) return true;
  }
  return false;
}

export function updateBolts(game, dt) {
  const live = [];
  for (const bolt of game.bolts) {
    bolt.px = bolt.x;
    bolt.py = bolt.y;
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    if (bolt.life <= 0) continue;
    if (hitBody(game, bolt)) {
      burst(game, bolt.x, bolt.y, "#efe9dc", 4, 60);
      continue;
    }
    if (bolt.friendly) {
      let hit = null;
      for (const pirate of game.pirates) {
        if (pirate.alive && swept(bolt, pirate)) { hit = pirate; break; }
      }
      if (hit) {
        damagePirate(game, hit, bolt.dmg);
        if (game.mode !== "flight") return;
        continue;
      }
    } else if (game.player?.alive && swept(bolt, game.player)) {
      damagePlayer(game, bolt.dmg);
      if (game.mode !== "flight") return;
      continue;
    }
    live.push(bolt);
  }
  game.bolts = live;
}

export function ramPlayer(game, pirate) {
  if (pirate.ram > 0 || !game.player.alive) return;
  pirate.ram = 0.85;
  damagePlayer(game, 12);
  if (game.mode !== "flight") return;
  damagePirate(game, pirate, 10);
}
