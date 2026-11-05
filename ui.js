// DOM screens: title, dock, chart, death. The space view stays on the canvas.

import { GOODS, SYSTEMS, system, route } from "./data/galaxy.js";
import copy, { fill } from "./data/text.js";
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

function setText(el, value) {
  if (el && el.textContent !== value) el.textContent = value;
}

function applyStaticLabels() {
  const shield = document.querySelector(".meter.shield span");
  const armor = document.querySelector(".meter.armor span");
  const fuel = document.querySelector(".meter.fuel span");
  if (shield) shield.textContent = copy.hud.shield;
  if (armor) armor.textContent = copy.hud.armor;
  if (fuel) fuel.textContent = copy.hud.fuel;
  setText(document.getElementById("brake"), copy.hud.stop);
  setText(document.getElementById("fire"), copy.hud.fire);
  setText(document.getElementById("mapbtn"), copy.hud.chart);
  setText(document.getElementById("mute"), copy.hud.sound);
  const stick = document.getElementById("stick");
  if (stick) stick.setAttribute("aria-label", copy.hud.stick);
  document.title = copy.meta.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", copy.meta.description);
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (apple) apple.setAttribute("content", copy.meta.title);
}

if (typeof document !== "undefined") applyStaticLabels();

function titleHtml(game) {
  if (game.naming) {
    const shipVal = game.shipName || copy.ship.name;
    const pilotVal = game.pilotName || copy.pilot.name;
    return `<div class="sheet">
    <div class="head">
      <p class="kicker">${esc(copy.title.kicker)}</p>
      <h2>${esc(copy.title.nameHeading)}</h2>
    </div>
    <div class="body scroll">
      <label>${esc(copy.title.shipLabel)}
        <input type="text" id="shipNameInput" value="${esc(shipVal)}" maxlength="24" autocomplete="off" style="font-size:16px">
      </label>
      <label>${esc(copy.title.pilotLabel)}
        <input type="text" id="pilotNameInput" value="${esc(pilotVal)}" maxlength="24" autocomplete="off" style="font-size:16px">
      </label>
    </div>
    <div class="foot col">
      <button type="button" class="primary" data-act="begin">${esc(copy.title.launch)}</button>
      <button type="button" data-act="back-title">${esc(copy.title.back)}</button>
    </div>
  </div>`;
  }
  const saved = !!game.hasSave;
  const help = copy.title.help.map((line) => `<li>${esc(line)}</li>`).join("");
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">${esc(copy.title.kicker)}</p>
      <h1>${esc(copy.title.nameLine1)}<br>${esc(copy.title.nameLine2)}</h1>
      <p class="tag">${esc(fill(copy.title.tagline, { ship: copy.ship.name }))}</p>
    </div>
    <div class="body scroll">
      <ul class="help">${help}</ul>
    </div>
    <div class="foot col">
      <button type="button" class="primary" data-act="new">${esc(copy.title.newVoyage)}</button>
      ${saved ? `<button type="button" data-act="continue">${esc(copy.title.continue)}</button>` : ""}
      ${saved ? `<button type="button" class="texty" data-act="erase">${esc(copy.title.erase)}</button>` : ""}
    </div>
  </div>`;
}

function goodsHtml(game) {
  let html = `<p class="hold">${esc(fill(copy.screens.hold, {
    used: cargoUsed(game),
    max: game.holdMax,
    credits: game.credits.toLocaleString("en-US"),
  }))}</p>`;
  for (const mission of game.missions) {
    if (mission.type === "delivery") {
      html += `<p class="contract">${esc(fill(copy.screens.contractCargo, {
        label: mission.label,
        hold: mission.hold,
        dest: mission.destName,
      }))}</p>`;
    }
  }
  for (const good of GOODS) {
    const buy = buyPrice(game, game.systemId, good.id);
    const sell = sellPrice(game, game.systemId, good.id);
    const ratio = buy / good.base;
    const mood = ratio < 0.88 ? "cheap" : ratio > 1.22 ? "steep" : "fair";
    const moodWord = copy.screens[mood];
    const have = game.cargo[good.id] || 0;
    html += `<div class="good">
      <div class="name">${esc(good.name)}</div>
      <div class="meta">${esc(good.about || "")}</div>
      <div class="meta"><span class="tag ${mood}">${esc(moodWord)}</span> · ${esc(fill(copy.screens.goodMeta, { buy, sell, have }))}</div>
      <div class="btns">
        <button type="button" data-act="buy" data-good="${good.id}" data-n="1">${esc(copy.screens.buy1)}</button>
        <button type="button" data-act="buy" data-good="${good.id}" data-n="5">${esc(copy.screens.buy5)}</button>
        <button type="button" data-act="sell" data-good="${good.id}" data-n="1" ${have ? "" : "disabled"}>${esc(copy.screens.sell1)}</button>
        <button type="button" data-act="sell" data-good="${good.id}" data-n="5" ${have ? "" : "disabled"}>${esc(copy.screens.sell5)}</button>
      </div>
    </div>`;
  }
  return html;
}

function progress(game, mission) {
  if (mission.type === "bounty") {
    return fill(copy.screens.bountyProgress, {
      have: mission.have,
      need: mission.need,
      system: system(mission.systemId).name,
    });
  }
  if (mission.type === "errand") {
    return fill(copy.screens.errandProgress, {
      have: game.cargo[mission.goodId] || 0,
      count: mission.count,
      good: mission.goodName,
      dest: mission.destName,
    });
  }
  return fill(copy.screens.deliveryProgress, { hold: mission.hold, dest: mission.destName });
}

function blockReason(game, mission) {
  if (game.missions.length >= 3) return copy.messages.tooMany;
  if (mission.type === "delivery" && cargoUsed(game) + mission.hold > game.holdMax) return copy.messages.noHold;
  return "";
}

function jobsHtml(game) {
  let html = `<h3>${esc(copy.screens.yours)}</h3>`;
  if (!game.missions.length) html += `<p class="dim">${esc(copy.screens.noActive)}</p>`;
  for (const mission of game.missions) {
    html += `<article class="job">
      <h3>${esc(mission.title)}</h3>
      <p>${esc(mission.detail)}</p>
      <p class="meta">${esc(progress(game, mission))} · ${mission.reward} cr</p>
      <button type="button" data-act="abandon" data-uid="${esc(mission.uid)}">${esc(copy.screens.abandon)}</button>
    </article>`;
  }
  html += `<h3>${esc(copy.screens.board)}</h3>`;
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
      <button type="button" data-act="accept" data-slot="${index}" ${reason ? "disabled" : ""}>${esc(copy.screens.accept)}</button>
      ${reason ? `<p class="dim">${esc(reason)}</p>` : ""}
    </article>`;
  });
  if (!shown) html += `<p class="dim">${esc(copy.screens.boardEmpty)}</p>`;
  return html;
}

