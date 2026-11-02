// Live game object. Mutated in place so modules share one voyage.

import { FUEL_MAX, HOLD_MAX } from "./util.js";

export function createPlayer(x, y, angle) {
  return {
    x, y, vx: 0, vy: 0, angle,
    radius: 15,
    shield: 84,
    shieldMax: 84,
    armor: 72,
    armorMax: 72,
    cool: 0,
    hurt: 0,
    flash: 0,
    invuln: 0,
    alive: true,
    exhaust: 0,
  };
}

export function createGame() {
  return {
    mode: "title",
    time: 0,
    uiRev: 0,
    dockTab: "trade",
    mapFocus: "brine",
    mapReturn: "flight",
    systemId: "brine",
    navSystem: null,
    dockId: null,
    lastDockId: "pickle",
    credits: 680,
    cargo: {},
    fuel: FUEL_MAX,
    fuelMax: FUEL_MAX,
    holdMax: HOLD_MAX,
    salt: 4,
    serial: 1,
    missions: [],
    boards: {},
    visited: [],
    log: [],
    banner: null,
    particles: [],
    floaters: [],
    bolts: [],
    pirates: [],
    rocks: [],
    bodies: [],
    beacons: [],
    player: null,
    cam: { x: 0, y: 0, shake: 0 },
    snap: true,
    near: null,
    mute: false,
    stats: { kills: 0, jumps: 0, earned: 0, bought: 0, sold: 0 },
    warp: null,
    jumpLock: 0,
    respawnIn: 10,
    marketTrips: 0,
    view: { w: 390, h: 844, dpr: 1 },
  };
}

export function say(game, text) {
  game.log.unshift(text);
  if (game.log.length > 5) game.log.length = 5;
}
