// Boot, resize, and the capped animation frame.

import { auditGalaxy } from "./data/galaxy.js";
import { createGame } from "./state.js";
import { attachInput } from "./input.js";
import { mount, sync } from "./ui.js";
import { draw, drawMinimap, resizeCanvas } from "./render.js";
import { step, bootTitle } from "./sim.js";
import { unlockAudio } from "./audio.js";
import { readSave, persist } from "./save.js";
import { DT_CAP } from "./util.js";

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d", { alpha: false });
const mini = document.getElementById("minimap");
const mctx = mini.getContext("2d");

function showBoot(err) {
  console.error(err);
  const pre = document.createElement("pre");
  pre.id = "boot-error";
  pre.textContent = err && err.stack ? err.stack : String(err);
  document.body.appendChild(pre);
}

function leaveTypingAlone(event) {
  const target = event.target;
  if (!target || !target.closest) return false;
  if (target.closest("#devbot")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || target.isContentEditable;
}

function preventPageGestures() {
  const cancelUnlessTyping = (event) => {
    if (leaveTypingAlone(event)) return;
    event.preventDefault();
  };
  document.addEventListener("touchmove", (event) => {
    if (leaveTypingAlone(event) || event.target.closest?.(".scroll")) return;
    event.preventDefault();
  }, { passive: false });
  for (const name of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(name, cancelUnlessTyping, { passive: false });
  }
  document.addEventListener("contextmenu", cancelUnlessTyping);
}

function boot() {
  auditGalaxy();
  const game = createGame();
  window.WEIRD = game;
  const input = attachInput();
  mount(game);
  bootTitle(game);
  game.hasSave = !!readSave();
  const resize = () => resizeCanvas(canvas, mini, game);
  resize();
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  document.addEventListener("pointerdown", () => unlockAudio());
  preventPageGestures();

  let last = performance.now();
  let saveAcc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!Number.isFinite(dt) || dt < 0) dt = 0;
    if (dt > DT_CAP) dt = DT_CAP;
    input.snapshot();
    step(game, input.state, dt);
    draw(game, ctx, dt);
    drawMinimap(game, mctx);
    sync(game);
    input.endFrame();
    if (game.mode === "flight") {
      saveAcc += dt;
      if (saveAcc > 8) {
        saveAcc = 0;
        persist(game);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const saveIfPlaying = () => {
    if (game.mode !== "title") persist(game);
    last = performance.now();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveIfPlaying();
    else last = performance.now();
  });
  window.addEventListener("pagehide", saveIfPlaying);
}

try {
  boot();
} catch (err) {
  showBoot(err);
}
