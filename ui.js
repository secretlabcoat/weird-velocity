// DOM screens: title, dock, chart, death. The space view stays on the canvas.

import { GOODS, SYSTEMS, system, route } from "./data/galaxy.js";
import { buyPrice, sellPrice, cargoUsed, buyGood, sellGood, buyFuel, buyRepair } from "./trade.js";
import { acceptMission, abandonMission, missionBlurb } from "./missions.js";
import { startNew, restore, launch, respawn, openMap, closeMap } from "./sim.js";
import { readSave, eraseSave, persist } from "./save.js";
import { say } from "./state.js";
import { setMuted, sfx } from "./audio.js";
import { JUMP_FUEL, FUEL_PRICE, REPAIR_PRICE, esc } from "./util.js";

const overlay = () => document.getElementById("overlay");

function rememberScroll(game) {
  const scroller = document.querySelector("#overlay .scroll");
  if (scroller) game._scroll = scroller.scrollTop;
}

function text(el, value) {
  if (el && el.textContent !== value) el.textContent = value;
}

function titleHtml(game) {
  const saved = !!game.hasSave;
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">a pocket cosmos</p>
      <h1>Weird<br>Velocity</h1>
      <p class="tag">You fly a ship named Probably. Trade odd cargo. Apologize with lasers.</p>
    </div>
    <div class="body scroll">
      <ul class="help">
        <li>Drag the stick, or use WASD. You keep your drift.</li>
        <li>Stop brakes. Fire shoots, and holding it is fine.</li>
        <li>Land and Jump appear when you are close.</li>
        <li>The chart plots a course. Beacons do the leaving.</li>
      </ul>
    </div>
    <div class="foot col">
      <button type="button" class="primary" data-act="new">New voyage</button>
      ${saved ? `<button type="button" data-act="continue">Continue</button>` : ""}
      ${saved ? `<button type="button" class="texty" data-act="erase">Erase saved voyage</button>` : ""}
    </div>
  </div>`;
}

function goodsHtml(game) {
  let html = `<p class="hold">Hold ${cargoUsed(game)} / ${game.holdMax} · ${game.credits.toLocaleString("en-US")} cr</p>`;
  for (const mission of game.missions) {
    if (mission.type === "delivery") {
      html += `<p class="contract">Contract cargo: ${esc(mission.label)} (${mission.hold}) → ${esc(mission.destName)}</p>`;
    }
  }
  for (const good of GOODS) {
    const buy = buyPrice(game, game.systemId, good.id);
    const sell = sellPrice(game, game.systemId, good.id);
    const ratio = buy / good.base;
    const mood = ratio < 0.88 ? "cheap" : ratio > 1.22 ? "steep" : "fair";
    const have = game.cargo[good.id] || 0;
    html += `<div class="good">
      <div class="name">${esc(good.name)}</div>
      <div class="meta"><span class="tag ${mood}">${mood}</span> · buy ${buy} · sell ${sell} · you ${have}</div>
      <div class="btns">
        <button type="button" data-act="buy" data-good="${good.id}" data-n="1">Buy 1</button>
        <button type="button" data-act="buy" data-good="${good.id}" data-n="5">Buy 5</button>
        <button type="button" data-act="sell" data-good="${good.id}" data-n="1" ${have ? "" : "disabled"}>Sell 1</button>
        <button type="button" data-act="sell" data-good="${good.id}" data-n="5" ${have ? "" : "disabled"}>Sell 5</button>
      </div>
    </div>`;
  }
  return html;
}

function progress(game, mission) {
  if (mission.type === "bounty") return `${mission.have}/${mission.need} in ${system(mission.systemId).name}`;
  if (mission.type === "errand") {
    return `${game.cargo[mission.goodId] || 0}/${mission.count} ${mission.goodName} → ${mission.destName}`;
  }
  return `${mission.hold} hold → ${mission.destName}`;
}

function blockReason(game, mission) {
  if (game.missions.length >= 3) return "Three contracts is enough worry.";
  if (mission.type === "delivery" && cargoUsed(game) + mission.hold > game.holdMax) return "Not enough hold.";
  return "";
}

function jobsHtml(game) {
  let html = `<h3>Yours</h3>`;
  if (!game.missions.length) html += `<p class="dim">No active contracts. The chorus is delighted.</p>`;
  for (const mission of game.missions) {
    html += `<article class="job">
      <h3>${esc(mission.title)}</h3>
      <p>${esc(mission.detail)}</p>
      <p class="meta">${esc(progress(game, mission))} · ${mission.reward} cr</p>
      <button type="button" data-act="abandon" data-uid="${esc(mission.uid)}">Abandon</button>
    </article>`;
  }
  html += `<h3>Board</h3>`;
  const slots = game.boards[game.dockId] || [];
  let shown = 0;
  slots.forEach((mission, index) => {
    if (!mission) return;
    shown += 1;
    const reason = blockReason(game, mission);
    html += `<article class="job">
      <h3>${esc(mission.title)}</h3>
      <p>${esc(mission.detail)}</p>
      <p class="meta">${mission.reward} cr</p>
      <button type="button" data-act="accept" data-slot="${index}" ${reason ? "disabled" : ""}>Accept</button>
      ${reason ? `<p class="dim">${esc(reason)}</p>` : ""}
    </article>`;
  });
  if (!shown) html += `<p class="dim">The board is thinking. Jump somewhere and it will try again.</p>`;
  return html;
}

function yardHtml(game) {
  const fuelRoom = game.fuelMax - game.fuel;
  const fuelGet = Math.min(fuelRoom, Math.floor(game.credits / FUEL_PRICE));
  const armorRoom = game.player.armorMax - game.player.armor;
  const armorGet = Math.min(armorRoom, Math.floor(game.credits / REPAIR_PRICE));
  const kind = game.bodies.find((b) => b.id === game.dockId)?.kind;
  return `<p>Probably has one sincere engine and several decorative ones. The Apology Beam says excuse me at a frequency that stings.</p>
    <p class="meta">Fuel ${Math.ceil(game.fuel)}/${game.fuelMax} · ${FUEL_PRICE} cr each. Fuel is for leaving, not for flying.</p>
    <div class="btns">
      <button type="button" data-act="fuel" data-n="${fuelGet}" ${fuelGet > 0 ? "" : "disabled"}>Fill · ${fuelGet * FUEL_PRICE} cr</button>
      <button type="button" data-act="fuel" data-n="10" ${fuelRoom > 0 ? "" : "disabled"}>+10 fuel</button>
    </div>
    <p class="meta">Armor ${Math.ceil(game.player.armor)}/${game.player.armorMax} · ${REPAIR_PRICE} cr each</p>
    <div class="btns">
      <button type="button" data-act="repair" data-n="${armorGet}" ${armorGet > 0 ? "" : "disabled"}>Repair · ${armorGet * REPAIR_PRICE} cr</button>
      <button type="button" data-act="repair" data-n="10" ${armorRoom > 0 ? "" : "disabled"}>+10 armor</button>
    </div>
    <p class="dim">${kind === "planet" ? "Repairs are a ladder and a strong opinion." : "A hose, a stamp, and someone who has seen worse hulls."}</p>`;
}

function dockHtml(game) {
  const body = game.bodies.find((b) => b.id === game.dockId);
  const sys = system(game.systemId);
  const tab = game.dockTab || "trade";
  const bodyHtml = tab === "jobs" ? jobsHtml(game) : tab === "yard" ? yardHtml(game) : goodsHtml(game);
  const note = game.log[0] ? `<p class="note">${esc(game.log[0])}</p>` : "";
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">${esc(sys.name)}</p>
      <h2>${esc(body ? body.name : "Dock")}</h2>
      <p>${esc(body ? body.desc : "")}</p>
      <p class="specialty">${esc(sys.specialty)}</p>
      ${note}
    </div>
    <div class="tabs">
      <button type="button" data-act="tab" data-tab="trade" class="${tab === "trade" ? "on" : ""}">Trade</button>
      <button type="button" data-act="tab" data-tab="jobs" class="${tab === "jobs" ? "on" : ""}">Missions</button>
      <button type="button" data-act="tab" data-tab="yard" class="${tab === "yard" ? "on" : ""}">Yard</button>
    </div>
    <div class="body scroll">${bodyHtml}</div>
    <div class="foot">
      <button type="button" data-act="open-map">Chart</button>
      <button type="button" class="primary" data-act="launch">Launch</button>
    </div>
  </div>`;
}

