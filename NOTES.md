# Weird Velocity

A phone-first top-down space trader: fly a Newtonian ship, trade strange cargo, fight the Rude Chorus, and jump a seven-system chart.

## Architecture

Static files, no build. `index.html` loads `main.js`. The canvas loop lives in `main.js` (`requestAnimationFrame`, dt clamped at 0.05s, `devicePixelRatio` capped at 2). `sim.js` steps the voyage, `render.js` draws it, `ui.js` is the DOM for title, dock, chart, and death. `input.js` is the thumb stick and keyboard. `physics.js` is thrust, turn, and brake. `combat.js` is bolts, shields, and armor. `trade.js` and `missions.js` are the economy and the three contract types. `data/text.js` is every player-facing string. `data/galaxy.js` is the chart, coordinates, and prices, and it copies names onto the systems at load. `TEXT.md` is a readable copy of the writing. `sprites.js` bakes planets, stations, rocks, a glow atlas, and nebulae once. `save.js` writes one `localStorage` key. `devbot.js` is imported by `index.html` only when the URL contains `?dev=1`.

Flight is mode `flight`. Docking, the chart, hyperspace, the title, and death are other modes and pause the fight. Shields recharge after a pause. Armor, fuel, cargo, credits, and contracts persist. Fuel is spent on jumps, not on flying.

## Current state

Playable first voyage. Seven linked systems, nine commodities with per-system prices, dockside trade, refuel, and repair. Mission boards offer a bounty, a delivery, and an errand. A system can set `maxHostiles`; Alpha Prime keeps one hostile at a time. Jagged Scrap and Mineral Chunk can be shot for Raw Ore. Drift Cargo only blocks shots. Pirates patrol until you get close, then chase and apologize while shooting. Touch stick, Stop, Fire, Land/Jump, and Chart, plus WASD, Space, E, and M. Portrait and landscape, safe areas, no page scroll or zoom. Progress saves locally. Procedural graphics only, no image assets required for play. `window.WEIRD` is the live state, for debugging.

The in-flight top bar shows the system, a plain contract line, a tip only when a dock or beacon is in range, credits, speed, sound, and the three bars. It does not print the event log. The dev panel (`?dev=1` only) has no file picker. While it works it stays at the top of the screen and keeps a running log: the request, each step, the AI's one-sentence summary, and a reload banner when the live site has the change. It sends the request plus a one-line guide of files, picks at most three (wording starts in `data/text.js`, lasers and colors start in render.js), then asks for small find/replace edits and saves them to `main`. Status text under the box says what it is doing. The gear panel stores keys on the device and can test them. It opens at the top of the screen, and the request box moves up too while you are typing, so the iPhone keyboard does not cover the fields. The AI address is under Advanced and defaults to Gemini (`generativelanguage.googleapis.com/v1beta/openai`, `gemini-flash-latest`). A mistyped or empty address is repaired before it is used. A saved `gemini-2.5-flash` is switched to that. Busy replies are retried, then tried once on `gemini-flash-lite-latest`. The game does not cancel touch or paste while you are in the panel. A service worker reloads `.js`, `.css`, `.html`, and `.json` from the network first, so a Pages publish is visible on the next reload. After a dev-bot save the panel waits until that publish is built, then offers a reload.

## Next 3 tasks

1. Yard upgrades: a larger hold, a second weapon, and a faster hull called Perhaps.
2. Reputation with the Soft Customs and the Rude Chorus that moves prices and how quickly pirates notice you.
3. One longer contract chain about the moon that will not commit, with a unique event in its system.

## Conventions

- Plain ES modules, no build step.
- Return whole files.
- Keep files small and single-purpose so one file can be pasted into a chat.
- Relative URLs, so GitHub Pages can serve the repo root.
- Cap `devicePixelRatio` at 2. Clamp dt. Batch stars and bolts. Bake sprites and glows instead of using shadowBlur each frame.
- Original names and copy only. Do not import anyone else's ships, systems, or text.
- Dev-bot secrets (LLM base URL, LLM API key, model, GitHub token) stay in `localStorage` on the device. Never commit them.
- The dev bot does not send the whole repo. It picks at most three files from the short guide in `devbot.js`, then sends only those.