function yardHtml(game) {
  const fuelRoom = game.fuelMax - game.fuel;
  const fuelGet = Math.min(fuelRoom, Math.floor(game.credits / FUEL_PRICE));
  const armorRoom = game.player.armorMax - game.player.armor;
  const armorGet = Math.min(armorRoom, Math.floor(game.credits / REPAIR_PRICE));
  const kind = game.bodies.find((b) => b.id === game.dockId)?.kind;
  return `<p>${esc(fill(copy.screens.yardIntro, { ship: game.shipName || copy.ship.name }))}</p>
    <p class="meta">${esc(fill(copy.screens.yardFuel, {
      have: Math.ceil(game.fuel),
      max: game.fuelMax,
      price: FUEL_PRICE,
    }))}</p>
    <div class="btns">
      <button type="button" data-act="fuel" data-n="${fuelGet}" ${fuelGet > 0 ? "" : "disabled"}>${esc(fill(copy.screens.fillFuel, { cost: fuelGet * FUEL_PRICE }))}</button>
      <button type="button" data-act="fuel" data-n="10" ${fuelRoom > 0 ? "" : "disabled"}>${esc(copy.screens.addFuel)}</button>
    </div>
    <p class="meta">${esc(fill(copy.screens.yardArmor, {
      have: Math.ceil(game.player.armor),
      max: game.player.armorMax,
      price: REPAIR_PRICE,
    }))}</p>
    <div class="btns">
      <button type="button" data-act="repair" data-n="${armorGet}" ${armorGet > 0 ? "" : "disabled"}>${esc(fill(copy.screens.repair, { cost: armorGet * REPAIR_PRICE }))}</button>
      <button type="button" data-act="repair" data-n="10" ${armorRoom > 0 ? "" : "disabled"}>${esc(copy.screens.addArmor)}</button>
    </div>
    <p class="dim">${esc(kind === "planet" ? copy.screens.yardPlanet : copy.screens.yardStation)}</p>`;
}