function mapHtml(game) {
  const focusId = game.mapFocus || game.systemId;
  const focus = system(focusId);
  const here = focusId === game.systemId;
  const plotted = game.navSystem === focusId && !here;
  const path = route(game.systemId, focusId).map((id) => system(id).short).join(" → ");
  let lines = "";
  const seen = new Set();
  for (const sys of SYSTEMS) {
    for (const link of sys.links) {
      const key = [sys.id, link].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      const other = system(link);
      const hot = sys.id === game.systemId || link === game.systemId;
      lines += `<line x1="${sys.mapX}" y1="${sys.mapY}" x2="${other.mapX}" y2="${other.mapY}" class="${hot ? "hot" : ""}"/>`;
    }
  }
  const nodes = SYSTEMS.map((sys) => {
    const cls = [
      "node",
      game.visited.includes(sys.id) ? "seen" : "",
      sys.id === game.systemId ? "here" : "",
      sys.id === focusId ? "focus" : "",
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" style="left:${sys.mapX}%;top:${sys.mapY}%" data-act="pick-sys" data-sys="${sys.id}" aria-label="${esc(sys.name)}"></button>`;
  }).join("");
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">Soft Customs chart</p>
      <h2>${esc(focus.name)}</h2>
      <p>${esc(focus.blurb)}</p>
      <p class="specialty">${esc(focus.specialty)}</p>
    </div>
    <div class="body scroll">
      <div class="chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        ${nodes}
      </div>
      <p class="meta">${here ? "You are already bothering this system." : "Route: " + esc(path)}</p>
      <p class="meta">${here ? "" : `Next beacon costs ${JUMP_FUEL} fuel. You have ${Math.floor(game.fuel)}.`}</p>
      ${plotted ? `<p class="note">Course plotted. Follow the amber arrow.</p>` : ""}
    </div>
    <div class="foot">
      ${here ? "" : `<button type="button" class="primary" data-act="plot" data-sys="${focus.id}">Plot course</button>`}
      <button type="button" data-act="close-map">${game.mapReturn === "dock" ? "Back to dock" : "Back to ship"}</button>
    </div>
  </div>`;
}

function deadHtml() {
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">incident</p>
      <h2>Probably has become a statistic.</h2>
      <p>The Rude Chorus will deny everything. Your cargo is still in the argument. A little armor is loaned back, and ten percent of your credits files the paperwork.</p>
    </div>
    <div class="foot">
      <button type="button" class="primary" data-act="respawn">File an appeal</button>
    </div>
  </div>`;
}

function renderOverlay(game) {
  const root = overlay();
  root.className = "";
  if (game.mode === "flight" || game.mode === "warp") {
    root.innerHTML = "";
    return;
  }
  root.classList.add("show", game.mode);
  if (game.mode === "title") root.innerHTML = titleHtml(game);
  else if (game.mode === "dock") root.innerHTML = dockHtml(game);
  else if (game.mode === "map") root.innerHTML = mapHtml(game);
  else if (game.mode === "dead") root.innerHTML = deadHtml();
  const scroller = root.querySelector(".scroll");
  if (scroller && game._scroll) scroller.scrollTop = game._scroll;
}

function afterTrade(game, result, label) {
  if (!result.ok) say(game, result.reason);
  else {
    say(game, label(result));
    sfx("coin");
    persist(game);
  }
  game.uiRev++;
}

function handle(game, el) {
  const act = el.dataset.act;
  if (act !== "tab") rememberScroll(game);
  if (act === "new") startNew(game);
  else if (act === "continue") {
    const data = readSave();
    if (data) restore(game, data);
  } else if (act === "erase") {
    eraseSave();
    game.hasSave = false;
    game.uiRev++;
  } else if (act === "launch") launch(game);
  else if (act === "respawn") respawn(game);
  else if (act === "tab") {
    game.dockTab = el.dataset.tab;
    game._scroll = 0;
    game.uiRev++;
  } else if (act === "buy") {
    const good = GOODS.find((g) => g.id === el.dataset.good);
    const result = buyGood(game, el.dataset.good, Number(el.dataset.n));
    afterTrade(game, result, (r) => `Bought ${r.n} ${good.name}.`);
  } else if (act === "sell") {
    const good = GOODS.find((g) => g.id === el.dataset.good);
    const result = sellGood(game, el.dataset.good, Number(el.dataset.n));
    afterTrade(game, result, (r) => `Sold ${r.n} ${good.name} for ${r.gain} cr.`);
  } else if (act === "fuel") {
    const result = buyFuel(game, Number(el.dataset.n));
    afterTrade(game, result, (r) => `Took on ${r.n} fuel.`);
  } else if (act === "repair") {
    const result = buyRepair(game, Number(el.dataset.n));
    afterTrade(game, result, (r) => `Patched ${r.n} armor.`);
  } else if (act === "accept") {
    const result = acceptMission(game, game.dockId, Number(el.dataset.slot));
    if (!result.ok) say(game, result.reason);
    game.uiRev++;
  } else if (act === "abandon") {
    abandonMission(game, el.dataset.uid);
  } else if (act === "open-map") openMap(game, "dock");
  else if (act === "close-map") closeMap(game);
  else if (act === "pick-sys") {
    game.mapFocus = el.dataset.sys;
    game._scroll = 0;
    game.uiRev++;
  } else if (act === "plot") {
    const id = el.dataset.sys;
    if (id !== game.systemId) {
      game.navSystem = id;
      say(game, "Course plotted toward " + system(id).name + ".");
      sfx("ui");
      persist(game);
    }
    game.uiRev++;
  }
}

function updateAct(game) {
  const act = document.getElementById("act");
  if (!act) return;
  const show = game.mode === "flight" && game.near;
  act.classList.toggle("show", !!show);
  act.classList.toggle("jump", !!(show && game.near.kind === "jump"));
  if (!show) {
    act.disabled = true;
    return;
  }
  if (game.near.kind === "dock") {
    act.disabled = false;
    text(act, "Land · " + game.near.name);
  } else if (game.fuel < JUMP_FUEL) {
    act.disabled = true;
    text(act, "Need " + JUMP_FUEL + " fuel");
  } else {
    act.disabled = false;
    text(act, "Jump · " + game.near.name + " · " + JUMP_FUEL);
  }
}

let shown = "";

export function mount(game) {
  overlay().addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !overlay().contains(el)) return;
    handle(game, el);
  });
  document.getElementById("mute").addEventListener("click", () => {
    game.mute = !game.mute;
    setMuted(game.mute);
    persist(game);
  });
}

