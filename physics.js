// Newtonian-ish thrust, turn, and braking.

import { angDelta, clamp } from "./util.js";

export const PLAYER_SPEC = { accel: 390, turnRate: 3.35, maxSpeed: 430, brake: 560 };
export const PIRATE_SPEC = { accel: 240, turnRate: 2.2, maxSpeed: 285, brake: 220 };
export const SOLO_SPEC = { accel: 260, turnRate: 2.05, maxSpeed: 305, brake: 200 };

export function integrate(body, spec, thrust, turn, brake, dt) {
  body.angle += clamp(turn, -1, 1) * spec.turnRate * dt;
  const fx = Math.sin(body.angle);
  const fy = -Math.cos(body.angle);
  if (thrust > 0) {
    body.vx += fx * spec.accel * thrust * dt;
    body.vy += fy * spec.accel * thrust * dt;
  }
  if (brake) {
    const sp = Math.hypot(body.vx, body.vy);
    if (sp > 8) {
      const cut = Math.min(sp, spec.brake * dt);
      body.vx -= (body.vx / sp) * cut;
      body.vy -= (body.vy / sp) * cut;
    } else {
      body.vx = 0;
      body.vy = 0;
    }
  }
  const drag = Math.exp(-0.015 * dt);
  body.vx *= drag;
  body.vy *= drag;
  const sp = Math.hypot(body.vx, body.vy);
  if (sp > spec.maxSpeed) {
    body.vx = (body.vx / sp) * spec.maxSpeed;
    body.vy = (body.vy / sp) * spec.maxSpeed;
  }
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

export function stickPilot(angle, stickAng, mag) {
  const err = angDelta(angle, stickAng);
  const turn = clamp(err / 0.38, -1, 1);
  const align = Math.abs(err) < 0.55 ? 1 : clamp(1 - (Math.abs(err) - 0.55) / 1.1, 0, 1);
  const thrust = clamp((mag - 0.12) / 0.88, 0, 1) * (0.18 + 0.82 * align);
  return { turn, thrust };
}

export function steerToward(body, targetAng, rate, dt) {
  const err = angDelta(body.angle, targetAng);
  const turn = clamp(err / 0.42, -1, 1);
  body.angle += turn * rate * dt;
  return err;
}
