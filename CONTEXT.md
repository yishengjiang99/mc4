# BrowserCraft Session Context

Last updated: 2026-04-21 (America/Los_Angeles)

This file is a fast restart handoff for new sessions.

## Project Snapshot

- Name: BrowserCraft
- Repo: https://github.com/yishengjiang99/mc4 (public + GitHub Pages enabled)
- Runtime: Browser game with Three.js, no build step required.
- Main files:
- `index.html` (UI, styles, Three.js bootstrap/fallback, recipe bundle loading)
- `main.js` (all game logic + recipe engine)
- `data/recipes.generated.js` (imported vanilla recipe bundle)
- `tools/import_minecraft_recipes.py` (recipe importer)
- `tests/basic-regression.spec.js` (Playwright smoke playthrough)
- `playwright.config.js` (local server + test runner config)

## Current State (What Already Works)

- Chunked voxel world: `16x16x128`, procedural generation, streaming around player.
- Biomes: plains, forest, hills, coast.
- Terrain extras: trees, caves, coal/iron ore, sea-level water fill.
- Controls: pointer lock look, WASD, jump, crouch/sneak, creative fly toggle.
- Interaction: block raycast selection, hold-to-break (chains blocks while held), right-click place.
- UI: crosshair, hotbar, inventory, 3x3 crafting grid, FPS stats.
- Crafting: full imported vanilla recipe dataset (`1470` files), including shaped/shapeless/smelting-family/stonecutting/smithing/transmute and practical special-recipe approximations.
- Save/load: seed-based world + modified chunk persistence in `localStorage`.
- Test mode support: `?test=1` keeps automation stable and exposes test snapshot.

## Important Recent Fixes

- JS/runtime hardening for Three.js compatibility and fallback loader.
- Added local Three.js fallback at `vendor/three.min.js` when CDN load fails.
- Fixed movement controls:
- `W` now forward, `S` backward.
- `A` and `D` strafe left/right.
- Hotbar number-key selection works with both main number row and numpad (`1-9`).
- Holding left mouse while digging now keeps mining subsequent targeted blocks.
- Terrain tuned per request:
- Fewer trees.
- More hills.
- More visible water/coastal areas.
- Spawn relocation now avoids underwater two-block headspace issues.
- Added recipe import pipeline and runtime crafting engine:
- `tools/import_minecraft_recipes.py` builds `data/recipes.generated.js`
- `index.html` loads generated recipe bundle before `main.js`
- `main.js` uses `RecipeBook` matcher for 3x3 crafting

## Key Code Locations

- Constants and world config:
- `main.js:4` (`CHUNK_SIZE`)
- `main.js:6` (`SEA_LEVEL`)
- Terrain generation:
- `main.js:1658` (`World.getBiome`)
- `main.js:1673` (`World.getHeight`)
- Tree generation probabilities:
- `main.js:1423` (`Chunk.generateTrees`)
- `main.js:1698` (`World.getTreeBlockAt`)
- Recipe engine:
- `main.js:530` (`class RecipeBook`)
- `tools/import_minecraft_recipes.py:1` (importer entrypoint)
- Player movement vectors and input:
- `main.js:2256` (`forwardInput`/`strafeInput`)
- Input bindings:
- `main.js:2532` (`keydown`)
- `main.js:2570` (Digit/Numpad hotbar parsing)
- Break loop:
- `main.js:2865` (`updateBreaking`)
- Spawn safety:
- `main.js:2763` (`relocatePlayerToSurface`)
- Test hook:
- `main.js:3185` (`window.__BROWSERCRAFT__ = game`)

## Quick Start (Dev)

```bash
cd /Users/yishengj/mc4
python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

Optional seed:

```text
http://localhost:8000/index.html?seed=424242
```

## Test Commands

Install deps once:

```bash
cd /Users/yishengj/mc4
npm install
npx playwright install chromium
```

Run regression:

```bash
npm run test:e2e
```

Direct Chromium run:

```bash
npx playwright test --project=chromium
```

## Regenerate Recipe Bundle

```bash
cd /Users/yishengj/mc4
python3 tools/import_minecraft_recipes.py \
  --source /Users/yishengj/Desktop/minecraft_recipes/data/minecraft/recipe \
  --out data/recipes.generated.js
```

## Save/State Notes

- Save key format: `browsercraft_save_v1_<seed>`.
- Last used seed tracked in `localStorage` key `browsercraft_save_last_seed`.
- Saved state includes player transform/mode, inventory/crafting state, day-time, modified blocks.

## Known Limitations

- No greedy meshing yet (face-culling mesh only).
- Water is static (no fluid simulation).
- No mobs/combat/health system yet.
- Minimal inventory UX (no drag-drop stack management).
- Some special recipes are approximated (NBT/state-sensitive vanilla behavior is simplified).
- Single-file logic in `main.js` is large and should eventually be modularized.

## Suggested Next Work (Priority Order)

1. Split `main.js` into modules (`world`, `player`, `ui`, `inventory`, `systems`).
2. Implement greedy meshing to reduce vertex count and improve FPS at higher render distances.
3. Add basic hostile mob prototype (night spawn + simple chase AI).
4. Expand crafting with recipe table and stack-aware inventory behavior.
5. Add texture atlas and UVs (replace flat vertex colors).

## Regression Checklist Before Pushing Gameplay Changes

1. `node --check main.js`
2. `npx playwright test --project=chromium`
3. Manual sanity:
- Move with `WASD`.
- Hold LMB to mine multiple blocks.
- `1-9` selects hotbar slot.
- Break/place loop still increments modified blocks.

## Git Notes

- Default branch: `main`
- Remote: `origin` -> `https://github.com/yishengjiang99/mc4.git`
- Current repo includes `.gitignore` excluding `node_modules`, `.vite`, and Playwright artifacts.
- GitHub Pages URL: https://yishengjiang99.github.io/mc4/