function dockHtml(game) {
  const body = game.bodies.find((b) => b.id === game.dockId);
  const sys = system(game.systemId);
  const tab = game.dockTab || "trade";
  const bodyHtml = tab === "jobs" ? jobsHtml(game) : tab === "yard" ? yardHtml(game) : goodsHtml(game);
  const noted = (game.log || []).find((entry) => !/appeal granted|filing fee|boards are bored/i.test(entry));
  const note = noted ? `<p class="note">${esc(noted)}</p>` : "";
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">${esc(sys.name)}</p>
      <h2>${esc(body ? body.name : copy.screens.dockFallback)}</h2>
      <p>${esc(body ? body.desc : "")}</p>
      <p class="specialty">${esc(sys.specialty)}</p>
      ${note}
    </div>
    <div class="tabs">
      <button type="button" data-act="tab" data-tab="trade" class="${tab === "trade" ? "on" : ""}">${esc(copy.screens.trade)}</button>
      <button type="button" data-act="tab" data-tab="jobs" class="${tab === "jobs" ? "on" : ""}">${esc(copy.screens.missions)}</button>
      <button type="button" data-act="tab" data-tab="yard" class="${tab === "yard" ? "on" : ""}">${esc(copy.screens.yard)}</button>
    </div>
    <div class="body scroll">${bodyHtml}</div>
    <div class="foot">
      <button type="button" data-act="open-map">${esc(copy.screens.chart)}</button>
      <button type="button" class="primary" data-act="launch">${esc(copy.screens.launch)}</button>
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
      <p class="kicker">${esc(fill(copy.screens.chartKicker, { customs: copy.factions.customs }))}</p>
      <h2>${esc(focus.name)}</h2>
      <p>${esc(focus.blurb)}</p>
      <p class="specialty">${esc(focus.specialty)}</p>
    </div>
    <div class="body scroll">
      <div class="chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        ${nodes}
      </div>
      <p class="meta">${here ? esc(copy.screens.alreadyHere) : esc(fill(copy.screens.route, { path }))}</p>
      <p class="meta">${here ? "" : esc(fill(copy.screens.beaconCost, { cost: JUMP_FUEL, have: Math.floor(game.fuel) }))}</p>
      ${plotted ? `<p class="note">${esc(copy.screens.plotted)}</p>` : ""}
    </div>
    <div class="foot">
      ${here ? "" : `<button type="button" class="primary" data-act="plot" data-sys="${focus.id}">${esc(copy.screens.plot)}</button>`}
      <button type="button" data-act="close-map">${esc(game.mapReturn === "dock" ? copy.screens.backDock : copy.screens.backShip)}</button>
    </div>
  </div>`;
}

function deadHtml(game) {
  return `<div class="sheet">
    <div class="head">
      <p class="kicker">${esc(copy.screens.deathKicker)}</p>
      <h2>${esc(fill(copy.screens.deathTitle, { ship: game.shipName || copy.ship.name }))}</h2>
      <p>${esc(fill(copy.screens.deathBody, { faction: copy.factions.chorus }))}</p>
    </div>
    <div class="foot">
      <button type="button" class="primary" data-act="respawn">${esc(copy.screens.appeal)}</button>
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
  else if (game.mode === "dead") root.innerHTML = deadHtml(game);
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
  if (act === "new") {
    game.naming = true;
    game.uiRev++;
  } else if (act === "begin") {
    const shipEl = document.getElementById("shipNameInput");
    const pilotEl = document.getElementById("pilotNameInput");
    const shipName = (shipEl ? shipEl.value.trim() : "") || copy.ship.name;
    const pilotName = (pilotEl ? pilotEl.value.trim() : "") || copy.pilot.name;
    game.naming = false;
    startNew(game, { shipName, pilotName });
  } else if (act === "back-title") {
    game.naming = false;
    game.uiRev++;
  } else if (act === "continue") {
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
    afterTrade(game, result, (r) => fill(copy.messages.bought, { n: r.n, name: good.name }));
  } else if (act === "sell") {
    const good = GOODS.find((g) => g.id === el.dataset.good);
    const result = sellGood(game, el.dataset.good, Number(el.dataset.n));
    afterTrade(game, result, (r) => fill(copy.messages.sold, { n: r.n, name: good.name, gain: r.gain }));
  } else if (act === "fuel") {
    const result = buyFuel(game, Number(el.dataset.n));
    afterTrade(game, result, (r) => fill(copy.messages.fueled, { n: r.n }));
  } else if (act === "repair") {
    const result = buyRepair(game, Number(el.dataset.n));
    afterTrade(game, result, (r) => fill(copy.messages.repaired, { n: r.n }));
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
      say(game, fill(copy.messages.course, { name: system(id).name }));
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
    setText(act, fill(copy.hud.landButton, { name: game.near.name }));
  } else if (game.fuel < JUMP_FUEL) {
    act.disabled = true;
    setText(act, fill(copy.hud.needFuel, { n: JUMP_FUEL }));
  } else {
    act.disabled = false;
    setText(act, fill(copy.hud.jumpButton, { name: game.near.name, n: JUMP_FUEL }));
  }
}

