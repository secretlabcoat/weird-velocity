// Three contract types: bounty, delivery, errand.

import { GOODS, SYSTEMS, system, route } from "./data/galaxy.js";
import copy, { fill } from "./data/text.js";
import { buyPrice, cargoUsed } from "./trade.js";
import { hash } from "./util.js";
import { say } from "./state.js";
import { sfx } from "./audio.js";
import { persist } from "./save.js";

function stationsIn(systemId) {
  return system(systemId).bodies.filter((b) => b.kind === "station");
}

function neighborStations(systemId) {
  const out = [];
  for (const id of system(systemId).links) {
    for (const body of stationsIn(id)) out.push({ systemId: id, body });
  }
  return out;
}

function grant(game, mission) {
  game.credits += mission.reward;
  game.stats.earned += mission.reward;
  game.banner = { t: 4.2, text: fill(copy.missions.complete, { reward: mission.reward }) };
  say(game, game.banner.text);
  sfx("mission");
  persist(game);
}

function makeOffer(game, sys, body, slot) {
  game.serial = (game.serial || 1) + 1;
  const uid = "m" + game.serial;
  const n = hash(body.id, slot, game.salt);
  if (slot === 0) {
    const titles = copy.missions.bounty.titles;
    const need = 2;
    return {
      uid, type: "bounty", systemId: sys.id, need, have: 0,
      reward: 700,
      title: titles[n % titles.length],
      detail: fill(copy.missions.bounty.detail, {
        faction: copy.factions.chorus,
        system: sys.name,
        count: need,
      }),
    };
  }
  const neighbors = neighborStations(sys.id);
  const pick = neighbors[n % neighbors.length];
  if (slot === 1) {
    const labels = copy.missions.delivery.labels;
    const label = labels[n % labels.length];
    const hold = 4;
    return {
      uid, type: "delivery", hold, label,
      destId: pick.body.id,
      destSystem: pick.systemId,
      destName: pick.body.name,
      reward: 820,
      title: copy.missions.delivery.title,
      detail: fill(copy.missions.delivery.detail, {
        hold,
        label,
        dock: pick.body.name,
        system: system(pick.systemId).name,
      }),
    };
  }
  const good = GOODS[n % GOODS.length];
  const count = 3;
  const destPrice = buyPrice(game, pick.systemId, good.id);
  return {
    uid, type: "errand",
    goodId: good.id,
    goodName: good.name,
    count,
    destId: pick.body.id,
    destSystem: pick.systemId,
    destName: pick.body.name,
    reward: destPrice * count + 360,
    title: copy.missions.errand.title,
    detail: fill(copy.missions.errand.detail, {
      dock: pick.body.name,
      count,
      good: good.name,
    }),
  };
}

export function refreshBoards(game) {
  for (const sys of SYSTEMS) {
    for (const body of sys.bodies) {
      const slots = game.boards[body.id] || [null, null, null];
      for (let i = 0; i < 3; i++) {
        if (!slots[i]) slots[i] = makeOffer(game, sys, body, i);
      }
      game.boards[body.id] = slots;
    }
  }
}

export function acceptMission(game, stationId, slot) {
  const board = game.boards[stationId];
  const mission = board && board[slot];
  if (!mission) return { ok: false, reason: copy.messages.noteGone };
  if (game.missions.length >= 3) return { ok: false, reason: copy.messages.tooMany };
  if (mission.type === "delivery" && cargoUsed(game) + mission.hold > game.holdMax) {
    return { ok: false, reason: copy.messages.noHoldParcel };
  }
  board[slot] = null;
  game.missions.push(mission);
  say(game, fill(copy.messages.accepted, { title: mission.title }));
  sfx("ui");
  persist(game);
  game.uiRev++;
  return { ok: true };
}

export function abandonMission(game, uid) {
  const mission = game.missions.find((m) => m.uid === uid);
  if (!mission) return;
  game.missions = game.missions.filter((m) => m.uid !== uid);
  say(game, fill(copy.messages.abandoned, { title: mission.title }));
  persist(game);
  game.uiRev++;
}

export function onPirateKilled(game) {
  const done = [];
  for (const mission of game.missions) {
    if (mission.type === "bounty" && mission.systemId === game.systemId) {
      mission.have += 1;
      if (mission.have >= mission.need) done.push(mission);
    }
  }
  if (done.length) {
    game.missions = game.missions.filter((m) => !done.includes(m));
    for (const mission of done) grant(game, mission);
  } else {
    const bounty = game.missions.find((m) => m.type === "bounty" && m.systemId === game.systemId);
    if (bounty) say(game, fill(copy.messages.bountyCount, { have: bounty.have, need: bounty.need }));
  }
}

export function onDock(game) {
  const done = [];
  for (const mission of game.missions) {
    if (mission.type === "delivery" && mission.destId === game.dockId) done.push(mission);
    if (mission.type === "errand" && mission.destId === game.dockId) {
      const have = game.cargo[mission.goodId] || 0;
      if (have >= mission.count) {
        game.cargo[mission.goodId] = have - mission.count;
        if (game.cargo[mission.goodId] <= 0) delete game.cargo[mission.goodId];
        done.push(mission);
      }
    }
  }
  if (!done.length) return;
  game.missions = game.missions.filter((m) => !done.includes(m));
  for (const mission of done) grant(game, mission);
}

export function missionBlurb(game) {
  const mission = game.missions[0];
  if (!mission) return copy.hud.noContract;
  const destination = mission.type === "bounty"
    ? system(mission.systemId).name
    : mission.destName;
  return fill(copy.hud.contract, { job: mission.title, destination });
}

export function compassTarget(game) {
  const player = game.player;
  if (!player) return null;
  const mission = game.missions[0];
  if (mission) {
    if (mission.type === "bounty" && mission.systemId === game.systemId) {
      let best = null;
      let bestD = Infinity;
      for (const pirate of game.pirates) {
        if (!pirate.alive) continue;
        const d = Math.hypot(pirate.x - player.x, pirate.y - player.y);
        if (d < bestD) { bestD = d; best = pirate; }
      }
      if (best) return { x: best.x, y: best.y, label: copy.hud.chorusMark };
    }
    if ((mission.type === "delivery" || mission.type === "errand") && mission.destSystem === game.systemId) {
      const body = game.bodies.find((b) => b.id === mission.destId);
      if (body) return { x: body.x, y: body.y, label: body.name };
    }
    const destSys = mission.type === "bounty" ? mission.systemId : mission.destSystem;
    if (destSys && destSys !== game.systemId) {
      const hop = route(game.systemId, destSys)[1];
      const beacon = hop && game.beacons.find((b) => b.to === hop);
      if (beacon) return { x: beacon.x, y: beacon.y, label: fill(copy.hud.routeTo, { name: system(hop).short }) };
    }
  }
  if (game.navSystem && game.navSystem !== game.systemId) {
    const hop = route(game.systemId, game.navSystem)[1];
    const beacon = hop && game.beacons.find((b) => b.to === hop);
    if (beacon) return { x: beacon.x, y: beacon.y, label: fill(copy.hud.routeTo, { name: system(hop).short }) };
  }
  return null;
}
