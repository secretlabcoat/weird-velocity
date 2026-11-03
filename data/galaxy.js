// Star systems, commodities, and the chart. Names and descriptions live in text.js.

import { WORLD, hash } from "../util.js";
import copy from "./text.js";

export const GOODS = [
  { id: "starlight", base: 90 },
  { id: "regret", base: 130 },
  { id: "gravity", base: 240 },
  { id: "threats", base: 160 },
  { id: "honey", base: 100 },
  { id: "echoes", base: 110 },
  { id: "moss", base: 70 },
  { id: "numbers", base: 180 },
];

export const PIRATE_NAMES = copy.factions.pirateNames;
export const SOLO_NAMES = copy.factions.soloNames;
export const BARKS = copy.factions.barks;

const PRICE = {
  brine:    { starlight: 0.55, regret: 0.68, gravity: 1.35, threats: 1.25, honey: 1.15, echoes: 1.30, moss: 1.15, numbers: 1.60 },
  orchard:  { starlight: 1.50, regret: 1.20, gravity: 1.15, threats: 1.30, honey: 0.55, echoes: 0.58, moss: 1.25, numbers: 1.15 },
  courtesy: { starlight: 1.20, regret: 1.35, gravity: 1.25, threats: 0.55, honey: 1.20, echoes: 1.15, moss: 0.62, numbers: 1.30 },
  museum:   { starlight: 1.70, regret: 1.15, gravity: 0.58, threats: 1.30, honey: 1.45, echoes: 1.05, moss: 1.20, numbers: 1.35 },
  census:   { starlight: 1.25, regret: 1.55, gravity: 1.20, threats: 1.10, honey: 1.20, echoes: 1.35, moss: 0.60, numbers: 0.54 },
  hum:      { starlight: 1.15, regret: 0.60, gravity: 0.57, threats: 1.55, honey: 1.25, echoes: 1.40, moss: 1.15, numbers: 1.20 },
  parcel:   { starlight: 1.05, regret: 1.08, gravity: 1.35, threats: 0.82, honey: 0.95, echoes: 0.78, moss: 0.80, numbers: 1.00 },
};

