// Particles and floating lines. Capped so a fight stays cheap to draw.

export function pushParticle(game, p) {
  if (game.particles.length > 140) game.particles.shift();
  game.particles.push(p);
}

export function burst(game, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.8);
    pushParticle(game, {
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.28 + Math.random() * 0.35,
      max: 0.63,
      size: 1.6 + Math.random() * 2.2,
      color,
    });
  }
}

export function floater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color, life: 1.7, vy: -24 });
  if (game.floaters.length > 8) game.floaters.shift();
}

export function updateFx(game, dt) {
  const next = [];
  for (const p of game.particles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    next.push(p);
  }
  game.particles = next;
  const texts = [];
  for (const f of game.floaters) {
    f.life -= dt;
    if (f.life <= 0) continue;
    f.y += f.vy * dt;
    texts.push(f);
  }
  game.floaters = texts;
  if (game.banner) {
    game.banner.t -= dt;
    if (game.banner.t <= 0) game.banner = null;
  }
}
