# Weird Velocity

A small, strange, top-down space trading game for a phone browser. Fly the ship Probably, haul pickled starlight, and ask the Rude Chorus to quiet down.

It is an original game in the tradition of classic pocket space traders. Nothing here is taken from those games' names, text, or art.

## Play

Hosted on GitHub Pages from the repository root: [https://secretlabcoat.github.io/weird-velocity/](https://secretlabcoat.github.io/weird-velocity/)

Locally, serve this folder and open the URL. ES modules do not load from `file://`.

```bash
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080`.

Add it to the iPhone home screen from Safari's share sheet. The page is set up as a standalone web app and respects the safe area.

## Controls

- Thumb stick, or WASD / arrows: turn and thrust. Letting go does not stop you.
- Stop, or S / down: brake.
- Fire, or Space: shoot. Holding it repeats.
- Land or Jump appears when you are close to a dock or a beacon.
- Chart, or M: star map. Plot a course, then fly to the beacon. A jump costs 16 fuel.

The chart is not a teleporter. Beacons are.

## Dev bot

Open the game with `?dev=1`. A panel at the bottom can edit one source file: it sends the file and your instruction to an OpenAI-compatible `/chat/completions` endpoint, then commits the returned file to `secretlabcoat/weird-velocity` on `main` with the GitHub contents API.

The gear button stores the LLM base URL, API key, model, and a GitHub fine-grained token in this browser's `localStorage` only. If those boxes are empty they start as Gemini (`https://generativelanguage.googleapis.com/v1beta/openai`, `gemini-flash-latest`). Test my keys checks the AI and that the token can write. The bot picks which files to change. The LLM endpoint must allow browser requests, or the panel shows the error.

`NOTES.md` is the source of truth for layout and what to build next.
