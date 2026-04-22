# BrowserCraft

BrowserCraft is a single-player Minecraft-style voxel sandbox that runs entirely in the browser using HTML + JavaScript + Three.js.

It includes:
- Procedural chunk terrain (16x16x128)
- Biomes (plains, forest, hills, coast/water)
- Trees, caves, and simple ores
- First-person controls + pointer lock
- Break/place voxel interaction
- Hotbar + inventory overlay + 3x3 crafting with imported vanilla recipe data
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
- `Drag and drop`: move items between inventory and crafting grid
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

Recipe system:
- Imports all JSON recipes from `data/minecraft/recipe` (`1470` files) into `data/recipes.generated.js`
- Supports shaped, shapeless, stonecutting, smelting/blasting/smoking/campfire, smithing transform/trim, and transmute recipes
- Includes practical approximations for special vanilla recipe types (fireworks, map cloning/extending, armor dye, repair, banner/shield decoration, decorated pot)
- Drag items from inventory into the crafting grid, then click **Craft Output**

## Project Structure

- `index.html`:
  - full UI/HUD/inventory layout
  - styles
  - Three.js CDN/local fallback + generated recipe bundle script loading
- `main.js`:
  - noise + world generation
  - chunk data + face-culled mesh build
  - player controller (physics/collision/modes)
  - interactions (raycast break/place)
  - inventory/crafting logic + recipe matcher
  - day/night + particles + save/load loop
- `data/recipes.generated.js`:
  - generated recipe DB bundle used by runtime crafting
- `tools/import_minecraft_recipes.py`:
  - importer to regenerate runtime recipe bundle from source JSON files

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

### Regenerate imported recipes
```bash
python3 tools/import_minecraft_recipes.py \
  --source /Users/yishengj/Desktop/minecraft_recipes/data/minecraft/recipe \
  --out data/recipes.generated.js
```

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
- Inventory UI is intentionally minimal (single-item drag/drop, no full stack split/merge UX).
- Some special recipes are approximated (no full NBT/state simulation).
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
