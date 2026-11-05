// Buy, sell, refuel, repair. Prices vary by system and a saved wobble.

import { GOODS, system } from "./data/galaxy.js";
import copy from "./data/text.js";
import { FUEL_PRICE, REPAIR_PRICE, hash } from "./util.js";

export function buyPrice(game, systemId, goodId) {
  const good = GOODS.find((g) => g.id === goodId);
  const mod = system(systemId).prices[goodId];
  const wobble = 0.94 + (hash(goodId, systemId, game.salt) % 13) / 100;
  return Math.max(1, Math.round(good.base * mod * wobble));
}

export function sellPrice(game, systemId, goodId) {
  return Math.max(1, Math.round(buyPrice(game, systemId, goodId) * 0.82));
}

export function cargoUsed(game) {
  let n = 0;
  for (const k of Object.keys(game.cargo)) n += game.cargo[k] || 0;
  for (const m of game.missions) if (m.type === "delivery") n += m.hold || 0;
  return n;
}

export function buyGood(game, goodId, qty) {
  const unit = buyPrice(game, game.systemId, goodId);
  const room = game.holdMax - cargoUsed(game);
  const afford = Math.floor(game.credits / unit);
  const n = Math.max(0, Math.min(qty, room, afford));
  if (n <= 0) {
    return { ok: false, reason: room <= 0 ? copy.messages.holdFull : copy.messages.noCredits };
  }
  game.credits -= unit * n;
  game.cargo[goodId] = (game.cargo[goodId] || 0) + n;
  game.stats.bought += n;
  return { ok: true, n, cost: unit * n };
}

export function sellGood(game, goodId, qty) {
  const have = game.cargo[goodId] || 0;
  const n = Math.max(0, Math.min(qty, have));
  if (n <= 0) return { ok: false, reason: copy.messages.notOwned };
  const unit = sellPrice(game, game.systemId, goodId);
  game.cargo[goodId] = have - n;
  if (game.cargo[goodId] <= 0) delete game.cargo[goodId];
  game.credits += unit * n;
  game.stats.sold += n;
  game.stats.earned += unit * n;
  return { ok: true, n, gain: unit * n };
}

export function buyFuel(game, amount) {
  const room = game.fuelMax - game.fuel;
  const afford = Math.floor(game.credits / FUEL_PRICE);
  const n = Math.max(0, Math.min(amount, room, afford));
  if (n <= 0) {
    return { ok: false, reason: room <= 0 ? copy.messages.tankFull : copy.messages.noCredits };
  }
  game.credits -= n * FUEL_PRICE;
  game.fuel += n;
  return { ok: true, n, cost: n * FUEL_PRICE };
}

export function buyRepair(game, amount) {
  const p = game.player;
  if (!p) return { ok: false, reason: copy.messages.noShip };
  const room = p.armorMax - p.armor;
  const afford = Math.floor(game.credits / REPAIR_PRICE);
  const n = Math.max(0, Math.min(amount, room, afford));
  if (n <= 0) {
    return { ok: false, reason: room <= 0 ? copy.messages.armorFull : copy.messages.noCredits };
  }
  game.credits -= n * REPAIR_PRICE;
  p.armor += n;
  return { ok: true, n, cost: n * REPAIR_PRICE };
}
