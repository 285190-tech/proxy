# Neon Vault — Free Browser Arcade

A free, fast, fully static arcade for your browser. Seventeen hand-built cabinets,
synthwave/CRT styling, synthesized sound, zero accounts, zero ads, zero tracking.
Everything runs locally in the page.

**Live:** https://proxy-9ap.pages.dev (connected Cloudflare Pages project for this repo)

## Cabinets

| Game | Category | Notes |
| --- | --- | --- |
| Snake | Classic | speed ramps with length, swipe/dpad + WASD |
| Tetris | Puzzle | 7-bag, ghost piece, levels, touch buttons |
| Breakout | Classic | brick waves, particles, paddle english |
| Pong vs CPU | Classic | first to 7, Serve-Bot AI |
| Space Invaders | Action | destructible bunkers, UFO, waves |
| Minesweeper | Puzzle | 3 difficulties, first-click safe, flag mode |
| 2048 | Puzzle | swipe/WASD, merge pulse, win-and-continue |
| Memory Match | Puzzle | rookie/master modes, 3D flip |
| Tic-Tac-Toe | Classic | minimax MASTER, ADEPT, ROOKIE |
| Whack-a-Mole | Action | 45s rounds, golden moles, bombs |
| Echo | Classic | **Neon Vault original** — pattern memory, tempo ramps |
| Neon Sort | Learn | **Neon Vault original** — algorithm visualizer + Guess That Sort quiz |
| Path Pulse | Learn | BFS / Dijkstra / A* / Greedy on a neon maze with weighted rough terrain |
| Vault Code | Puzzle | Mastermind, vault edition — crack the four-sigil code |
| Lock On | Action | 45-second neon target range — gold cores pay triple |
| **Comet Catcher** | **Original** | **Neon Vault original** — storm survival |
| **Signal Pulse** | **Original** | **Neon Vault original** — one-button orbital timing |

## Features

- Homepage library with live search, category filter chips, best-score badges
- "Recently played" shelf backed by `localStorage` (device-local, never uploaded)
- Persistent per-game best scores (also `localStorage`)
- Synthesized SFX via Web Audio API — no audio files, mutable everywhere
- Toggleable CRT filter (scanlines + vignette), saved per device
- Fully responsive: 1366×768 Chromebooks, phones, touch + keyboard
- Konami code easter egg (↑↑↓↓←→←→ B A) — 6 seconds of Turbo Mode
- Pause / restart on every cabinet where it makes sense; `P` pauses, `R` restarts

## Run locally

Any static file server works:

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy your own copy

See **[DEPLOY.md](DEPLOY.md)** — Cloudflare Pages, preset *None*, empty build
command, output directory `/`. No build step exists and none is needed.

## Repository layout

```
index.html            homepage (library, search, recently played)
404.html              branded not-found page
assets/css/           main.css (homepage), game.css (cabinet chrome)
assets/js/            audio.js (Web Audio synth), nv.js (scores/chrome), app.js (homepage)
games/<slug>/         one folder per cabinet, self-contained page + <slug>.js
```

## Notes

- No web proxy is included (see DEPLOY.md §7 for the honest reasons).
- No analytics, no cookies. Privacy is the brand.
- MIT licensed — see [LICENSE](LICENSE).