function flightTip(game) {
  if (!game.near) return "";
  if (game.near.kind === "dock") return fill(copy.hud.landAt, { name: game.near.name });
  if (game.near.kind === "jump") return fill(copy.hud.jumpTo, { name: game.near.name });
  return "";
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
    setText(document.getElementById("sysname"), sys ? sys.name : "");
    setText(document.getElementById("missionline"), missionBlurb(game));
    setText(document.getElementById("logline"), flightTip(game));
    setText(document.getElementById("credits"), fill(copy.hud.credits, { n: game.credits.toLocaleString("en-US") }));
    setText(document.getElementById("speed"), fill(copy.hud.speed, { n: Math.round(Math.hypot(player.vx, player.vy)) }));
    const shield = document.getElementById("shieldbar");
    const armor = document.getElementById("armorbar");
    const fuel = document.getElementById("fuelbar");
    shield.style.width = (100 * player.shield / player.shieldMax) + "%";
    armor.style.width = (100 * player.armor / player.armorMax) + "%";
    fuel.style.width = (100 * game.fuel / game.fuelMax) + "%";
    document.getElementById("fuelmeter").classList.toggle("low", game.fuel < JUMP_FUEL);
  }
  setText(document.getElementById("mute"), game.mute ? copy.hud.muted : copy.hud.sound);
  const banner = document.getElementById("banner");
  if (game.banner && (game.mode === "flight" || game.mode === "warp")) {
    banner.hidden = false;
    setText(banner, game.banner.text);
  } else {
    banner.hidden = true;
  }
  updateAct(game);
  const key = [game.mode, game.naming ? 1 : 0, game.uiRev, game.dockId, game.dockTab, game.mapFocus, game.navSystem, game.hasSave ? 1 : 0].join("|");
  if (key !== shown) {
    shown = key;
    renderOverlay(game);
  }
}
