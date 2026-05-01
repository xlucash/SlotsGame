# Hunter's Cluster — slot game

Hunting-themed cluster-pays slot built on Angular 21 + PixiJS v8.
6×5 board, min cluster size 4, persistent free-spins multiplier,
single-tier bonus buy with optional fortune-wheel gamble (3–20 spins).

- **Stack**: Angular 21 standalone components + signals · PixiJS v8 · GSAP · pixi-filters · Web Audio (procedural SFX)
- **RTP**: ~92% (verified by simulator in `src/app/core/math/rtp.spec.ts`)
- **Balance**: 10 000 PLN, in-memory only — refresh = new session

## Develop

```bash
npm install
npm start          # ng serve at http://localhost:4200
npm test           # vitest one-shot run; includes RTP simulation tests
npm run build      # production build to dist/
```

## Deploy to GitHub Pages

Once the project is on GitHub:

```bash
# First time only — make sure your remote is set
git remote add origin git@github.com:USER/REPO.git
git push -u origin main

# Build + push to gh-pages branch
npm run deploy
```

The `deploy` script builds with `--base-href "./"` so the bundle works
under any sub-path, then `angular-cli-ghpages` pushes the output of
`dist/slot-game/browser` to a `gh-pages` branch on `origin`.

In your repo settings, set **Pages → Source** to the `gh-pages` branch
(root). The site will be live at `https://USER.github.io/REPO/`.

## Project layout

```
src/app/
├── core/
│   ├── math/          # paytable, cluster detection, spin engine, RTP simulator + tests
│   └── services/      # balance, bet, game state, sound, bonus-buy economics
└── features/game/
    ├── pixi/          # WebGL grid, background scene, symbol art, particles
    └── ui/            # bars, popups, overlays, modals (paytable, bonus-buy, FS, big-win)
```
