# BrowserCraft

BrowserCraft is a single-player Minecraft-style voxel sandbox that runs entirely in the browser using HTML + JavaScript + Three.js.

It includes:
- Procedural chunk terrain (16x16x128)
- Biomes (plains, forest, hills, coast/water)
- Trees, caves, and simple ores
- First-person controls + pointer lock
- Break/place voxel interaction
- Hotbar + inventory overlay + 2x2 crafting (logs -> planks)
- Survival/Creative modes with fly toggle
- Day/night lighting cycle, fog, particles, and basic sound
- Seeded world generation + localStorage save/load for modified chunks

## How To Run

1. Open `index.html` in Chrome/Firefox/Edge.
2. Click **Click To Play** to lock pointer and start.

For best compatibility/performance, use a local static server:

```bash
# Option 1
python3 -m http.server 8000

# Option 2
npx serve
```

Then open:
- `http://localhost:8000`

## Automated Regression Test (Playwright)

Install test dependencies:

```bash
npm install
npx playwright install chromium
```

Run the basic regression playthrough:

```bash
npm run test:e2e
```

This runs:
- `tests/basic-regression.spec.js`
- A browser-driven smoke playthrough (load world, toggle mode, craft, move, break/place)
- JS/runtime error checks (`pageerror` + console error assertions)

## Controls

- `Mouse`: look around
- `WASD`: move
- `Space`: jump
- `Shift`: sneak/crouch (and move down while flying)
- `Left Click (hold)`: break block (hardness-based delay)
- `Right Click`: place selected block
- `1-9`: select hotbar block
- `E`: open/close inventory + crafting
- `G`: toggle Survival / Creative mode
- `F`: toggle flying (Creative)
- `Double-tap Space`: toggle flying (Creative)
- `T`: toggle day/night cycle speed

## World & Save Behavior

- Chunk size: `16x16x128`
- Render distance: radius `7` chunks (streamed in/out)
- World is deterministic from seed.
- Saves to `localStorage` under a key derived from seed.
- Saved data includes:
  - modified chunks/blocks
  - player position + view
  - mode/flying state
  - inventory + crafting grid
  - time of day

Use a specific seed via query string:

```text
index.html?seed=12345
```

## Crafting

Current recipe:
- Place logs in any crafting slot of the 2x2 grid
- Output is `4 planks` per log
- Click **Craft Output** to craft

## Project Structure

- `index.html`:
  - full UI/HUD/inventory layout
  - styles
  - Three.js CDN + script loading
- `main.js`:
  - noise + world generation
  - chunk data + face-culled mesh build
  - player controller (physics/collision/modes)
  - interactions (raycast break/place)
  - inventory/crafting logic
  - day/night + particles + save/load loop

## Extending BrowserCraft

### Add a new block type
1. Add ID to `BLOCK` in `main.js`.
2. Add metadata to `BLOCK_INFO` (name, color, hardness, solid/transparent, drop).
3. Add it to `HOTBAR_DEFAULTS` if you want it placeable from hotbar.
4. Use it in terrain generation or crafting recipes.

### Add/modify terrain biomes
1. Update `World.getBiome()` thresholds/noise.
2. Update `World.getHeight()` profile per biome.
3. Tune top/subsurface block assignment in `Chunk.generate()`.

### Improve meshing performance
1. Replace face-by-face meshing with greedy meshing per chunk.
2. Keep separate transparent/opaque passes.
3. Consider worker-thread meshing (Web Workers).

### Add hostile mobs
1. Create a `Mob` class with position/velocity/AABB.
2. Update each tick with simple seek behavior toward player.
3. Add collision and hit logic.

### Add redstone-like logic
1. Introduce block state metadata (powered/unpowered).
2. Add neighbor updates and propagation rules.
3. Rebuild dirty chunks for visual updates.

## Known Limitations

- No true texture atlas yet (vertex-color blocks are used for simplicity).
- Three.js loads from CDN first, then local fallback (`vendor/three.min.js`) for offline/restricted environments.
- Tree generation is deterministic and chunk-safe but still basic.
- Water is static (visual only, no fluid simulation).
- Inventory UI is intentionally minimal (no drag/drop stack management).
- Caves/ores are simple noise-driven generation, not full Minecraft parity.
- localStorage size limits can cap very large modified-world saves.

## Performance Tips

- Reduce browser tab load / close heavy apps.
- Keep browser zoom at 100%.
- If needed, reduce render distance in `main.js` (`RENDER_DISTANCE`).
- Use a local server instead of `file://` for most stable asset/script loading.

## Future TODOs

- Better texture atlas + UV-mapped blocks
- Greedy meshing
- Mobs + combat + health/hunger systems
- Redstone logic
- Nether dimension
- Multiplayer via WebSockets