export function sync(game) {
  document.body.dataset.mode = game.mode;
  const player = game.player;
  const hud = game.mode === "flight" || game.mode === "warp";
  if (hud && player) {
    const sys = system(game.systemId);
    text(document.getElementById("sysname"), sys ? sys.name : "");
    text(document.getElementById("missionline"), missionBlurb(game));
    text(document.getElementById("logline"), game.log.slice(0, 2).join("  ·  "));
    text(document.getElementById("credits"), game.credits.toLocaleString("en-US") + " cr");
    text(document.getElementById("speed"), "v " + Math.round(Math.hypot(player.vx, player.vy)));
    const shield = document.getElementById("shieldbar");
    const armor = document.getElementById("armorbar");
    const fuel = document.getElementById("fuelbar");
    shield.style.width = (100 * player.shield / player.shieldMax) + "%";
    armor.style.width = (100 * player.armor / player.armorMax) + "%";
    fuel.style.width = (100 * game.fuel / game.fuelMax) + "%";
    document.getElementById("fuelmeter").classList.toggle("low", game.fuel < JUMP_FUEL);
  }
  text(document.getElementById("mute"), game.mute ? "Muted" : "Sound");
  const banner = document.getElementById("banner");
  if (game.banner && (game.mode === "flight" || game.mode === "warp")) {
    banner.hidden = false;
    text(banner, game.banner.text);
  } else {
    banner.hidden = true;
  }
  updateAct(game);
  const key = [game.mode, game.uiRev, game.dockId, game.dockTab, game.mapFocus, game.navSystem, game.hasSave ? 1 : 0].join("|");
  if (key !== shown) {
    shown = key;
    renderOverlay(game);
  }
}