export const SYSTEMS = [
  {
    id: "brine",
    mapX: 28, mapY: 70,
    accent: "#3ec6b8",
    nebula: ["rgba(30,150,140,0.55)", "rgba(14,70,110,0.5)", "rgba(210,140,60,0.35)"],
    links: ["orchard", "courtesy"],
    prices: PRICE.brine,
    bodies: [
      { id: "pickle", kind: "station", x: 2000, y: 1980, r: 42, look: "station" },
      { id: "wetmoon", kind: "planet", x: 1040, y: 1380, r: 84, look: "banded", ring: true },
    ],
    beacons: [
      { to: "orchard", x: 3280, y: 760 },
      { to: "courtesy", x: 700, y: 900 },
    ],
  },
  {
    id: "orchard",
    mapX: 72, mapY: 52,
    accent: "#8fce6a",
    nebula: ["rgba(90,160,60,0.5)", "rgba(40,80,30,0.45)", "rgba(190,160,80,0.35)"],
    links: ["brine", "census", "hum"],
    prices: PRICE.orchard,
    bodies: [
      { id: "trellis", kind: "station", x: 2000, y: 2000, r: 42, look: "station" },
      { id: "bark", kind: "planet", x: 2860, y: 2700, r: 96, look: "grove" },
    ],
    beacons: [
      { to: "brine", x: 720, y: 3180 },
      { to: "census", x: 3320, y: 820 },
      { to: "hum", x: 980, y: 640 },
    ],
  },
  {
    id: "courtesy",
    mapX: 18, mapY: 44,
    accent: "#cbb6ff",
    nebula: ["rgba(170,150,230,0.5)", "rgba(90,70,160,0.4)", "rgba(240,210,230,0.35)"],
    links: ["brine", "museum", "parcel"],
    prices: PRICE.courtesy,
    bodies: [
      { id: "remain", kind: "station", x: 1960, y: 2080, r: 42, look: "station" },
      { id: "thankyou", kind: "planet", x: 2780, y: 1280, r: 108, look: "bow", ring: true },
    ],
    beacons: [
      { to: "brine", x: 3240, y: 3240 },
      { to: "museum", x: 1880, y: 620 },
      { to: "parcel", x: 3300, y: 2860 },
    ],
  },
  {
    id: "museum",
    mapX: 24, mapY: 16,
    accent: "#f0a0b8",
    nebula: ["rgba(200,100,130,0.45)", "rgba(80,40,60,0.5)", "rgba(210,180,140,0.3)"],
    links: ["courtesy", "hum"],
    prices: PRICE.museum,
    bodies: [
      { id: "gallery", kind: "station", x: 1980, y: 1900, r: 44, look: "station" },
      { id: "exhibit", kind: "planet", x: 1160, y: 2580, r: 78, look: "plaque" },
    ],
    beacons: [
      { to: "courtesy", x: 680, y: 3280 },
      { to: "hum", x: 3360, y: 1560 },
    ],
  },
  {
    id: "census",
    mapX: 84, mapY: 18,
    accent: "#9fd4ff",
    nebula: ["rgba(120,190,240,0.45)", "rgba(40,70,110,0.5)", "rgba(230,236,245,0.28)"],
    links: ["orchard", "parcel"],
    prices: PRICE.census,
    bodies: [
      { id: "counting", kind: "station", x: 2060, y: 2000, r: 42, look: "station" },
      { id: "population", kind: "planet", x: 2700, y: 1180, r: 80, look: "census" },
    ],
    beacons: [
      { to: "orchard", x: 700, y: 3120 },
      { to: "parcel", x: 860, y: 2460 },
    ],
  },
  {
    id: "hum",
    mapX: 50, mapY: 28,
    accent: "#f0b45a",
    nebula: ["rgba(210,150,70,0.48)", "rgba(90,50,16,0.5)", "rgba(240,220,170,0.28)"],
    links: ["orchard", "museum", "parcel"],
    prices: PRICE.hum,
    bodies: [
      { id: "ear", kind: "station", x: 2000, y: 2140, r: 42, look: "station" },
      { id: "note", kind: "planet", x: 1280, y: 1240, r: 90, look: "note" },
    ],
    beacons: [
      { to: "orchard", x: 3280, y: 3120 },
      { to: "museum", x: 640, y: 1680 },
      { to: "parcel", x: 2200, y: 3360 },
    ],
  },
  {
    id: "parcel",
    mapX: 52, mapY: 78,
    accent: "#e7c8a0",
    nebula: ["rgba(190,160,120,0.42)", "rgba(110,70,40,0.45)", "rgba(80,170,160,0.3)"],
    links: ["courtesy", "census", "hum"],
    prices: PRICE.parcel,
    bodies: [
      { id: "lostmail", kind: "station", x: 1960, y: 2040, r: 42, look: "station" },
      { id: "envelope", kind: "planet", x: 3140, y: 1700, r: 72, look: "envelope" },
    ],
    beacons: [
      { to: "courtesy", x: 620, y: 1960 },
      { to: "census", x: 3380, y: 760 },
      { to: "hum", x: 1560, y: 640 },
    ],
  },
];

function applyWriting() {
  const bySys = Object.fromEntries(copy.systems.map((s) => [s.id, s]));
  for (const sys of SYSTEMS) {
    const written = bySys[sys.id];
    if (!written) throw new Error("Missing system text " + sys.id);
    sys.name = written.name;
    sys.short = written.short;
    sys.blurb = written.blurb;
    sys.specialty = written.specialty;
    const places = Object.fromEntries(written.places.map((p) => [p.id, p]));
    for (const body of sys.bodies) {
      const place = places[body.id];
      if (!place) throw new Error("Missing place text " + body.id);
      body.name = place.name;
      body.desc = place.desc;
    }
  }
  for (const good of GOODS) {
    const written = copy.goods.find((item) => item.id === good.id);
    if (!written) throw new Error("Missing good text " + good.id);
    good.name = written.name;
    good.about = written.about;
  }
}

