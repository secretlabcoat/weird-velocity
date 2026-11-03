// Keyboard plus a thumb stick. One-shot actions are latched so a quick tap still counts.

const HELD = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "KeyJ"];

export function attachInput() {
  const state = {
    thrust: 0,
    turn: 0,
    brake: false,
    fire: false,
    fireLatch: false,
    joy: false,
    stickMag: 0,
    stickAng: 0,
    justAct: false,
    justMap: false,
    justClose: false,
  };
  const keys = new Set();
  let pointerFire = false;
  let pointerBrake = false;
  let stickId = null;
  const stick = document.getElementById("stick");
  const knob = document.getElementById("knob");

  function typing() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable;
  }

  window.addEventListener("keydown", (e) => {
    const target = e.target;
    if (typing() || (target && target.closest && target.closest("#devbot, input, textarea, button"))) return;
    if (HELD.includes(e.code) || e.code === "KeyM" || e.code === "KeyE" || e.code === "Enter" || e.code === "Escape") {
      e.preventDefault();
    }
    if (keys.has(e.code)) return;
    keys.add(e.code);
    if (e.code === "Space" || e.code === "KeyJ") state.fireLatch = true;
    if (e.code === "KeyM") state.justMap = true;
    if (e.code === "KeyE" || e.code === "Enter") state.justAct = true;
    if (e.code === "Escape") state.justClose = true;
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    pointerFire = false;
    pointerBrake = false;
    resetStick();
  });

  function hold(id, down, up) {
    const el = document.getElementById(id);
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      down();
      e.preventDefault();
    });
    el.addEventListener("pointerup", (e) => { up(); e.preventDefault(); });
    el.addEventListener("pointercancel", up);
  }
  hold("fire", () => { pointerFire = true; state.fireLatch = true; }, () => { pointerFire = false; });
  hold("brake", () => { pointerBrake = true; }, () => { pointerBrake = false; });

  function tap(id, fn) {
    const el = document.getElementById(id);
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener("pointerup", (e) => {
      fn();
      e.preventDefault();
    });
  }
  tap("mapbtn", () => { state.justMap = true; });
  tap("act", () => {
    if (document.getElementById("act").classList.contains("show")) state.justAct = true;
  });

  function setStick(e) {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const mag = Math.hypot(dx, dy) || 1;
    const limit = rect.width * 0.34;
    const clamped = Math.min(mag, limit);
    const nx = dx / mag;
    const ny = dy / mag;
    knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;
    state.joy = true;
    state.stickMag = clamped / limit;
    state.stickAng = Math.atan2(nx, -ny);
  }
  function resetStick() {
    stickId = null;
    state.joy = false;
    state.stickMag = 0;
    knob.style.transform = "translate(0px, 0px)";
  }
  stick.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    setStick(e);
    e.preventDefault();
  });
  stick.addEventListener("pointermove", (e) => {
    if (e.pointerId === stickId) setStick(e);
  });
  stick.addEventListener("pointerup", (e) => {
    if (e.pointerId === stickId) resetStick();
  });
  stick.addEventListener("pointercancel", resetStick);

  return {
    state,
    snapshot() {
      state.thrust = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
      state.turn = (keys.has("KeyA") || keys.has("ArrowLeft") ? -1 : 0)
        + (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      state.brake = pointerBrake || keys.has("KeyS") || keys.has("ArrowDown");
      state.fire = pointerFire || keys.has("Space") || keys.has("KeyJ");
    },
    endFrame() {
      state.fireLatch = false;
      state.justMap = false;
      state.justAct = false;
      state.justClose = false;
    },
  };
}
