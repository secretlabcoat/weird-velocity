// localStorage voyage. One key, one version, plain JSON.

import { bodyById, launchPose } from "./data/galaxy.js";

const KEY = "weird-velocity-v1";

export function snapshot(game) {
  const player = game.player;
  let pose = player && player.alive
    ? { x: player.x, y: player.y, vx: player.vx, vy: player.vy, angle: player.angle, shield: player.shield, armor: player.armor }
    : null;
  let systemId = game.systemId;
  if (!pose) {
    const found = bodyById(game.lastDockId) || bodyById("pickle");
    const pad = launchPose(found.body);
    pose = { x: pad.x, y: pad.y, vx: 0, vy: 0, angle: pad.angle, shield: 84, armor: 40 };
    systemId = found.system.id;
  }
  if (pose.armor < 1) pose.armor = 40;
  return {
    version: 1,
    credits: game.credits,
    cargo: game.cargo,
    fuel: game.fuel,
    salt: game.salt,
    serial: game.serial || 1,
    missions: game.missions,
    boards: game.boards,
    visited: game.visited,
    log: game.log.slice(0, 4),
    lastDockId: game.lastDockId,
    systemId,
    navSystem: game.navSystem,
    dockId: game.dockId,
    mode: game.mode === "dock" ? "dock" : "flight",
    mute: !!game.mute,
    stats: game.stats,
    marketTrips: game.marketTrips || 0,
    ...pose,
  };
}

export function persist(game) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(snapshot(game)));
  } catch {
    // Private mode or a full disk. The voyage continues unsaved.
  }
}

export function readSave() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || typeof data.credits !== "number" || !data.systemId) return null;
    return data;
  } catch {
    return null;
  }
}

export function eraseSave() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