applyWriting();

const byId = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));

export function system(id) {
  return byId[id];
}

export function bodyById(id) {
  for (const sys of SYSTEMS) {
    const body = sys.bodies.find((b) => b.id === id);
    if (body) return { system: sys, body };
  }
  return null;
}

export function route(fromId, toId) {
  if (fromId === toId) return [fromId];
  const q = [[fromId]];
  const seen = new Set([fromId]);
  while (q.length) {
    const path = q.shift();
    const here = path[path.length - 1];
    const links = system(here)?.links || [];
    for (const link of links) {
      if (seen.has(link)) continue;
      const next = path.concat(link);
      if (link === toId) return next;
      seen.add(link);
      q.push(next);
    }
  }
  return [fromId];
}

export function launchPose(body) {
  return { x: body.x, y: body.y + body.r + 100, angle: Math.PI };
}

export function auditGalaxy() {
  const ids = new Set();
  const bodies = new Set();
  const goodIds = GOODS.map((g) => g.id);
  if (SYSTEMS.length < 5) throw new Error("Need a handful of systems");
  for (const sys of SYSTEMS) {
    if (ids.has(sys.id)) throw new Error("Duplicate system " + sys.id);
    ids.add(sys.id);
    if (!sys.name || !sys.blurb || !sys.specialty) throw new Error("Missing copy " + sys.id);
    if (sys.mapX < 0 || sys.mapX > 100 || sys.mapY < 0 || sys.mapY > 100) {
      throw new Error("Map position " + sys.id);
    }
    for (const gid of goodIds) {
      const p = sys.prices[gid];
      if (typeof p !== "number" || p < 0.4 || p > 1.9) throw new Error("Price " + sys.id + " " + gid);
    }
    const beaconTos = sys.beacons.map((b) => b.to).sort();
    const links = [...sys.links].sort();
    if (beaconTos.join() !== links.join()) {
      throw new Error("Beacons/links mismatch " + sys.id);
    }
    for (const link of sys.links) {
      if (!byId[link]) throw new Error("Bad link " + sys.id + " -> " + link);
      if (!byId[link].links.includes(sys.id)) throw new Error("Asymmetric link " + sys.id + " / " + link);
    }
    const spots = [];
    for (const body of sys.bodies) {
      if (bodies.has(body.id)) throw new Error("Duplicate body " + body.id);
      bodies.add(body.id);
      if (body.x < 200 || body.y < 200 || body.x > WORLD - 200 || body.y > WORLD - 200) {
        throw new Error("Body off map " + body.id);
      }
      spots.push(body);
    }
    for (const beacon of sys.beacons) {
      if (beacon.x < 240 || beacon.y < 240 || beacon.x > WORLD - 240 || beacon.y > WORLD - 240) {
        throw new Error("Beacon off map " + sys.id + " " + beacon.to);
      }
      for (const body of spots) {
        const d = Math.hypot(body.x - beacon.x, body.y - beacon.y);
        if (d < body.r + 160) throw new Error("Beacon hits body " + body.id + " / " + beacon.to);
      }
      const pose = launchPose(sys.bodies.find((b) => b.kind === "station"));
      if (Math.hypot(pose.x - beacon.x, pose.y - beacon.y) < 220) {
        throw new Error("Beacon on the launch pad " + sys.id);
      }
    }
  }
  for (let i = 0; i < SYSTEMS.length; i++) {
    for (let j = i + 1; j < SYSTEMS.length; j++) {
      const a = SYSTEMS[i];
      const b = SYSTEMS[j];
      const d = Math.hypot(a.mapX - b.mapX, a.mapY - b.mapY);
      if (d < 18) throw new Error("Chart nodes overlap " + a.id + " " + b.id);
    }
  }
  // Touch hash so a bad import fails loudly in audit's module graph.
  if (hash("audit") === 0) throw new Error("hash");
}
