(() => {
  "use strict";

  const CHUNK_SIZE = 16;
  const WORLD_HEIGHT = 128;
  const SEA_LEVEL = 44;
  const RENDER_DISTANCE = 7;
  const MAX_INTERACT_DISTANCE = 6;
  const SAVE_VERSION = 1;
  const SAVE_PREFIX = "browsercraft_save";

  const BLOCK = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    LOG: 4,
    LEAVES: 5,
    WATER: 6,
    SAND: 7,
    PLANKS: 8,
    COBBLE: 9,
    COAL_ORE: 10,
    IRON_ORE: 11,
    CRAFTING_TABLE: 12,
  };

  // Texture-inspired paint profiles extracted from Minecraft 1.21.11 block textures
  // listed in pictues.txt (assets/minecraft/textures/block/*.png).
  // We emulate the style procedurally with tone bands + grain while still using vertex colors.
  const BLOCK_PAINT_STYLE = {
    [BLOCK.GRASS]: {
      top: {
        texture: "assets/minecraft/textures/block/grass_block_top.png",
        baseColor: 0x5ea947,
        bands: [0.884, 0.993, 1.156],
        contrast: 0.069,
      },
      side: {
        texture: "assets/minecraft/textures/block/grass_block_side.png",
        baseColor: 0x7f6b42,
        bands: [0.724, 0.969, 1.358],
        contrast: 0.119,
      },
      bottom: {
        texture: "assets/minecraft/textures/block/dirt.png",
        baseColor: 0x8a5d34,
        bands: [0.797, 0.979, 1.265],
        contrast: 0.09,
      },
    },
    [BLOCK.DIRT]: {
      all: {
        texture: "assets/minecraft/textures/block/dirt.png",
        bands: [0.797, 0.979, 1.265],
        contrast: 0.09,
      },
    },
    [BLOCK.STONE]: {
      all: {
        texture: "assets/minecraft/textures/block/stone.png",
        bands: [0.905, 1.008, 1.087],
        contrast: 0.05,
      },
    },
    [BLOCK.LOG]: {
      top: {
        texture: "assets/minecraft/textures/block/oak_log_top.png",
        baseColor: 0x977a49,
        bands: [0.702, 1.112, 1.21],
        contrast: 0.121,
      },
      side: {
        texture: "assets/minecraft/textures/block/oak_log.png",
        baseColor: 0x6d5533,
        bands: [0.728, 1.049, 1.258],
        contrast: 0.084,
      },
      bottom: {
        texture: "assets/minecraft/textures/block/oak_log_top.png",
        baseColor: 0x977a49,
        bands: [0.702, 1.112, 1.21],
        contrast: 0.121,
      },
    },
    [BLOCK.LEAVES]: {
      all: {
        texture: "assets/minecraft/textures/block/oak_leaves.png",
        bands: [0.751, 1.021, 1.267],
        contrast: 0.125,
      },
    },
    [BLOCK.WATER]: {
      all: {
        texture: "assets/minecraft/textures/block/water_still.png",
        bands: [0.932, 0.977, 1.107],
        contrast: 0.069,
      },
    },
    [BLOCK.SAND]: {
      all: {
        texture: "assets/minecraft/textures/block/sand.png",
        bands: [0.951, 0.999, 1.059],
        contrast: 0.05,
      },
    },
    [BLOCK.PLANKS]: {
      all: {
        texture: "assets/minecraft/textures/block/oak_planks.png",
        bands: [0.788, 1.065, 1.164],
        contrast: 0.097,
      },
    },
    [BLOCK.COBBLE]: {
      all: {
        texture: "assets/minecraft/textures/block/cobblestone.png",
        bands: [0.764, 0.992, 1.288],
        contrast: 0.115,
      },
    },
    [BLOCK.COAL_ORE]: {
      all: {
        texture: "assets/minecraft/textures/block/coal_ore.png",
        bands: [0.67, 1.105, 1.246],
        contrast: 0.118,
      },
    },
    [BLOCK.IRON_ORE]: {
      all: {
        texture: "assets/minecraft/textures/block/iron_ore.png",
        bands: [0.865, 0.992, 1.174],
        contrast: 0.076,
      },
    },
    [BLOCK.CRAFTING_TABLE]: {
      top: {
        texture: "assets/minecraft/textures/block/crafting_table_top.png",
        baseColor: 0x78492a,
        bands: [0.489, 1.072, 1.514],
        contrast: 0.152,
      },
      side: {
        texture: "assets/minecraft/textures/block/crafting_table_side.png",
        baseColor: 0x81673f,
        bands: [0.372, 1.197, 1.489],
        contrast: 0.209,
      },
      bottom: {
        texture: "assets/minecraft/textures/block/oak_planks.png",
        baseColor: 0xa2834f,
        bands: [0.788, 1.065, 1.164],
        contrast: 0.097,
      },
    },
  };

  const BLOCK_INFO = {
    [BLOCK.AIR]: {
      id: BLOCK.AIR,
      name: "Air",
      color: 0x000000,
      solid: false,
      transparent: true,
      liquid: false,
      hardness: 0,
      drop: BLOCK.AIR,
    },
    [BLOCK.GRASS]: {
      id: BLOCK.GRASS,
      name: "Grass",
      color: 0x58a842,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 0.5,
      drop: BLOCK.DIRT,
    },
    [BLOCK.DIRT]: {
      id: BLOCK.DIRT,
      name: "Dirt",
      color: 0x8a5d34,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 0.45,
      drop: BLOCK.DIRT,
    },
    [BLOCK.STONE]: {
      id: BLOCK.STONE,
      name: "Stone",
      color: 0x7f8791,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 1.2,
      drop: BLOCK.COBBLE,
    },
    [BLOCK.LOG]: {
      id: BLOCK.LOG,
      name: "Log",
      color: 0x9b6d3d,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 0.9,
      drop: BLOCK.LOG,
    },
    [BLOCK.LEAVES]: {
      id: BLOCK.LEAVES,
      name: "Leaves",
      color: 0x2f7f34,
      solid: true,
      transparent: true,
      liquid: false,
      hardness: 0.2,
      drop: BLOCK.LEAVES,
    },
    [BLOCK.WATER]: {
      id: BLOCK.WATER,
      name: "Water",
      color: 0x3568bf,
      solid: false,
      transparent: true,
      liquid: true,
      hardness: 0,
      drop: BLOCK.AIR,
    },
    [BLOCK.SAND]: {
      id: BLOCK.SAND,
      name: "Sand",
      color: 0xd0c178,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 0.55,
      drop: BLOCK.SAND,
    },
    [BLOCK.PLANKS]: {
      id: BLOCK.PLANKS,
      name: "Planks",
      color: 0xb98854,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 0.8,
      drop: BLOCK.PLANKS,
    },
    [BLOCK.COBBLE]: {
      id: BLOCK.COBBLE,
      name: "Cobble",
      color: 0x737982,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 1.0,
      drop: BLOCK.COBBLE,
    },
    [BLOCK.COAL_ORE]: {
      id: BLOCK.COAL_ORE,
      name: "Coal Ore",
      color: 0x4f4f56,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 1.35,
      drop: BLOCK.COAL_ORE,
    },
    [BLOCK.IRON_ORE]: {
      id: BLOCK.IRON_ORE,
      name: "Iron Ore",
      color: 0x886f5f,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 1.45,
      drop: BLOCK.IRON_ORE,
    },
    [BLOCK.CRAFTING_TABLE]: {
      id: BLOCK.CRAFTING_TABLE,
      name: "Crafting Table",
      color: 0x8f5f38,
      solid: true,
      transparent: false,
      liquid: false,
      hardness: 1.1,
      drop: BLOCK.CRAFTING_TABLE,
    },
  };

  const HOTBAR_DEFAULTS = [
    BLOCK.GRASS,
    BLOCK.DIRT,
    BLOCK.STONE,
    BLOCK.LOG,
    BLOCK.PLANKS,
    BLOCK.SAND,
    BLOCK.CRAFTING_TABLE,
    BLOCK.COBBLE,
    BLOCK.WATER,
  ];

  const TABLE_CRAFT_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const INVENTORY_CRAFT_INDEXES = [0, 1, 3, 4];

  const BLOCK_TO_ITEM = {
    [BLOCK.GRASS]: "minecraft:grass_block",
    [BLOCK.DIRT]: "minecraft:dirt",
    [BLOCK.STONE]: "minecraft:stone",
    [BLOCK.LOG]: "minecraft:oak_log",
    [BLOCK.LEAVES]: "minecraft:oak_leaves",
    [BLOCK.WATER]: "minecraft:water_bucket",
    [BLOCK.SAND]: "minecraft:sand",
    [BLOCK.PLANKS]: "minecraft:oak_planks",
    [BLOCK.COBBLE]: "minecraft:cobblestone",
    [BLOCK.COAL_ORE]: "minecraft:coal_ore",
    [BLOCK.IRON_ORE]: "minecraft:iron_ore",
    [BLOCK.CRAFTING_TABLE]: "minecraft:crafting_table",
  };

  const ITEM_TO_BLOCK = new Map(
    Object.entries(BLOCK_TO_ITEM).map(([blockId, itemId]) => [itemId, Number.parseInt(blockId, 10)])
  );

  const RECIPE_DATA =
    typeof window !== "undefined" && window.BROWSERCRAFT_RECIPE_DATA
      ? window.BROWSERCRAFT_RECIPE_DATA
      : null;

  const FACE_DEFS = [
    {
      dir: [0, 0, 1],
      shade: 0.9,
      corners: [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],
    },
    {
      dir: [0, 0, -1],
      shade: 0.9,
      corners: [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    },
    {
      dir: [1, 0, 0],
      shade: 0.82,
      corners: [
        [1, 0, 1],
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
      ],
    },
    {
      dir: [-1, 0, 0],
      shade: 0.82,
      corners: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
    },
    {
      dir: [0, 1, 0],
      shade: 1.0,
      corners: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
    {
      dir: [0, -1, 0],
      shade: 0.6,
      corners: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
    },
  ];

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function fract(v) {
    return v - Math.floor(v);
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function chunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  function worldKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  function localKey(lx, y, lz) {
    return `${lx},${y},${lz}`;
  }

  function parseChunkKey(key) {
    const [a, b] = key.split(",").map((v) => parseInt(v, 10));
    return [a, b];
  }

  function colorToRGB(color) {
    return [
      ((color >> 16) & 0xff) / 255,
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255,
    ];
  }

  function facePaintKey(face) {
    if (face.dir[1] > 0) {
      return "top";
    }
    if (face.dir[1] < 0) {
      return "bottom";
    }
    return "side";
  }

  function hash4ToUnit(a, b, c, d) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 700001) ^ Math.imul(d | 0, 951274213);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function titleCaseWords(text) {
    return text
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function blockToItemId(blockId) {
    if (!BLOCK_INFO[blockId] || blockId === BLOCK.AIR) {
      return null;
    }
    return BLOCK_TO_ITEM[blockId] || `browsercraft:block_${blockId}`;
  }

  function normalizeItemId(itemIdOrBlockId) {
    if (typeof itemIdOrBlockId === "number") {
      return blockToItemId(itemIdOrBlockId);
    }
    if (typeof itemIdOrBlockId === "string" && itemIdOrBlockId.length > 0) {
      return itemIdOrBlockId;
    }
    return null;
  }

  function itemToBlockId(itemId) {
    return ITEM_TO_BLOCK.get(itemId) ?? null;
  }

  function itemDisplayName(itemId) {
    if (!itemId) {
      return "Empty";
    }
    const blockId = itemToBlockId(itemId);
    if (blockId !== null && BLOCK_INFO[blockId]) {
      return BLOCK_INFO[blockId].name;
    }
    const raw = itemId.includes(":") ? itemId.split(":")[1] : itemId;
    return titleCaseWords(raw);
  }

  class ValueNoise {
    constructor(seed) {
      this.seed = seed | 0;
    }

    hash3(x, y, z) {
      let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 700001) ^ Math.imul(this.seed, 951274213);
      h = (h ^ (h >>> 13)) >>> 0;
      h = Math.imul(h, 1274126177) >>> 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }

    noise3(x, y, z) {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const z0 = Math.floor(z);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const z1 = z0 + 1;

      const tx = smoothstep(x - x0);
      const ty = smoothstep(y - y0);
      const tz = smoothstep(z - z0);

      const c000 = this.hash3(x0, y0, z0);
      const c100 = this.hash3(x1, y0, z0);
      const c010 = this.hash3(x0, y1, z0);
      const c110 = this.hash3(x1, y1, z0);
      const c001 = this.hash3(x0, y0, z1);
      const c101 = this.hash3(x1, y0, z1);
      const c011 = this.hash3(x0, y1, z1);
      const c111 = this.hash3(x1, y1, z1);

      const x00 = lerp(c000, c100, tx);
      const x10 = lerp(c010, c110, tx);
      const x01 = lerp(c001, c101, tx);
      const x11 = lerp(c011, c111, tx);

      const y0v = lerp(x00, x10, ty);
      const y1v = lerp(x01, x11, ty);

      return lerp(y0v, y1v, tz) * 2 - 1;
    }

    noise2(x, z) {
      return this.noise3(x, 0, z);
    }

    fractal2(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
      let total = 0;
      let amp = 1;
      let freq = 1;
      let norm = 0;
      for (let i = 0; i < octaves; i += 1) {
        total += this.noise2(x * freq, z * freq) * amp;
        norm += amp;
        amp *= persistence;
        freq *= lacunarity;
      }
      return norm > 0 ? total / norm : 0;
    }

    fractal3(x, y, z, octaves = 3, persistence = 0.5, lacunarity = 2.0) {
      let total = 0;
      let amp = 1;
      let freq = 1;
      let norm = 0;
      for (let i = 0; i < octaves; i += 1) {
        total += this.noise3(x * freq, y * freq, z * freq) * amp;
        norm += amp;
        amp *= persistence;
        freq *= lacunarity;
      }
      return norm > 0 ? total / norm : 0;
    }
  }

  class SimpleSfx {
    constructor() {
      this.ctx = null;
    }

    ensureCtx() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => undefined);
      }
    }

    beep(freq, duration, gainValue) {
      this.ensureCtx();
      if (!this.ctx) {
        return;
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = gainValue;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const t0 = this.ctx.currentTime;
      gain.gain.setValueAtTime(gainValue, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.01);
    }

    place() {
      this.beep(320, 0.08, 0.025);
    }

    break() {
      this.beep(200, 0.1, 0.03);
    }

    craft() {
      this.beep(440, 0.12, 0.04);
    }
  }

  class ParticleSystem {
    constructor(scene) {
      this.scene = scene;
      this.particles = [];
      this.maxParticles = 280;
      this.geom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      this.material = new THREE.MeshBasicMaterial({ vertexColors: true });
      this.mesh = new THREE.InstancedMesh(this.geom, this.material, this.maxParticles);
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.mesh.count = 0;
      this.scene.add(this.mesh);
      this.tmpMatrix = new THREE.Matrix4();
      this.tmpColor = new THREE.Color();
      this.gravity = 18;
    }

    spawn(x, y, z, colorHex, count = 8) {
      for (let i = 0; i < count; i += 1) {
        if (this.particles.length >= this.maxParticles) {
          this.particles.shift();
        }
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2.8,
          (Math.random() - 0.5) * 3
        );
        const pos = new THREE.Vector3(x + Math.random(), y + Math.random(), z + Math.random());
        this.particles.push({
          pos,
          vel,
          life: 0.35 + Math.random() * 0.25,
          ttl: 0.35 + Math.random() * 0.25,
          color: colorHex,
        });
      }
    }

    update(dt) {
      let count = 0;
      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        p.vel.y -= this.gravity * dt;
        p.pos.addScaledVector(p.vel, dt);

        const scale = clamp(p.life / p.ttl, 0.15, 1) * 0.7;
        this.tmpMatrix.compose(
          p.pos,
          new THREE.Quaternion(),
          new THREE.Vector3(scale, scale, scale)
        );
        this.mesh.setMatrixAt(count, this.tmpMatrix);
        this.tmpColor.setHex(p.color);
        this.mesh.setColorAt(count, this.tmpColor);
        count += 1;
        if (count >= this.maxParticles) {
          break;
        }
      }
      this.mesh.count = count;
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) {
        this.mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  class RecipeBook {
    constructor(data) {
      this.data = data && Array.isArray(data.recipes) ? data : this.makeFallbackData();
      this.recipes = Array.isArray(this.data.recipes) ? this.data.recipes.slice() : [];
      this.knownItems = new Set(Array.isArray(this.data.items) ? this.data.items : []);
      this.tags = new Map();
      this.recipesByResult = new Map();

      const rawTags = this.data.tags && typeof this.data.tags === "object" ? this.data.tags : {};
      for (const [tagName, values] of Object.entries(rawTags)) {
        this.tags.set(tagName, new Set(Array.isArray(values) ? values : []));
      }

      // Always include BrowserCraft placeable items so inventory/hotbar interop works.
      for (const blockId of Object.values(BLOCK)) {
        const itemId = blockToItemId(blockId);
        if (itemId) {
          this.knownItems.add(itemId);
        }
      }

      this.buildRecipeResultIndex();
    }

    makeFallbackData() {
      return {
        items: ["minecraft:oak_log", "minecraft:oak_planks", "minecraft:crafting_table"],
        tags: {
          "minecraft:oak_logs": ["minecraft:oak_log"],
          "minecraft:logs": ["minecraft:oak_log"],
          "minecraft:planks": ["minecraft:oak_planks"],
        },
        recipes: [
          {
            id: "browsercraft:fallback_oak_planks",
            type: "minecraft:crafting_shapeless",
            ingredients: [["#minecraft:oak_logs"]],
            result: { id: "minecraft:oak_planks", count: 4 },
          },
          {
            id: "browsercraft:fallback_crafting_table",
            type: "minecraft:crafting_shaped",
            pattern: ["##", "##"],
            key: {
              "#": ["#minecraft:planks"],
            },
            result: { id: "minecraft:crafting_table", count: 1 },
          },
        ],
      };
    }

    getKnownItemsSorted() {
      return Array.from(this.knownItems).sort((a, b) => this.getItemName(a).localeCompare(this.getItemName(b)));
    }

    getItemName(itemId) {
      return itemDisplayName(itemId);
    }

    getRecipeResultId(recipe) {
      if (!recipe || typeof recipe !== "object") {
        return null;
      }
      if (recipe.result && typeof recipe.result.id === "string") {
        return recipe.result.id;
      }
      if (typeof recipe.result_like === "string" && recipe.result_like.length > 0) {
        return recipe.result_like;
      }
      return null;
    }

    buildRecipeResultIndex() {
      this.recipesByResult.clear();
      for (let i = 0; i < this.recipes.length; i += 1) {
        const recipe = this.recipes[i];
        const resultId = this.getRecipeResultId(recipe);
        if (!resultId) {
          continue;
        }
        let list = this.recipesByResult.get(resultId);
        if (!list) {
          list = [];
          this.recipesByResult.set(resultId, list);
        }
        list.push(recipe);
        this.knownItems.add(resultId);
      }
    }

    getRecipesByResult(itemId) {
      return this.recipesByResult.get(itemId) || [];
    }

    getCraftableOutputsSorted() {
      return Array.from(this.recipesByResult.keys()).sort((a, b) => this.getItemName(a).localeCompare(this.getItemName(b)));
    }

    expandIngredientOptions(options, limit = 80) {
      if (!Array.isArray(options) || options.length === 0) {
        return [];
      }

      const out = [];
      const seen = new Set();
      const addCandidate = (itemId) => {
        if (!itemId || seen.has(itemId)) {
          return;
        }
        seen.add(itemId);
        out.push(itemId);
      };

      for (let i = 0; i < options.length; i += 1) {
        const token = options[i];
        if (!token || typeof token !== "string") {
          continue;
        }
        if (token.startsWith("#")) {
          const tagName = token.slice(1);
          const expanded = this.tags.get(tagName);
          if (expanded && expanded.size > 0) {
            for (const itemId of expanded.values()) {
              addCandidate(itemId);
              if (out.length >= limit) {
                return out;
              }
            }
          } else {
            for (const itemId of this.knownItems.values()) {
              if (this.matchTagHeuristic(tagName, itemId)) {
                addCandidate(itemId);
                if (out.length >= limit) {
                  return out;
                }
              }
            }
          }
        } else {
          addCandidate(token);
          if (out.length >= limit) {
            return out;
          }
        }
      }

      return out;
    }

    normalizeGrid(rawGrid) {
      const out = new Array(9).fill(null);
      if (!Array.isArray(rawGrid)) {
        return out;
      }
      for (let i = 0; i < 9 && i < rawGrid.length; i += 1) {
        const itemId = normalizeItemId(rawGrid[i]);
        out[i] = itemId;
      }
      return out;
    }

    nonEmptyCells(grid) {
      const cells = [];
      for (let i = 0; i < grid.length; i += 1) {
        if (grid[i]) {
          cells.push({ index: i, itemId: grid[i] });
        }
      }
      return cells;
    }

    isDye(itemId) {
      return !!itemId && itemId.endsWith("_dye");
    }

    isLeatherArmor(itemId) {
      const raw = itemId.includes(":") ? itemId.split(":")[1] : itemId;
      return raw === "leather_helmet" || raw === "leather_chestplate" || raw === "leather_leggings" || raw === "leather_boots" || raw === "leather_horse_armor";
    }

    matchTagHeuristic(tagName, itemId) {
      const raw = itemId.includes(":") ? itemId.split(":")[1] : itemId;
      const shortTag = tagName.includes(":") ? tagName.split(":")[1] : tagName;

      if (shortTag === "eggs") {
        return raw === "egg";
      }
      if (shortTag === "planks") {
        return raw.endsWith("_planks");
      }
      if (shortTag === "logs") {
        return raw.endsWith("_log") || raw.endsWith("_wood") || raw.endsWith("_stem") || raw.endsWith("_hyphae");
      }
      if (shortTag === "coals") {
        return raw === "coal" || raw === "charcoal";
      }
      if (shortTag === "wool") {
        return raw === "wool" || raw.endsWith("_wool");
      }
      return false;
    }

    tokenMatches(itemId, token) {
      if (!itemId || !token) {
        return false;
      }

      if (token.startsWith("#")) {
        const tagName = token.slice(1);
        const expanded = this.tags.get(tagName);
        if (expanded && expanded.size > 0) {
          return expanded.has(itemId);
        }
        return this.matchTagHeuristic(tagName, itemId);
      }

      return token === itemId;
    }

    ingredientMatches(itemId, options) {
      if (!itemId || !Array.isArray(options) || options.length === 0) {
        return false;
      }
      for (let i = 0; i < options.length; i += 1) {
        if (this.tokenMatches(itemId, options[i])) {
          return true;
        }
      }
      return false;
    }

    resultFromRecipe(recipe, matchCtx) {
      if (recipe.result && recipe.result.id) {
        const count = Number.isFinite(recipe.result.count) && recipe.result.count > 0 ? recipe.result.count : 1;
        return { id: recipe.result.id, count };
      }
      if (recipe.result_copy_from === "base" && matchCtx && matchCtx.baseItemId) {
        return { id: matchCtx.baseItemId, count: 1 };
      }
      if (recipe.result_like) {
        return { id: recipe.result_like, count: 1 };
      }
      return null;
    }

    matchShapedRecipe(recipe, grid) {
      if (!Array.isArray(recipe.pattern) || !recipe.pattern.length || !recipe.key || typeof recipe.key !== "object") {
        return null;
      }

      const rows = recipe.pattern.map((row) => String(row));
      const height = rows.length;
      const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
      if (height > 3 || width > 3) {
        return null;
      }

      const mirrors = [false, true];
      for (let oy = 0; oy <= 3 - height; oy += 1) {
        for (let ox = 0; ox <= 3 - width; ox += 1) {
          for (let mi = 0; mi < mirrors.length; mi += 1) {
            const mirrored = mirrors[mi];
            let ok = true;

            for (let gy = 0; gy < 3 && ok; gy += 1) {
              for (let gx = 0; gx < 3; gx += 1) {
                const cellItem = grid[gx + gy * 3];
                let symbol = " ";

                const px = gx - ox;
                const py = gy - oy;
                if (px >= 0 && py >= 0 && px < width && py < height) {
                  const row = rows[py];
                  const rx = mirrored ? width - 1 - px : px;
                  symbol = row.charAt(rx) || " ";
                }

                if (symbol === " ") {
                  if (cellItem !== null) {
                    ok = false;
                    break;
                  }
                  continue;
                }

                const ingredient = recipe.key[symbol];
                if (!ingredient || !cellItem || !this.ingredientMatches(cellItem, ingredient)) {
                  ok = false;
                  break;
                }
              }
            }

            if (ok) {
              const result = this.resultFromRecipe(recipe, null);
              if (!result) {
                return null;
              }
              return {
                recipe,
                result,
              };
            }
          }
        }
      }

      return null;
    }

    matchShapelessIngredients(ingredients, grid) {
      const normalizedIngredients = ingredients.filter((entry) => Array.isArray(entry) && entry.length > 0);
      const cells = this.nonEmptyCells(grid);
      if (normalizedIngredients.length !== cells.length) {
        return null;
      }

      const used = new Array(cells.length).fill(false);
      const assignment = new Array(normalizedIngredients.length).fill(null);

      const order = normalizedIngredients
        .map((options, idx) => {
          let candidateCount = 0;
          for (let c = 0; c < cells.length; c += 1) {
            if (this.ingredientMatches(cells[c].itemId, options)) {
              candidateCount += 1;
            }
          }
          return { idx, options, candidateCount };
        })
        .sort((a, b) => a.candidateCount - b.candidateCount);

      const backtrack = (depth) => {
        if (depth >= order.length) {
          return true;
        }

        const ingredientIndex = order[depth].idx;
        const options = normalizedIngredients[ingredientIndex];

        for (let ci = 0; ci < cells.length; ci += 1) {
          if (used[ci]) {
            continue;
          }
          const cell = cells[ci];
          if (!this.ingredientMatches(cell.itemId, options)) {
            continue;
          }

          used[ci] = true;
          assignment[ingredientIndex] = cell;
          if (backtrack(depth + 1)) {
            return true;
          }
          used[ci] = false;
          assignment[ingredientIndex] = null;
        }

        return false;
      };

      if (!backtrack(0)) {
        return null;
      }

      return assignment;
    }

    matchShapelessRecipe(recipe, ingredients, grid, getContext = null) {
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return null;
      }

      const assignment = this.matchShapelessIngredients(ingredients, grid);
      if (!assignment) {
        return null;
      }

      const context = typeof getContext === "function" ? getContext(assignment) : null;
      const result = this.resultFromRecipe(recipe, context);
      if (!result) {
        return null;
      }

      return {
        recipe,
        result,
      };
    }

    matchSpecialRecipe(recipe, grid) {
      const kind = recipe.special_kind;
      const cells = this.nonEmptyCells(grid);

      if (kind === "bookcloning") {
        if (cells.length < 2) {
          return null;
        }
        let writable = 0;
        let hasWritten = false;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:written_book") {
            hasWritten = true;
          } else if (cell.itemId === "minecraft:writable_book") {
            writable += 1;
          } else {
            return null;
          }
        }
        if (!hasWritten || writable <= 0) {
          return null;
        }
        return { recipe, result: { id: "minecraft:written_book", count: writable + 1 } };
      }

      if (kind === "firework_rocket") {
        let paper = 0;
        let powder = 0;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:paper") {
            paper += 1;
          } else if (cell.itemId === "minecraft:gunpowder") {
            powder += 1;
          } else if (cell.itemId !== "minecraft:firework_star") {
            return null;
          }
        }
        if (paper === 1 && powder >= 1 && powder <= 3) {
          return { recipe, result: { id: "minecraft:firework_rocket", count: 3 } };
        }
        return null;
      }

      if (kind === "firework_star_fade") {
        let hasStar = false;
        let dyes = 0;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:firework_star") {
            hasStar = true;
          } else if (this.isDye(cell.itemId)) {
            dyes += 1;
          } else {
            return null;
          }
        }
        if (hasStar && dyes > 0) {
          return { recipe, result: { id: "minecraft:firework_star", count: 1 } };
        }
        return null;
      }

      if (kind === "firework_star") {
        let hasPowder = false;
        let dyes = 0;
        const allowedExtras = new Set([
          "minecraft:diamond",
          "minecraft:glowstone_dust",
          "minecraft:fire_charge",
          "minecraft:gold_nugget",
          "minecraft:feather",
          "minecraft:skull",
          "minecraft:wither_skeleton_skull",
          "minecraft:creeper_head",
          "minecraft:player_head",
          "minecraft:dragon_head",
          "minecraft:piglin_head",
        ]);
        for (const cell of cells) {
          if (cell.itemId === "minecraft:gunpowder") {
            hasPowder = true;
          } else if (this.isDye(cell.itemId)) {
            dyes += 1;
          } else if (!allowedExtras.has(cell.itemId)) {
            return null;
          }
        }
        if (hasPowder && dyes > 0) {
          return { recipe, result: { id: "minecraft:firework_star", count: 1 } };
        }
        return null;
      }

      if (kind === "mapcloning") {
        let emptyMaps = 0;
        let filledMaps = 0;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:filled_map") {
            filledMaps += 1;
          } else if (cell.itemId === "minecraft:map") {
            emptyMaps += 1;
          } else {
            return null;
          }
        }
        if (filledMaps === 1 && emptyMaps > 0) {
          return { recipe, result: { id: "minecraft:filled_map", count: emptyMaps + 1 } };
        }
        return null;
      }

      if (kind === "repairitem") {
        if (cells.length !== 2 || cells[0].itemId !== cells[1].itemId) {
          return null;
        }
        return { recipe, result: { id: cells[0].itemId, count: 1 } };
      }

      if (kind === "bannerduplicate") {
        if (cells.length !== 2) {
          return null;
        }
        const a = cells[0].itemId;
        const b = cells[1].itemId;
        if (a === b && (a === "minecraft:banner" || a.endsWith("_banner"))) {
          return { recipe, result: { id: a, count: 2 } };
        }
        return null;
      }

      if (kind === "armordye") {
        let armor = null;
        let dyeCount = 0;
        for (const cell of cells) {
          if (this.isLeatherArmor(cell.itemId)) {
            if (armor && armor !== cell.itemId) {
              return null;
            }
            armor = cell.itemId;
          } else if (this.isDye(cell.itemId)) {
            dyeCount += 1;
          } else {
            return null;
          }
        }
        if (armor && dyeCount > 0) {
          return { recipe, result: { id: armor, count: 1 } };
        }
        return null;
      }

      if (kind === "tippedarrow") {
        if (cells.length !== 9) {
          return null;
        }
        let arrows = 0;
        let lingering = 0;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:arrow") {
            arrows += 1;
          } else if (cell.itemId === "minecraft:lingering_potion") {
            lingering += 1;
          } else {
            return null;
          }
        }
        if (arrows === 8 && lingering === 1) {
          return { recipe, result: { id: "minecraft:tipped_arrow", count: 8 } };
        }
        return null;
      }

      if (kind === "mapextending") {
        const center = grid[4];
        if (center !== "minecraft:filled_map") {
          return null;
        }
        for (let i = 0; i < 9; i += 1) {
          if (i === 4) {
            continue;
          }
          if (grid[i] !== "minecraft:paper") {
            return null;
          }
        }
        return { recipe, result: { id: "minecraft:filled_map", count: 1 } };
      }

      if (kind === "shielddecoration") {
        if (cells.length !== 2) {
          return null;
        }
        let hasShield = false;
        let hasBanner = false;
        for (const cell of cells) {
          if (cell.itemId === "minecraft:shield") {
            hasShield = true;
          }
          if (cell.itemId === "minecraft:banner" || cell.itemId.endsWith("_banner")) {
            hasBanner = true;
          }
        }
        if (hasShield && hasBanner) {
          return { recipe, result: { id: "minecraft:shield", count: 1 } };
        }
        return null;
      }

      if (kind === "decorated_pot") {
        if (cells.length !== 4) {
          return null;
        }
        const ingredientSets = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        if (ingredientSets.length !== 4) {
          return null;
        }
        const assignment = this.matchShapelessIngredients(ingredientSets, grid);
        if (!assignment) {
          return null;
        }
        return { recipe, result: { id: "minecraft:decorated_pot", count: 1 } };
      }

      return null;
    }

    match(gridRaw) {
      const grid = this.normalizeGrid(gridRaw);

      for (let i = 0; i < this.recipes.length; i += 1) {
        const recipe = this.recipes[i];
        if (!recipe || typeof recipe !== "object" || typeof recipe.type !== "string") {
          continue;
        }

        const type = recipe.type;
        let match = null;

        if (type === "minecraft:crafting_shaped") {
          match = this.matchShapedRecipe(recipe, grid);
        } else if (type === "minecraft:crafting_shapeless") {
          match = this.matchShapelessRecipe(recipe, recipe.ingredients || [], grid);
        } else if (
          type === "minecraft:stonecutting" ||
          type === "minecraft:smelting" ||
          type === "minecraft:blasting" ||
          type === "minecraft:smoking" ||
          type === "minecraft:campfire_cooking"
        ) {
          match = this.matchShapelessRecipe(recipe, [recipe.ingredient || []], grid);
        } else if (type === "minecraft:crafting_transmute") {
          match = this.matchShapelessRecipe(recipe, [recipe.input || [], recipe.material || []], grid);
        } else if (type === "minecraft:smithing_transform") {
          match = this.matchShapelessRecipe(
            recipe,
            [recipe.template || [], recipe.base || [], recipe.addition || []],
            grid
          );
        } else if (type === "minecraft:smithing_trim") {
          match = this.matchShapelessRecipe(
            recipe,
            [recipe.template || [], recipe.base || [], recipe.addition || []],
            grid,
            (assignment) => ({
              baseItemId: assignment[1] ? assignment[1].itemId : null,
            })
          );
        } else if (recipe.special || type.startsWith("minecraft:crafting_special_") || type === "minecraft:crafting_decorated_pot") {
          match = this.matchSpecialRecipe(recipe, grid);
        }

        if (match) {
          return match;
        }
      }

      return null;
    }

    preview(gridRaw) {
      const match = this.match(gridRaw);
      if (!match) {
        return null;
      }
      return {
        itemId: match.result.id,
        count: match.result.count,
        recipeId: match.recipe.id,
        recipeType: match.recipe.type,
      };
    }
  }

  class Inventory {
    constructor(recipeBook) {
      this.recipeBook = recipeBook;
      this.counts = new Map();
      this.selectedHotbar = 0;
      this.craftGrid = new Array(9).fill(null);

      this.add(BLOCK.DIRT, 64);
      this.add(BLOCK.STONE, 64);
      this.add(BLOCK.LOG, 20);
      this.add(BLOCK.PLANKS, 24);
      this.add(BLOCK.SAND, 32);
      this.add(BLOCK.GRASS, 32);
      this.add(BLOCK.COBBLE, 40);
      this.add(BLOCK.LEAVES, 24);
      this.add(BLOCK.WATER, 12);
    }

    add(itemIdOrBlockId, amount = 1) {
      const itemId = normalizeItemId(itemIdOrBlockId);
      if (!itemId || amount <= 0) {
        return;
      }
      const old = this.counts.get(itemId) || 0;
      this.counts.set(itemId, old + amount);
      if (this.recipeBook) {
        this.recipeBook.knownItems.add(itemId);
      }
    }

    remove(itemIdOrBlockId, amount = 1) {
      const itemId = normalizeItemId(itemIdOrBlockId);
      if (!itemId || amount <= 0) {
        return false;
      }
      const old = this.counts.get(itemId) || 0;
      if (old < amount) {
        return false;
      }
      const next = old - amount;
      if (next === 0) {
        this.counts.delete(itemId);
      } else {
        this.counts.set(itemId, next);
      }
      return true;
    }

    getCount(itemIdOrBlockId) {
      const itemId = normalizeItemId(itemIdOrBlockId);
      if (!itemId) {
        return 0;
      }
      return this.counts.get(itemId) || 0;
    }

    getSelectedBlock() {
      return HOTBAR_DEFAULTS[this.selectedHotbar] || BLOCK.DIRT;
    }

    countAssigned(itemId, ignoreIndex = -1, activeCraftIndexes = null) {
      let count = 0;
      const slots = Array.isArray(activeCraftIndexes) ? activeCraftIndexes : this.craftGrid.map((_, i) => i);
      for (let i = 0; i < slots.length; i += 1) {
        const slotIndex = slots[i];
        if (slotIndex < 0 || slotIndex >= this.craftGrid.length) {
          continue;
        }
        if (slotIndex === ignoreIndex) {
          continue;
        }
        if (this.craftGrid[slotIndex] === itemId) {
          count += 1;
        }
      }
      return count;
    }

    getOwnedItemsSorted() {
      const items = [];
      for (const [itemId, count] of this.counts.entries()) {
        if (count > 0) {
          items.push(itemId);
        }
      }
      return items.sort((a, b) => this.recipeBook.getItemName(a).localeCompare(this.recipeBook.getItemName(b)));
    }

    toggleCraftSlot(index) {
      if (index < 0 || index >= this.craftGrid.length) {
        return;
      }

      const options = [null, ...this.getOwnedItemsSorted()];
      if (options.length <= 1) {
        this.craftGrid[index] = null;
        return;
      }

      const current = this.craftGrid[index];
      let ptr = options.indexOf(current);
      if (ptr < 0) {
        ptr = 0;
      }

      for (let step = 1; step <= options.length; step += 1) {
        const candidate = options[(ptr + step) % options.length];
        if (candidate === null) {
          this.craftGrid[index] = null;
          return;
        }

        const assigned = this.countAssigned(candidate, index);
        if (assigned < this.getCount(candidate)) {
          this.craftGrid[index] = candidate;
          return;
        }
      }

      this.craftGrid[index] = null;
    }

    clearCraftGrid(activeCraftIndexes = null) {
      if (Array.isArray(activeCraftIndexes)) {
        for (let i = 0; i < activeCraftIndexes.length; i += 1) {
          const slotIndex = activeCraftIndexes[i];
          if (slotIndex >= 0 && slotIndex < this.craftGrid.length) {
            this.craftGrid[slotIndex] = null;
          }
        }
        return;
      }
      for (let i = 0; i < this.craftGrid.length; i += 1) {
        this.craftGrid[i] = null;
      }
    }

    gridForCraft(activeCraftIndexes = null) {
      if (!Array.isArray(activeCraftIndexes)) {
        return this.craftGrid.slice();
      }
      const filtered = new Array(9).fill(null);
      for (let i = 0; i < activeCraftIndexes.length; i += 1) {
        const slotIndex = activeCraftIndexes[i];
        if (slotIndex >= 0 && slotIndex < this.craftGrid.length) {
          filtered[slotIndex] = this.craftGrid[slotIndex];
        }
      }
      return filtered;
    }

    craftPreview(activeCraftIndexes = null) {
      if (!this.recipeBook) {
        return null;
      }
      const craftGrid = this.gridForCraft(activeCraftIndexes);
      return this.recipeBook.preview(craftGrid);
    }

    craft(activeCraftIndexes = null) {
      if (!this.recipeBook) {
        return { ok: false, reason: "no_recipe_book" };
      }
      const craftGrid = this.gridForCraft(activeCraftIndexes);
      const match = this.recipeBook.match(craftGrid);
      if (!match) {
        return { ok: false, reason: "no_recipe" };
      }

      const needed = new Map();
      for (let i = 0; i < craftGrid.length; i += 1) {
        const itemId = craftGrid[i];
        if (!itemId) {
          continue;
        }
        needed.set(itemId, (needed.get(itemId) || 0) + 1);
      }

      for (const [itemId, amount] of needed.entries()) {
        if (this.getCount(itemId) < amount) {
          return { ok: false, reason: "missing_items" };
        }
      }

      for (const [itemId, amount] of needed.entries()) {
        this.remove(itemId, amount);
      }
      this.add(match.result.id, match.result.count);
      this.clearCraftGrid(activeCraftIndexes);
      return {
        ok: true,
        result: match.result,
        recipe: match.recipe,
      };
    }

    toJSON() {
      return {
        selectedHotbar: this.selectedHotbar,
        craftGrid: this.craftGrid.slice(),
        counts: Array.from(this.counts.entries()),
      };
    }

    load(data) {
      if (!data || typeof data !== "object") {
        return;
      }

      if (Array.isArray(data.counts)) {
        this.counts.clear();
        for (const entry of data.counts) {
          if (!Array.isArray(entry) || entry.length < 2) {
            continue;
          }
          const itemId = normalizeItemId(entry[0]);
          const count = entry[1];
          if (itemId && Number.isFinite(count) && count > 0) {
            this.counts.set(itemId, Math.floor(count));
            if (this.recipeBook) {
              this.recipeBook.knownItems.add(itemId);
            }
          }
        }
      }

      if (Number.isInteger(data.selectedHotbar)) {
        this.selectedHotbar = clamp(data.selectedHotbar, 0, 8);
      }

      if (Array.isArray(data.craftGrid)) {
        const incoming = data.craftGrid;
        if (incoming.length === 9) {
          this.craftGrid = incoming.map((entry) => normalizeItemId(entry));
        } else if (incoming.length === 4) {
          // Migrate legacy 2x2 grid into top-left corner of current 3x3 grid.
          const migrated = new Array(9).fill(null);
          const legacyMap = [0, 1, 3, 4];
          for (let i = 0; i < legacyMap.length; i += 1) {
            migrated[legacyMap[i]] = normalizeItemId(incoming[i]);
          }
          this.craftGrid = migrated;
        }
      }
    }
  }

  class Chunk {
    constructor(world, cx, cz) {
      this.world = world;
      this.cx = cx;
      this.cz = cz;
      this.key = chunkKey(cx, cz);
      this.data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT);
      this.group = new THREE.Group();
      this.group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
      this.group.userData.chunkKey = this.key;
      this.built = false;
      this.dirty = true;
    }

    index(lx, y, lz) {
      return lx + CHUNK_SIZE * (lz + CHUNK_SIZE * y);
    }

    inBounds(lx, y, lz) {
      return lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && y >= 0 && y < WORLD_HEIGHT;
    }

    get(lx, y, lz) {
      if (!this.inBounds(lx, y, lz)) {
        return BLOCK.AIR;
      }
      return this.data[this.index(lx, y, lz)];
    }

    set(lx, y, lz, blockId) {
      if (!this.inBounds(lx, y, lz)) {
        return;
      }
      this.data[this.index(lx, y, lz)] = blockId;
      this.dirty = true;
    }

    generate() {
      const minX = this.cx * CHUNK_SIZE;
      const minZ = this.cz * CHUNK_SIZE;

      for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
          const wx = minX + lx;
          const wz = minZ + lz;
          const biome = this.world.getBiome(wx, wz);
          const h = this.world.getHeight(wx, wz, biome);

          for (let y = 0; y < WORLD_HEIGHT; y += 1) {
            let blockId = BLOCK.AIR;

            if (y <= h) {
              if (y === 0) {
                blockId = BLOCK.STONE;
              } else if (y === h) {
                if (biome.type === "coast") {
                  blockId = BLOCK.SAND;
                } else {
                  blockId = BLOCK.GRASS;
                }
              } else if (y >= h - 3) {
                blockId = biome.type === "coast" ? BLOCK.SAND : BLOCK.DIRT;
              } else {
                blockId = BLOCK.STONE;
              }

              const cave = this.world.noise.fractal3(wx * 0.045, y * 0.045, wz * 0.045, 3, 0.56, 2.0);
              if (y > 5 && y < h - 4 && cave > 0.56) {
                blockId = BLOCK.AIR;
              }

              if (blockId === BLOCK.STONE) {
                const coalN = this.world.noise.fractal3(wx * 0.11, y * 0.11, wz * 0.11, 2, 0.55, 2.1);
                const ironN = this.world.noise.fractal3((wx + 101) * 0.14, (y - 67) * 0.14, (wz - 31) * 0.14, 2, 0.55, 2.0);
                if (y < 28 && ironN > 0.44) {
                  blockId = BLOCK.IRON_ORE;
                } else if (y < 52 && coalN > 0.53) {
                  blockId = BLOCK.COAL_ORE;
                }
              }
            } else if (y <= SEA_LEVEL) {
              blockId = BLOCK.WATER;
            }

            this.set(lx, y, lz, blockId);
          }
        }
      }

      this.generateTrees();
      this.applyMods();
      this.dirty = true;
      this.built = true;
    }

    generateTrees() {
      const chunkMinX = this.cx * CHUNK_SIZE;
      const chunkMinZ = this.cz * CHUNK_SIZE;
      const chunkMaxX = chunkMinX + CHUNK_SIZE - 1;
      const chunkMaxZ = chunkMinZ + CHUNK_SIZE - 1;

      const margin = 2;
      for (let tx = chunkMinX - margin; tx <= chunkMaxX + margin; tx += 1) {
        for (let tz = chunkMinZ - margin; tz <= chunkMaxZ + margin; tz += 1) {
          const biome = this.world.getBiome(tx, tz);
          if (biome.type !== "forest" && biome.type !== "plains") {
            continue;
          }

          const chance = biome.type === "forest" ? 0.042 : 0.008;
          const roll = this.world.rand2(tx, tz);
          if (roll > chance) {
            continue;
          }

          const groundY = this.world.getHeight(tx, tz, biome);
          if (groundY <= SEA_LEVEL + 1 || groundY >= WORLD_HEIGHT - 8) {
            continue;
          }

          const trunk = 4 + Math.floor(this.world.rand2(tx + 19, tz - 27) * 3);
          for (let i = 1; i <= trunk; i += 1) {
            this.setIfInsideChunk(tx, groundY + i, tz, BLOCK.LOG, false);
          }

          const crownY = groundY + trunk;
          for (let ox = -2; ox <= 2; ox += 1) {
            for (let oz = -2; oz <= 2; oz += 1) {
              for (let oy = -2; oy <= 2; oy += 1) {
                const manhattan = Math.abs(ox) + Math.abs(oz) + Math.abs(oy);
                if (manhattan > 4) {
                  continue;
                }
                const px = tx + ox;
                const py = crownY + oy;
                const pz = tz + oz;
                if (py <= 0 || py >= WORLD_HEIGHT) {
                  continue;
                }
                this.setIfInsideChunk(px, py, pz, BLOCK.LEAVES, true);
              }
            }
          }

          this.setIfInsideChunk(tx, crownY + 1, tz, BLOCK.LEAVES, true);
        }
      }
    }

    setIfInsideChunk(wx, y, wz, blockId, onlyReplaceAir) {
      const lx = wx - this.cx * CHUNK_SIZE;
      const lz = wz - this.cz * CHUNK_SIZE;
      if (!this.inBounds(lx, y, lz)) {
        return;
      }
      const idx = this.index(lx, y, lz);
      const old = this.data[idx];
      if (onlyReplaceAir && old !== BLOCK.AIR && old !== BLOCK.WATER && old !== BLOCK.LEAVES) {
        return;
      }
      this.data[idx] = blockId;
    }

    applyMods() {
      const modMap = this.world.modifiedChunks.get(this.key);
      if (!modMap) {
        return;
      }
      for (const [key, blockId] of modMap.entries()) {
        const [lx, y, lz] = key.split(",").map((n) => parseInt(n, 10));
        if (this.inBounds(lx, y, lz)) {
          this.data[this.index(lx, y, lz)] = blockId;
        }
      }
    }

    disposeMesh() {
      if (!this.group) {
        return;
      }
      for (let i = this.group.children.length - 1; i >= 0; i -= 1) {
        const child = this.group.children[i];
        if (child.geometry) {
          child.geometry.dispose();
        }
        this.group.remove(child);
      }
    }

    buildMesh() {
      if (!this.built) {
        return;
      }

      this.disposeMesh();

      const opaque = {
        positions: [],
        normals: [],
        colors: [],
        indices: [],
      };
      const transparent = {
        positions: [],
        normals: [],
        colors: [],
        indices: [],
      };

      let opaqueVertexCount = 0;
      let transVertexCount = 0;

      for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
          for (let y = 0; y < WORLD_HEIGHT; y += 1) {
            const blockId = this.get(lx, y, lz);
            if (blockId === BLOCK.AIR) {
              continue;
            }

            const info = BLOCK_INFO[blockId];
            if (!info || (info.transparent && blockId !== BLOCK.WATER && blockId !== BLOCK.LEAVES)) {
              continue;
            }

            const wx = this.cx * CHUNK_SIZE + lx;
            const wz = this.cz * CHUNK_SIZE + lz;

            for (let f = 0; f < FACE_DEFS.length; f += 1) {
              const face = FACE_DEFS[f];
              const nx = wx + face.dir[0];
              const ny = y + face.dir[1];
              const nz = wz + face.dir[2];
              const neighbor = this.world.getBlock(nx, ny, nz, true);
              if (!this.world.shouldRenderFace(blockId, neighbor)) {
                continue;
              }

              const target = info.transparent ? transparent : opaque;
              const color = this.world.getFaceColor(blockId, face, wx, y, wz, f);
              let vertexOffset;
              if (info.transparent) {
                vertexOffset = transVertexCount;
                transVertexCount += 4;
              } else {
                vertexOffset = opaqueVertexCount;
                opaqueVertexCount += 4;
              }

              for (let c = 0; c < 4; c += 1) {
                const corner = face.corners[c];
                target.positions.push(lx + corner[0], y + corner[1], lz + corner[2]);
                target.normals.push(face.dir[0], face.dir[1], face.dir[2]);
                target.colors.push(color[0], color[1], color[2]);
              }

              target.indices.push(
                vertexOffset,
                vertexOffset + 1,
                vertexOffset + 2,
                vertexOffset,
                vertexOffset + 2,
                vertexOffset + 3
              );
            }
          }
        }
      }

      const opaqueMesh = this.makeMesh(opaque, this.world.opaqueMaterial);
      if (opaqueMesh) {
        this.group.add(opaqueMesh);
      }

      const transMesh = this.makeMesh(transparent, this.world.transparentMaterial);
      if (transMesh) {
        transMesh.renderOrder = 2;
        this.group.add(transMesh);
      }

      this.dirty = false;
    }

    makeMesh(data, material) {
      if (data.indices.length === 0) {
        return null;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
      geo.setIndex(data.indices);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, material);
      mesh.userData.chunkKey = this.key;
      mesh.frustumCulled = true;
      return mesh;
    }
  }

  class World {
    constructor(scene, seed) {
      this.scene = scene;
      this.seed = seed;
      this.noise = new ValueNoise(seed);
      this.chunks = new Map();
      this.modifiedChunks = new Map();
      this.loadQueue = [];
      this.loadQueueSet = new Set();
      this.meshQueue = [];
      this.meshQueueSet = new Set();
      this.visibleKeys = new Set();
      this.lastChunkCenter = { cx: Infinity, cz: Infinity };

      this.opaqueMaterial = new THREE.MeshLambertMaterial({
        vertexColors: true,
      });
      this.transparentMaterial = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      });
    }

    rand2(x, z) {
      const v = Math.sin((x + this.seed * 0.113) * 12.9898 + (z - this.seed * 0.231) * 78.233) * 43758.5453;
      return fract(v);
    }

    getBiome(x, z) {
      const moisture = this.noise.fractal2(x * 0.0014, z * 0.0014, 4, 0.52, 2.0);
      const rough = this.noise.fractal2((x + 921) * 0.0009, (z - 111) * 0.0009, 3, 0.55, 2.1);
      if (rough > 0.43) {
        return { type: "hills" };
      }
      if (moisture < -0.2) {
        return { type: "coast" };
      }
      if (moisture > 0.14) {
        return { type: "forest" };
      }
      return { type: "plains" };
    }

    getHeight(x, z, biome = null) {
      const b = biome || this.getBiome(x, z);
      const base = this.noise.fractal2(x * 0.003, z * 0.003, 4, 0.5, 2.0);
      const ridge = Math.abs(this.noise.fractal2(x * 0.0012, z * 0.0012, 3, 0.56, 2.2));
      let h;

      switch (b.type) {
        case "hills":
          h = SEA_LEVEL + 13 + base * 18 + ridge * 14;
          break;
        case "forest":
          h = SEA_LEVEL + 7 + base * 9 + ridge * 3;
          break;
        case "coast":
          h = SEA_LEVEL - 1 + base * 4;
          break;
        case "plains":
        default:
          h = SEA_LEVEL + 4 + base * 7 + ridge * 2;
          break;
      }

      return clamp(Math.floor(h), 4, WORLD_HEIGHT - 5);
    }

    getTreeBlockAt(x, y, z) {
      for (let tx = x - 2; tx <= x + 2; tx += 1) {
        for (let tz = z - 2; tz <= z + 2; tz += 1) {
          const biome = this.getBiome(tx, tz);
          if (biome.type !== "forest" && biome.type !== "plains") {
            continue;
          }
          const chance = biome.type === "forest" ? 0.042 : 0.008;
          if (this.rand2(tx, tz) > chance) {
            continue;
          }

          const groundY = this.getHeight(tx, tz, biome);
          const trunk = 4 + Math.floor(this.rand2(tx + 19, tz - 27) * 3);
          if (x === tx && z === tz && y > groundY && y <= groundY + trunk) {
            return BLOCK.LOG;
          }

          const crownY = groundY + trunk;
          const ox = x - tx;
          const oz = z - tz;
          const oy = y - crownY;
          const manhattan = Math.abs(ox) + Math.abs(oz) + Math.abs(oy);
          if (Math.abs(ox) <= 2 && Math.abs(oz) <= 2 && Math.abs(oy) <= 2 && manhattan <= 4) {
            return BLOCK.LEAVES;
          }
          if (ox === 0 && oz === 0 && oy === 1) {
            return BLOCK.LEAVES;
          }
        }
      }
      return BLOCK.AIR;
    }

    getProceduralBlock(x, y, z) {
      if (y < 0 || y >= WORLD_HEIGHT) {
        return BLOCK.AIR;
      }

      const biome = this.getBiome(x, z);
      const height = this.getHeight(x, z, biome);
      let blockId = BLOCK.AIR;

      if (y <= height) {
        if (y === 0) {
          blockId = BLOCK.STONE;
        } else if (y === height) {
          blockId = biome.type === "coast" ? BLOCK.SAND : BLOCK.GRASS;
        } else if (y >= height - 3) {
          blockId = biome.type === "coast" ? BLOCK.SAND : BLOCK.DIRT;
        } else {
          blockId = BLOCK.STONE;
        }

        const cave = this.noise.fractal3(x * 0.045, y * 0.045, z * 0.045, 3, 0.56, 2.0);
        if (y > 5 && y < height - 4 && cave > 0.56) {
          blockId = BLOCK.AIR;
        }

        if (blockId === BLOCK.STONE) {
          const coalN = this.noise.fractal3(x * 0.11, y * 0.11, z * 0.11, 2, 0.55, 2.1);
          const ironN = this.noise.fractal3((x + 101) * 0.14, (y - 67) * 0.14, (z - 31) * 0.14, 2, 0.55, 2.0);
          if (y < 28 && ironN > 0.44) {
            blockId = BLOCK.IRON_ORE;
          } else if (y < 52 && coalN > 0.53) {
            blockId = BLOCK.COAL_ORE;
          }
        }
      } else if (y <= SEA_LEVEL) {
        blockId = BLOCK.WATER;
      }

      if (blockId === BLOCK.AIR || blockId === BLOCK.WATER) {
        const treeBlock = this.getTreeBlockAt(x, y, z);
        if (treeBlock !== BLOCK.AIR) {
          blockId = treeBlock;
        }
      }

      return blockId;
    }

    hasModified(x, y, z) {
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const cKey = chunkKey(cx, cz);
      const local = localKey(lx, y, lz);
      const map = this.modifiedChunks.get(cKey);
      if (!map) {
        return false;
      }
      return map.has(local);
    }

    getModified(x, y, z) {
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const cKey = chunkKey(cx, cz);
      const local = localKey(lx, y, lz);
      const map = this.modifiedChunks.get(cKey);
      if (!map || !map.has(local)) {
        return null;
      }
      return map.get(local);
    }

    getBlock(x, y, z, fallbackProcedural = false) {
      if (y < 0 || y >= WORLD_HEIGHT) {
        return BLOCK.AIR;
      }

      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const cKey = chunkKey(cx, cz);
      const chunk = this.chunks.get(cKey);

      if (chunk) {
        return chunk.get(lx, y, lz);
      }

      const modded = this.getModified(x, y, z);
      if (modded !== null) {
        return modded;
      }

      if (fallbackProcedural) {
        return this.getProceduralBlock(x, y, z);
      }

      return BLOCK.AIR;
    }

    isSolid(x, y, z) {
      const blockId = this.getBlock(x, y, z, true);
      const info = BLOCK_INFO[blockId];
      return info ? info.solid : false;
    }

    shouldRenderFace(blockId, neighborId) {
      const a = BLOCK_INFO[blockId];
      const b = BLOCK_INFO[neighborId];
      if (!a) {
        return false;
      }
      if (!b || neighborId === BLOCK.AIR) {
        return true;
      }

      if (blockId === BLOCK.WATER && neighborId === BLOCK.WATER) {
        return false;
      }
      if (blockId === BLOCK.LEAVES && neighborId === BLOCK.LEAVES) {
        return false;
      }

      if (a.transparent) {
        if (!b.solid) {
          return true;
        }
        return b.transparent && neighborId !== blockId;
      }

      return b.transparent || !b.solid;
    }

    getFaceColor(blockId, face, wx, y, wz, faceIndex = 0) {
      const style = BLOCK_PAINT_STYLE[blockId];
      const faceStyle = style ? style[facePaintKey(face)] || style.all || null : null;
      const baseColor = faceStyle && typeof faceStyle.baseColor === "number" ? faceStyle.baseColor : BLOCK_INFO[blockId].color;
      const rgb = colorToRGB(baseColor);
      let shade = face.shade;
      let textureMul = 1.0;

      if (faceStyle) {
        const toneHash = hash4ToUnit(
          wx + faceIndex * 17,
          y + blockId * 23,
          wz - faceIndex * 19,
          this.seed ^ (blockId * 131 + faceIndex * 29)
        );
        const toneIndex = toneHash < 0.35 ? 0 : toneHash < 0.7 ? 1 : 2;
        const bands = faceStyle.bands || [0.9, 1.0, 1.1];
        textureMul = bands[toneIndex];

        const grainHash =
          hash4ToUnit(
            wx * 5 + faceIndex * 37,
            y * 7 + blockId * 41,
            wz * 5 - faceIndex * 43,
            this.seed ^ 0x02f6e2b1
          ) - 0.5;
        const macroHash =
          hash4ToUnit(
            (wx >> 1) + blockId * 47,
            (y >> 1) + faceIndex * 53,
            (wz >> 1) + blockId * 59,
            this.seed ^ 0x41c64e6d
          ) - 0.5;

        const contrast = faceStyle.contrast || 0.08;
        textureMul += grainHash * contrast * 0.8;
        textureMul += macroHash * contrast * 0.45;
        textureMul = clamp(textureMul, 0.62, 1.42);
      }

      if (blockId === BLOCK.GRASS && face.dir[1] === 1) {
        shade *= 1.05;
      }
      if (blockId === BLOCK.DIRT && face.dir[1] === 1) {
        shade *= 0.95;
      }
      if (blockId === BLOCK.WATER) {
        shade *= 1.14;
      }
      if (blockId === BLOCK.LEAVES) {
        shade *= 0.9 + (Math.sin(y * 0.3) * 0.03 + 0.03);
      }

      const finalShade = shade * textureMul;

      return [
        clamp(rgb[0] * finalShade, 0, 1),
        clamp(rgb[1] * finalShade, 0, 1),
        clamp(rgb[2] * finalShade, 0, 1),
      ];
    }

    setBlock(x, y, z, blockId) {
      if (y < 0 || y >= WORLD_HEIGHT) {
        return false;
      }
      if (!BLOCK_INFO[blockId]) {
        return false;
      }

      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const cKey = chunkKey(cx, cz);

      let chunk = this.chunks.get(cKey);
      if (!chunk) {
        chunk = new Chunk(this, cx, cz);
        chunk.generate();
        this.chunks.set(cKey, chunk);
        this.scene.add(chunk.group);
      }

      const old = chunk.get(lx, y, lz);
      if (old === blockId) {
        return false;
      }

      chunk.set(lx, y, lz, blockId);
      this.markModified(x, y, z, blockId);
      this.enqueueMesh(cKey);

      if (lx === 0) this.enqueueMesh(chunkKey(cx - 1, cz));
      if (lx === CHUNK_SIZE - 1) this.enqueueMesh(chunkKey(cx + 1, cz));
      if (lz === 0) this.enqueueMesh(chunkKey(cx, cz - 1));
      if (lz === CHUNK_SIZE - 1) this.enqueueMesh(chunkKey(cx, cz + 1));
      if (y === 0 || y === WORLD_HEIGHT - 1) this.enqueueMesh(cKey);

      return true;
    }

    markModified(x, y, z, blockId) {
      const cx = Math.floor(x / CHUNK_SIZE);
      const cz = Math.floor(z / CHUNK_SIZE);
      const lx = mod(x, CHUNK_SIZE);
      const lz = mod(z, CHUNK_SIZE);
      const cKey = chunkKey(cx, cz);
      const lKey = localKey(lx, y, lz);

      const generated = this.getProceduralBlock(x, y, z);
      if (generated === blockId) {
        const map = this.modifiedChunks.get(cKey);
        if (map) {
          map.delete(lKey);
          if (map.size === 0) {
            this.modifiedChunks.delete(cKey);
          }
        }
        return;
      }

      let modMap = this.modifiedChunks.get(cKey);
      if (!modMap) {
        modMap = new Map();
        this.modifiedChunks.set(cKey, modMap);
      }
      modMap.set(lKey, blockId);
    }

    enqueueChunk(cx, cz) {
      const key = chunkKey(cx, cz);
      if (this.chunks.has(key) || this.loadQueueSet.has(key)) {
        return;
      }
      this.loadQueueSet.add(key);
      this.loadQueue.push({ cx, cz, key });
    }

    enqueueMesh(key) {
      if (!this.chunks.has(key) || this.meshQueueSet.has(key)) {
        return;
      }
      this.meshQueueSet.add(key);
      this.meshQueue.push(key);
    }

    updateVisible(playerX, playerZ) {
      const centerX = Math.floor(playerX / CHUNK_SIZE);
      const centerZ = Math.floor(playerZ / CHUNK_SIZE);

      if (centerX === this.lastChunkCenter.cx && centerZ === this.lastChunkCenter.cz) {
        return;
      }
      this.lastChunkCenter.cx = centerX;
      this.lastChunkCenter.cz = centerZ;

      const desired = new Set();
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx += 1) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz += 1) {
          const dist2 = dx * dx + dz * dz;
          if (dist2 > RENDER_DISTANCE * RENDER_DISTANCE) {
            continue;
          }
          const cx = centerX + dx;
          const cz = centerZ + dz;
          const key = chunkKey(cx, cz);
          desired.add(key);

          if (!this.chunks.has(key)) {
            this.enqueueChunk(cx, cz);
          }
        }
      }

      for (const [key, chunk] of this.chunks.entries()) {
        if (desired.has(key)) {
          continue;
        }
        this.unloadChunk(chunk);
        this.chunks.delete(key);
      }

      this.visibleKeys = desired;

      this.loadQueue.sort((a, b) => {
        const da = (a.cx - centerX) * (a.cx - centerX) + (a.cz - centerZ) * (a.cz - centerZ);
        const db = (b.cx - centerX) * (b.cx - centerX) + (b.cz - centerZ) * (b.cz - centerZ);
        return da - db;
      });
    }

    unloadChunk(chunk) {
      if (!chunk) {
        return;
      }
      chunk.disposeMesh();
      this.scene.remove(chunk.group);
    }

    processQueues(genBudget = 1, meshBudget = 2) {
      for (let i = 0; i < genBudget; i += 1) {
        const item = this.loadQueue.shift();
        if (!item) {
          break;
        }
        this.loadQueueSet.delete(item.key);
        if (!this.visibleKeys.has(item.key)) {
          continue;
        }
        if (this.chunks.has(item.key)) {
          continue;
        }

        const chunk = new Chunk(this, item.cx, item.cz);
        chunk.generate();
        this.chunks.set(item.key, chunk);
        this.scene.add(chunk.group);
        this.enqueueMesh(item.key);
        this.enqueueNeighborMeshes(item.cx, item.cz);
      }

      for (let i = 0; i < meshBudget; i += 1) {
        const key = this.meshQueue.shift();
        if (!key) {
          break;
        }
        this.meshQueueSet.delete(key);
        const chunk = this.chunks.get(key);
        if (!chunk) {
          continue;
        }
        chunk.buildMesh();
      }
    }

    enqueueNeighborMeshes(cx, cz) {
      this.enqueueMesh(chunkKey(cx - 1, cz));
      this.enqueueMesh(chunkKey(cx + 1, cz));
      this.enqueueMesh(chunkKey(cx, cz - 1));
      this.enqueueMesh(chunkKey(cx, cz + 1));
    }

    getRaycastTargets() {
      const meshes = [];
      for (const chunk of this.chunks.values()) {
        for (const child of chunk.group.children) {
          meshes.push(child);
        }
      }
      return meshes;
    }

    serializeMods() {
      const out = {};
      for (const [cKey, map] of this.modifiedChunks.entries()) {
        out[cKey] = Array.from(map.entries());
      }
      return out;
    }

    loadMods(obj) {
      this.modifiedChunks.clear();
      if (!obj || typeof obj !== "object") {
        return;
      }
      for (const cKey of Object.keys(obj)) {
        const arr = obj[cKey];
        if (!Array.isArray(arr)) {
          continue;
        }
        const map = new Map();
        for (const tuple of arr) {
          if (!Array.isArray(tuple) || tuple.length !== 2) {
            continue;
          }
          const [lKey, blockId] = tuple;
          if (typeof lKey !== "string" || !BLOCK_INFO[blockId]) {
            continue;
          }
          map.set(lKey, blockId);
        }
        if (map.size > 0) {
          this.modifiedChunks.set(cKey, map);
        }
      }
    }
  }

  class Player {
    constructor(camera, world) {
      this.camera = camera;
      this.world = world;

      this.position = new THREE.Vector3(0.5, 70, 0.5);
      this.velocity = new THREE.Vector3();
      this.yaw = 0;
      this.pitch = 0;

      this.width = 0.6;
      this.height = 1.8;
      this.eyeHeight = 1.62;
      this.crouchOffset = 0;

      this.walkSpeed = 5.2;
      this.crouchSpeed = 2.7;
      this.flySpeed = 9.5;
      this.turnSpeed = 2.75;
      this.gravity = 26;
      this.jumpVelocity = 8.4;
      this.sensitivity = 0.0023;

      this.onGround = false;
      this.mode = "survival";
      this.flying = false;
      this.lastSpaceTap = 0;

      this.pitchLimit = Math.PI / 2 - 0.01;
      this.updateCamera();
    }

    getAABB(pos = this.position) {
      const w = this.width / 2;
      return {
        minX: pos.x - w,
        maxX: pos.x + w,
        minY: pos.y,
        maxY: pos.y + this.height,
        minZ: pos.z - w,
        maxZ: pos.z + w,
      };
    }

    collidesAt(pos) {
      const box = this.getAABB(pos);
      const minX = Math.floor(box.minX);
      const maxX = Math.floor(box.maxX);
      const minY = Math.floor(box.minY);
      const maxY = Math.floor(box.maxY);
      const minZ = Math.floor(box.minZ);
      const maxZ = Math.floor(box.maxZ);

      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            if (this.world.isSolid(x, y, z)) {
              return true;
            }
          }
        }
      }

      return false;
    }

    intersectsBlock(x, y, z) {
      const box = this.getAABB();
      return !(box.maxX <= x || box.minX >= x + 1 || box.maxY <= y || box.minY >= y + 1 || box.maxZ <= z || box.minZ >= z + 1);
    }

    setMode(mode) {
      if (mode !== "survival" && mode !== "creative") {
        return;
      }
      this.mode = mode;
      if (this.mode === "creative") {
        this.flying = true;
        this.velocity.y = 0;
      } else {
        this.flying = false;
      }
    }

    toggleMode() {
      this.setMode(this.mode === "survival" ? "creative" : "survival");
    }

    toggleFlying() {
      if (this.mode !== "creative") {
        return;
      }
      this.flying = !this.flying;
      if (this.flying) {
        this.velocity.y = 0;
      }
    }

    onSpaceTap() {
      const now = performance.now();
      if (this.mode === "creative" && now - this.lastSpaceTap < 280) {
        this.toggleFlying();
      }
      this.lastSpaceTap = now;
    }

    look(dx, dy) {
      this.yaw -= dx * this.sensitivity;
      this.pitch -= dy * this.sensitivity;
      this.pitch = clamp(this.pitch, -this.pitchLimit, this.pitchLimit);
      this.updateCameraRotation();
    }

    updateCameraRotation() {
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;
    }

    updateCamera() {
      this.camera.position.set(
        this.position.x,
        this.position.y + this.eyeHeight - this.crouchOffset,
        this.position.z
      );
      this.updateCameraRotation();
    }

    update(dt, keys, controlsEnabled, inventoryOpen) {
      const sneakHeld = keys.ShiftLeft || keys.ShiftRight;
      this.crouchOffset = sneakHeld && !this.flying ? 0.18 : 0;

      if (!controlsEnabled || inventoryOpen) {
        this.updateCamera();
        return;
      }

      const turnInput = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
      if (turnInput !== 0) {
        this.yaw -= turnInput * this.turnSpeed * dt;
        this.updateCameraRotation();
      }

      const forwardInput = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0);
      const strafeInput = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);

      const moveVec = new THREE.Vector3();
      if (forwardInput !== 0 || strafeInput !== 0) {
        // Forward points where camera yaw faces (ignoring pitch), right is the strafe axis.
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        moveVec.addScaledVector(forward, forwardInput);
        moveVec.addScaledVector(right, strafeInput);
        moveVec.normalize();
      }

      if (this.mode === "creative" && this.flying) {
        const speed = sneakHeld ? this.flySpeed * 0.55 : this.flySpeed;
        const flyUp = keys.Space || keys.Numpad0;
        const flyDown = keys.KeyX;
        const vertical = (flyUp ? 1 : 0) - (flyDown ? 1 : 0);

        this.position.x += moveVec.x * speed * dt;
        this.position.z += moveVec.z * speed * dt;
        this.position.y += vertical * speed * dt;
        this.velocity.set(0, 0, 0);
        this.onGround = false;
        this.updateCamera();
        return;
      }

      const targetSpeed = sneakHeld ? this.crouchSpeed : this.walkSpeed;
      this.velocity.x = moveVec.x * targetSpeed;
      this.velocity.z = moveVec.z * targetSpeed;
      this.velocity.y -= this.gravity * dt;
      this.velocity.y = Math.max(this.velocity.y, -45);

      if ((keys.Space || keys.Numpad0) && this.onGround) {
        this.velocity.y = this.jumpVelocity;
        this.onGround = false;
      }

      this.moveWithCollisions(this.velocity.x * dt, this.velocity.y * dt, this.velocity.z * dt);
      this.updateCamera();
    }

    moveWithCollisions(dx, dy, dz) {
      const original = this.position.clone();

      if (dx !== 0) {
        this.position.x += dx;
        if (this.collidesAt(this.position)) {
          this.position.x = original.x;
          this.velocity.x = 0;
        }
      }

      if (dz !== 0) {
        this.position.z += dz;
        if (this.collidesAt(this.position)) {
          this.position.z = original.z;
          this.velocity.z = 0;
        }
      }

      this.onGround = false;
      if (dy !== 0) {
        this.position.y += dy;
        if (this.collidesAt(this.position)) {
          if (dy < 0) {
            this.onGround = true;
          }
          this.position.y = original.y;
          this.velocity.y = 0;
        }
      }

      if (this.position.y < 2) {
        this.position.y = Math.max(this.position.y, 2);
      }
    }
  }

  class BrowserCraft {
    constructor() {
      this.queryParams = new URLSearchParams(window.location.search);
      this.testMode = this.queryParams.get("test") === "1";

      this.ui = {
        gameRoot: document.getElementById("game"),
        stats: document.getElementById("stats"),
        modeLabel: document.getElementById("modeLabel"),
        seedLabel: document.getElementById("seedLabel"),
        hotbar: document.getElementById("hotbar"),
        inventory: document.getElementById("inventory"),
        invGrid: document.getElementById("invGrid"),
        craftGrid: document.getElementById("craftGrid"),
        craftTitle: document.getElementById("craftTitle"),
        craftOutputInput: document.getElementById("craftOutputInput"),
        craftOutputList: document.getElementById("craftOutputList"),
        craftResult: document.getElementById("craftResult"),
        craftBtn: document.getElementById("craftBtn"),
        craftHint: document.getElementById("craftHint"),
        instructions: document.getElementById("instructions"),
        playBtn: document.getElementById("playBtn"),
        message: document.getElementById("message"),
        chatOverlay: document.getElementById("chatOverlay"),
        chatInput: document.getElementById("chatInput"),
      };

      this.seed = this.getSeed();
      this.saveKey = `${SAVE_PREFIX}_v${SAVE_VERSION}_${this.seed}`;

      this.renderer = new THREE.WebGLRenderer({ antialias: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if ("outputColorSpace" in this.renderer && typeof THREE.SRGBColorSpace !== "undefined") {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ("outputEncoding" in this.renderer && typeof THREE.sRGBEncoding !== "undefined") {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.ui.gameRoot.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x8cc8ff, 30, CHUNK_SIZE * (RENDER_DISTANCE + 1.4));

      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
      this.raycaster = new THREE.Raycaster();
      this.raycaster.far = MAX_INTERACT_DISTANCE;

      this.world = new World(this.scene, this.seed);
      this.player = new Player(this.camera, this.world);
      this.recipeBook = new RecipeBook(RECIPE_DATA);
      this.inventory = new Inventory(this.recipeBook);
      this.particles = new ParticleSystem(this.scene);
      this.sfx = new SimpleSfx();

      this.keys = {};
      this.inventoryOpen = false;
      this.craftingContext = "inventory";
      this.craftingTablePos = null;
      this.controlsEnabled = false;
      this.leftMouseDown = false;
      this.breakState = null;
      this.lastPlaceTime = 0;
      this.dayNightSpeed = 1;
      this.timeOfDay = 0.2;
      this.targetInfo = null;
      this.chatOpen = false;
      this.respawnPoint = new THREE.Vector3(0.5, 70, 0.5);

      this.fpsState = {
        frameCount: 0,
        elapsed: 0,
        fps: 0,
      };

      this.lastFrameTime = performance.now();
      this.chunkUpdateTimer = 0;
      this.saveTimer = 0;

      this.selectionBox = this.createSelectionBox();
      this.scene.add(this.selectionBox);

      this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
      this.sunLight.position.set(40, 60, 20);
      this.scene.add(this.sunLight);

      this.ambient = new THREE.AmbientLight(0xbdd9ff, 0.5);
      this.scene.add(this.ambient);

      this.tempVec = new THREE.Vector3();
      this.tempVec2 = new THREE.Vector3();
      this.tempNormal = new THREE.Vector3();

      this.hotbarEls = [];
      this.invCells = [];
      this.invCellItemIds = [];
      this.craftCells = [];
      this.selectedCraftItemId = null;
      this.craftMissingSlots = new Map();
      this.craftOutputIds = [];
      this.craftOutputNameLookup = new Map();
      this.craftOutputIdSet = new Set();
      this.dragMime = "application/x-browsercraft-item";

      this.buildUI();
      this.bindEvents();
      this.loadGame();
      this.updateHUD(true);
      this.bootstrapChunks();

      if (this.testMode) {
        this.controlsEnabled = true;
        this.ui.instructions.classList.add("hidden");
      }

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);

      // TODO: Add hostile mobs with basic AI pathing.
      // TODO: Add redstone-like power simulation and logic blocks.
      // TODO: Add Nether/alternate dimensions with portals.
      // TODO: Add multiplayer sync over WebSockets.
    }

    getSeed() {
      const params = this.queryParams || new URLSearchParams(window.location.search);
      const qSeed = parseInt(params.get("seed"), 10);
      if (Number.isFinite(qSeed)) {
        localStorage.setItem(`${SAVE_PREFIX}_last_seed`, String(qSeed));
        return qSeed;
      }

      const stored = parseInt(localStorage.getItem(`${SAVE_PREFIX}_last_seed`), 10);
      if (Number.isFinite(stored)) {
        return stored;
      }

      const randomSeed = Math.floor(Math.random() * 2147483647);
      localStorage.setItem(`${SAVE_PREFIX}_last_seed`, String(randomSeed));
      return randomSeed;
    }

    showMessage(text, kind = "ok", duration = 1800) {
      this.ui.message.textContent = text;
      this.ui.message.className = "show";
      this.ui.message.classList.add(kind === "warn" ? "warn" : "ok");
      clearTimeout(this._msgTimeout);
      this._msgTimeout = setTimeout(() => {
        this.ui.message.className = "";
      }, duration);
    }

    openChat(initialText = "/") {
      if (!this.ui.chatOverlay || !this.ui.chatInput || this.inventoryOpen) {
        return;
      }
      this.chatOpen = true;
      this.ui.chatOverlay.classList.add("visible");
      this.unlockPointer();
      this.controlsEnabled = false;
      this.ui.chatInput.value = initialText;
      this.ui.chatInput.focus();
      const caret = this.ui.chatInput.value.length;
      this.ui.chatInput.setSelectionRange(caret, caret);
    }

    closeChat(restoreControls = true) {
      if (!this.ui.chatOverlay || !this.ui.chatInput) {
        return;
      }
      this.chatOpen = false;
      this.ui.chatOverlay.classList.remove("visible");
      this.ui.chatInput.value = "";

      if (restoreControls && !this.inventoryOpen) {
        if (this.testMode) {
          this.controlsEnabled = true;
          this.ui.instructions.classList.add("hidden");
        } else if (document.pointerLockElement === this.renderer.domElement) {
          this.controlsEnabled = true;
        } else {
          this.lockPointer();
        }
      }
    }

    respawnPlayer() {
      if (!this.respawnPoint) {
        this.relocatePlayerToSurface();
      }
      this.player.position.copy(this.respawnPoint);
      this.player.velocity.set(0, 0, 0);
      this.breakState = null;
      this.targetInfo = null;
      this.selectionBox.visible = false;
      this.player.updateCamera();
      this.world.updateVisible(this.player.position.x, this.player.position.z);
      for (let i = 0; i < 10; i += 1) {
        this.world.processQueues(2, 3);
      }
      this.showMessage("Respawned at spawn point", "ok", 1400);
    }

    handleChatSubmit() {
      if (!this.ui.chatInput) {
        return;
      }
      const raw = this.ui.chatInput.value.trim();
      if (!raw) {
        this.closeChat(true);
        return;
      }

      if (raw.startsWith("/")) {
        const command = raw.slice(1).trim().toLowerCase();
        if (command === "respawn") {
          this.respawnPlayer();
        } else {
          this.showMessage(`Unknown command: /${command}`, "warn", 1600);
        }
      } else {
        this.showMessage("Single-player command chat: try /respawn", "warn", 1600);
      }

      this.closeChat(true);
    }

    createSelectionBox() {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
      const lines = new THREE.LineSegments(geo, mat);
      lines.visible = false;
      return lines;
    }

    buildUI() {
      this.ui.seedLabel.textContent = `Seed: ${this.seed}`;

      this.ui.hotbar.innerHTML = "";
      for (let i = 0; i < 9; i += 1) {
        const slot = document.createElement("div");
        slot.className = "hotbar-slot";
        slot.innerHTML = `<div class="slot-index">${i + 1}</div><div class="slot-name"></div><div class="slot-count"></div>`;
        this.ui.hotbar.appendChild(slot);
        this.hotbarEls.push(slot);
      }

      this.ui.invGrid.innerHTML = "";
      for (let i = 0; i < 27; i += 1) {
        const cell = document.createElement("div");
        cell.className = "inv-cell";
        cell.dataset.index = String(i);
        cell.draggable = false;
        cell.addEventListener("dragstart", (e) => {
          this.handleInventoryDragStart(e, i);
        });
        cell.addEventListener("dragend", (e) => {
          this.handleDragEnd(e);
        });
        cell.addEventListener("dragover", (e) => {
          this.handleInventoryDragOver(e);
        });
        cell.addEventListener("drop", (e) => {
          this.handleInventoryDrop(e, i);
        });
        cell.addEventListener("click", () => {
          this.handleInventoryCellClick(i);
        });
        this.ui.invGrid.appendChild(cell);
        this.invCells.push(cell);
        this.invCellItemIds.push(null);
      }

      this.ui.craftGrid.innerHTML = "";
      for (let i = 0; i < 9; i += 1) {
        const slot = document.createElement("div");
        slot.className = "craft-slot";
        slot.dataset.index = String(i);
        slot.draggable = false;
        slot.addEventListener("dragstart", (e) => {
          this.handleCraftDragStart(e, i);
        });
        slot.addEventListener("dragend", (e) => {
          this.handleDragEnd(e);
        });
        slot.addEventListener("dragover", (e) => {
          this.handleCraftDragOver(e);
        });
        slot.addEventListener("drop", (e) => {
          this.handleCraftDrop(e, i);
        });
        slot.addEventListener("click", () => {
          this.handleCraftSlotClick(i);
        });
        slot.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          if (!this.isCraftSlotUsable(i)) {
            return;
          }
          this.clearCraftAutofillHints();
          this.inventory.craftGrid[i] = null;
          this.updateInventoryUI();
        });
        slot.addEventListener("dblclick", () => {
          if (!this.isCraftSlotUsable(i)) {
            return;
          }
          this.clearCraftAutofillHints();
          this.inventory.craftGrid[i] = null;
          this.updateInventoryUI();
        });
        this.ui.craftGrid.appendChild(slot);
        this.craftCells.push(slot);
      }

      this.ui.craftBtn.addEventListener("click", () => {
        const activeCraftIndexes = this.getActiveCraftIndexes();
        const result = this.inventory.craft(activeCraftIndexes);
        if (result.ok) {
          this.sfx.craft();
          this.showMessage(`Crafted ${itemDisplayName(result.result.id)} x${result.result.count}`, "ok");
        } else {
          const gridLabel = this.craftingContext === "table" ? "3x3" : "2x2";
          this.showMessage(`No matching recipe for current ${gridLabel} grid`, "warn");
        }
        this.clearCraftAutofillHints();
        this.updateInventoryUI();
      });

      this.buildCraftOutputAutocomplete();
      if (this.ui.craftOutputInput) {
        this.ui.craftOutputInput.addEventListener("input", () => {
          this.applyOutputSelectionFromInput(false, false);
        });
        this.ui.craftOutputInput.addEventListener("change", () => {
          this.applyOutputSelectionFromInput(true, true);
        });
        this.ui.craftOutputInput.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") {
            return;
          }
          e.preventDefault();
          this.applyOutputSelectionFromInput(true, true);
        });
      }
    }

    getActiveCraftIndexes() {
      return this.craftingContext === "table" ? TABLE_CRAFT_INDEXES : INVENTORY_CRAFT_INDEXES;
    }

    isCraftSlotUsable(index) {
      return this.getActiveCraftIndexes().includes(index);
    }

    setCraftingContext(nextContext, tablePos = null) {
      if (nextContext === "table" && tablePos && Number.isFinite(tablePos.x) && Number.isFinite(tablePos.y) && Number.isFinite(tablePos.z)) {
        this.craftingContext = "table";
        this.craftingTablePos = {
          x: tablePos.x,
          y: tablePos.y,
          z: tablePos.z,
        };
        this.clearCraftAutofillHints();
        return;
      }
      this.craftingContext = "inventory";
      this.craftingTablePos = null;
      this.clearCraftAutofillHints();
    }

    clearCraftAutofillHints() {
      this.craftMissingSlots.clear();
    }

    normalizeCraftOutputQuery(raw) {
      return String(raw || "")
        .trim()
        .toLowerCase();
    }

    buildCraftOutputAutocomplete() {
      if (!this.ui.craftOutputList) {
        return;
      }

      const outputs = this.recipeBook.getCraftableOutputsSorted();
      this.craftOutputIds = outputs;
      this.craftOutputIdSet = new Set(outputs);
      this.craftOutputNameLookup.clear();
      this.ui.craftOutputList.innerHTML = "";

      for (let i = 0; i < outputs.length; i += 1) {
        const itemId = outputs[i];
        const itemName = this.recipeBook.getItemName(itemId);
        const key = this.normalizeCraftOutputQuery(itemName);
        if (key) {
          let list = this.craftOutputNameLookup.get(key);
          if (!list) {
            list = [];
            this.craftOutputNameLookup.set(key, list);
          }
          list.push(itemId);
        }

        const byName = document.createElement("option");
        byName.value = itemName;
        byName.label = itemId;
        this.ui.craftOutputList.appendChild(byName);

        const byId = document.createElement("option");
        byId.value = itemId;
        byId.label = itemName;
        this.ui.craftOutputList.appendChild(byId);
      }
    }

    resolveCraftOutputItemId(raw, allowPrefix = false) {
      const rawText = String(raw || "").trim();
      if (!rawText) {
        return null;
      }

      if (this.craftOutputIdSet.has(rawText)) {
        return rawText;
      }

      const lowerRawText = rawText.toLowerCase();
      if (this.craftOutputIdSet.has(lowerRawText)) {
        return lowerRawText;
      }

      const byName = this.craftOutputNameLookup.get(this.normalizeCraftOutputQuery(rawText));
      if (byName && byName.length > 0) {
        return byName[0];
      }

      if (!allowPrefix) {
        return null;
      }

      for (let i = 0; i < this.craftOutputIds.length; i += 1) {
        const itemId = this.craftOutputIds[i];
        const itemName = this.recipeBook.getItemName(itemId).toLowerCase();
        if (itemName.startsWith(lowerRawText)) {
          return itemId;
        }
      }

      for (let i = 0; i < this.craftOutputIds.length; i += 1) {
        const itemId = this.craftOutputIds[i];
        if (itemId.toLowerCase().includes(lowerRawText)) {
          return itemId;
        }
      }

      return null;
    }

    normalizeIngredientOptions(entry) {
      if (Array.isArray(entry)) {
        return entry.filter((token) => typeof token === "string" && token.length > 0);
      }
      if (typeof entry === "string" && entry.length > 0) {
        return [entry];
      }
      return [];
    }

    buildAutofillRequirements(recipe, activeCraftIndexes) {
      const type = recipe && typeof recipe.type === "string" ? recipe.type : "";
      const gridSize = this.craftingContext === "table" ? 3 : 2;

      const fromIngredients = (ingredientsRaw) => {
        if (!Array.isArray(ingredientsRaw)) {
          return null;
        }
        const ingredients = ingredientsRaw
          .map((entry) => this.normalizeIngredientOptions(entry))
          .filter((entry) => entry.length > 0);
        if (ingredients.length === 0 || ingredients.length > activeCraftIndexes.length) {
          return null;
        }
        const requirements = [];
        for (let i = 0; i < ingredients.length; i += 1) {
          requirements.push({
            slotIndex: activeCraftIndexes[i],
            options: ingredients[i],
          });
        }
        return requirements;
      };

      if (type === "minecraft:crafting_shaped") {
        if (!Array.isArray(recipe.pattern) || !recipe.pattern.length || !recipe.key || typeof recipe.key !== "object") {
          return null;
        }
        const rows = recipe.pattern.map((row) => String(row));
        const height = rows.length;
        const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
        if (height <= 0 || width <= 0 || height > gridSize || width > gridSize) {
          return null;
        }
        const requirements = [];
        for (let py = 0; py < height; py += 1) {
          for (let px = 0; px < width; px += 1) {
            const symbol = rows[py].charAt(px) || " ";
            if (symbol === " ") {
              continue;
            }
            const options = this.normalizeIngredientOptions(recipe.key[symbol]);
            if (options.length === 0) {
              return null;
            }
            requirements.push({
              slotIndex: py * 3 + px,
              options,
            });
          }
        }
        return requirements;
      }

      if (type === "minecraft:crafting_shapeless") {
        return fromIngredients(recipe.ingredients);
      }

      if (
        type === "minecraft:stonecutting" ||
        type === "minecraft:smelting" ||
        type === "minecraft:blasting" ||
        type === "minecraft:smoking" ||
        type === "minecraft:campfire_cooking"
      ) {
        return fromIngredients([recipe.ingredient]);
      }

      if (type === "minecraft:crafting_transmute") {
        return fromIngredients([recipe.input, recipe.material]);
      }

      if (type === "minecraft:smithing_transform" || type === "minecraft:smithing_trim") {
        return fromIngredients([recipe.template, recipe.base, recipe.addition]);
      }

      if (type === "minecraft:crafting_decorated_pot") {
        return fromIngredients(recipe.ingredients);
      }

      return null;
    }

    describeIngredientOptions(options) {
      if (!Array.isArray(options) || options.length === 0) {
        return "Unknown";
      }
      const token = options[0];
      if (typeof token !== "string" || token.length === 0) {
        return "Unknown";
      }
      if (token.startsWith("#")) {
        const tagName = token.slice(1);
        const shortTag = tagName.includes(":") ? tagName.split(":")[1] : tagName;
        return `Any ${titleCaseWords(shortTag)}`;
      }
      return this.recipeBook.getItemName(token);
    }

    pickAvailableIngredient(options, remaining) {
      const candidates = this.recipeBook.expandIngredientOptions(options);
      if (candidates.length === 0) {
        return null;
      }

      let bestItemId = null;
      let bestCount = 0;
      for (let i = 0; i < candidates.length; i += 1) {
        const itemId = candidates[i];
        const count = remaining.get(itemId) || 0;
        if (count > bestCount) {
          bestCount = count;
          bestItemId = itemId;
        }
      }
      return bestCount > 0 ? bestItemId : null;
    }

    autofillCraftGridForOutput(outputItemId) {
      const recipes = this.recipeBook.getRecipesByResult(outputItemId);
      if (!recipes || recipes.length === 0) {
        return { ok: false, reason: "no_recipe_for_output" };
      }

      const activeCraftIndexes = this.getActiveCraftIndexes();
      let bestPlan = null;

      for (let i = 0; i < recipes.length; i += 1) {
        const recipe = recipes[i];
        const requirements = this.buildAutofillRequirements(recipe, activeCraftIndexes);
        if (!requirements || requirements.length === 0) {
          continue;
        }

        const remaining = new Map(this.inventory.counts);
        const assignedSlots = new Map();
        const missingSlots = new Map();

        for (let r = 0; r < requirements.length; r += 1) {
          const req = requirements[r];
          const chosen = this.pickAvailableIngredient(req.options, remaining);
          if (chosen) {
            assignedSlots.set(req.slotIndex, chosen);
            remaining.set(chosen, (remaining.get(chosen) || 0) - 1);
          } else {
            missingSlots.set(req.slotIndex, this.describeIngredientOptions(req.options));
          }
        }

        const plan = {
          recipe,
          assignedSlots,
          missingSlots,
          missingCount: missingSlots.size,
          filledCount: assignedSlots.size,
          requirementCount: requirements.length,
        };

        if (
          !bestPlan ||
          plan.missingCount < bestPlan.missingCount ||
          (plan.missingCount === bestPlan.missingCount && plan.filledCount > bestPlan.filledCount) ||
          (plan.missingCount === bestPlan.missingCount &&
            plan.filledCount === bestPlan.filledCount &&
            plan.requirementCount < bestPlan.requirementCount)
        ) {
          bestPlan = plan;
        }
      }

      if (!bestPlan) {
        return { ok: false, reason: "no_supported_recipe" };
      }

      this.inventory.clearCraftGrid(activeCraftIndexes);
      this.clearCraftAutofillHints();
      for (const [slotIndex, itemId] of bestPlan.assignedSlots.entries()) {
        if (this.isCraftSlotUsable(slotIndex)) {
          this.inventory.craftGrid[slotIndex] = itemId;
        }
      }
      this.craftMissingSlots = new Map(bestPlan.missingSlots);
      this.selectedCraftItemId = null;
      return {
        ok: true,
        missingCount: bestPlan.missingCount,
        recipe: bestPlan.recipe,
      };
    }

    applyOutputSelectionFromInput(allowPrefix = false, showFeedback = false) {
      if (!this.ui.craftOutputInput) {
        return false;
      }

      const rawText = this.ui.craftOutputInput.value;
      if (!rawText || !rawText.trim()) {
        this.clearCraftAutofillHints();
        this.updateInventoryUI();
        return false;
      }

      const outputItemId = this.resolveCraftOutputItemId(rawText, allowPrefix);
      if (!outputItemId) {
        return false;
      }

      const result = this.autofillCraftGridForOutput(outputItemId);
      if (!result.ok) {
        if (showFeedback) {
          this.showMessage("No supported recipe layout for this output in current crafting grid", "warn", 1600);
        }
        return false;
      }

      this.ui.craftOutputInput.value = this.recipeBook.getItemName(outputItemId);
      if (showFeedback) {
        if (result.missingCount > 0) {
          this.showMessage(`Prepared recipe with ${result.missingCount} missing material slot(s)`, "warn", 1600);
        } else {
          this.showMessage("Prepared recipe from selected output", "ok", 1200);
        }
      }
      this.updateInventoryUI();
      return true;
    }

    setDragPayload(event, payload) {
      if (!event.dataTransfer) {
        return;
      }
      const raw = JSON.stringify(payload);
      event.dataTransfer.setData(this.dragMime, raw);
      event.dataTransfer.setData("text/plain", raw);
    }

    getDragPayload(event) {
      if (!event.dataTransfer) {
        return null;
      }
      const raw = event.dataTransfer.getData(this.dragMime) || event.dataTransfer.getData("text/plain");
      if (!raw) {
        return null;
      }
      try {
        const payload = JSON.parse(raw);
        if (!payload || typeof payload !== "object") {
          return null;
        }
        return payload;
      } catch (_err) {
        return null;
      }
    }

    canAssignCraftItem(index, itemId) {
      if (!itemId || !this.isCraftSlotUsable(index)) {
        return false;
      }
      const activeCraftIndexes = this.getActiveCraftIndexes();
      const assigned = this.inventory.countAssigned(itemId, index, activeCraftIndexes);
      return assigned < this.inventory.getCount(itemId);
    }

    handleInventoryCellClick(index) {
      if (index < 0 || index >= this.invCellItemIds.length) {
        return;
      }
      const itemId = this.invCellItemIds[index];
      if (!itemId) {
        this.selectedCraftItemId = null;
        this.updateInventoryUI();
        return;
      }

      if (this.selectedCraftItemId === itemId) {
        this.selectedCraftItemId = null;
      } else {
        this.selectedCraftItemId = itemId;
      }
      this.updateInventoryUI();
    }

    handleCraftSlotClick(index) {
      if (!this.isCraftSlotUsable(index)) {
        return;
      }
      if (!this.selectedCraftItemId) {
        return;
      }

      if (!this.canAssignCraftItem(index, this.selectedCraftItemId)) {
        return;
      }

      this.clearCraftAutofillHints();
      this.inventory.craftGrid[index] = this.selectedCraftItemId;
      this.updateInventoryUI();
    }

    handleInventoryDragStart(event, index) {
      const itemId = this.invCellItemIds[index];
      if (!itemId || !event.dataTransfer) {
        event.preventDefault();
        return;
      }
      this.setDragPayload(event, {
        source: "inventory",
        itemId,
        invIndex: index,
      });
      event.dataTransfer.effectAllowed = "copy";
      event.currentTarget.classList.add("dragging");
    }

    handleCraftDragStart(event, index) {
      if (!this.isCraftSlotUsable(index)) {
        event.preventDefault();
        return;
      }
      const itemId = this.inventory.craftGrid[index];
      if (!itemId || !event.dataTransfer) {
        event.preventDefault();
        return;
      }
      this.setDragPayload(event, {
        source: "craft",
        itemId,
        craftIndex: index,
      });
      event.dataTransfer.effectAllowed = "move";
      event.currentTarget.classList.add("dragging");
    }

    handleDragEnd(event) {
      if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.remove("dragging");
      }
    }

    handleCraftDragOver(event) {
      const target = event.currentTarget;
      if (target && target.dataset && Number.isInteger(Number.parseInt(target.dataset.index, 10))) {
        const index = Number.parseInt(target.dataset.index, 10);
        if (!this.isCraftSlotUsable(index)) {
          return;
        }
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }

    handleInventoryDragOver(event) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    }

    handleCraftDrop(event, targetIndex) {
      event.preventDefault();
      if (!this.isCraftSlotUsable(targetIndex)) {
        return;
      }
      const payload = this.getDragPayload(event);
      if (!payload) {
        return;
      }

      if (payload.source === "inventory") {
        if (!this.canAssignCraftItem(targetIndex, payload.itemId)) {
          return;
        }
        this.clearCraftAutofillHints();
        this.inventory.craftGrid[targetIndex] = payload.itemId;
        this.updateInventoryUI();
        return;
      }

      if (payload.source === "craft" && Number.isInteger(payload.craftIndex)) {
        const sourceIndex = payload.craftIndex;
        if (sourceIndex < 0 || sourceIndex >= this.inventory.craftGrid.length) {
          return;
        }
        if (!this.isCraftSlotUsable(sourceIndex)) {
          return;
        }
        if (sourceIndex === targetIndex) {
          return;
        }

        const sourceItem = this.inventory.craftGrid[sourceIndex];
        if (!sourceItem) {
          return;
        }
        this.clearCraftAutofillHints();
        const targetItem = this.inventory.craftGrid[targetIndex];
        this.inventory.craftGrid[targetIndex] = sourceItem;
        this.inventory.craftGrid[sourceIndex] = targetItem || null;
        this.updateInventoryUI();
      }
    }

    handleInventoryDrop(event, _targetIndex) {
      event.preventDefault();
      const payload = this.getDragPayload(event);
      if (!payload) {
        return;
      }

      if (payload.source === "craft" && Number.isInteger(payload.craftIndex)) {
        const sourceIndex = payload.craftIndex;
        if (sourceIndex < 0 || sourceIndex >= this.inventory.craftGrid.length) {
          return;
        }
        if (!this.isCraftSlotUsable(sourceIndex)) {
          return;
        }
        this.clearCraftAutofillHints();
        this.inventory.craftGrid[sourceIndex] = null;
        this.updateInventoryUI();
      }
    }

    bindEvents() {
      window.addEventListener("resize", () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      document.addEventListener("contextmenu", (e) => {
        e.preventDefault();
      });

      document.addEventListener("keydown", (e) => {
        const activeEl = document.activeElement;
        const isTypingInField =
          !!activeEl &&
          (activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.tagName === "SELECT" ||
            !!activeEl.isContentEditable);

        if (e.code === "Escape") {
          e.preventDefault();
          if (this.inventoryOpen) {
            this.toggleInventory(false);
          }
          if (this.ui.instructions && !this.ui.instructions.classList.contains("hidden")) {
            this.ui.instructions.classList.add("hidden");
          }
          return;
        }

        if (isTypingInField) {
          return;
        }

        if (e.code === "KeyI") {
          e.preventDefault();
          this.toggleInventory();
          return;
        }

        this.keys[e.code] = true;

        if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight") {
          e.preventDefault();
        }

        if (e.code === "KeyG") {
          e.preventDefault();
          this.player.toggleMode();
          this.updateHUD(true);
          this.showMessage(`Mode: ${this.player.mode === "creative" ? "Creative" : "Survival"}`, "ok");
          return;
        }

        if (e.code === "KeyF") {
          e.preventDefault();
          if (this.player.mode === "creative") {
            this.player.toggleFlying();
            this.showMessage(this.player.flying ? "Flying enabled" : "Flying disabled", "ok");
          }
          return;
        }

        if (e.code === "KeyT") {
          e.preventDefault();
          this.dayNightSpeed = this.dayNightSpeed === 1 ? 0.2 : 1;
          this.showMessage(this.dayNightSpeed === 1 ? "Day/night speed: normal" : "Day/night speed: slow", "ok");
          return;
        }

        if (e.code === "Space") {
          this.player.onSpaceTap();
        }

        let hotbarIndex = -1;
        if (/^Digit[1-9]$/.test(e.code)) {
          hotbarIndex = Number.parseInt(e.code.slice(5), 10) - 1;
        } else if (/^Numpad[1-9]$/.test(e.code)) {
          hotbarIndex = Number.parseInt(e.code.slice(6), 10) - 1;
        } else {
          const num = Number.parseInt(e.key, 10);
          if (Number.isInteger(num) && num >= 1 && num <= 9) {
            hotbarIndex = num - 1;
          }
        }

        if (hotbarIndex >= 0 && hotbarIndex < HOTBAR_DEFAULTS.length) {
          e.preventDefault();
          this.inventory.selectedHotbar = hotbarIndex;
          this.updateHUD();
        }
      });

      document.addEventListener("keyup", (e) => {
        this.keys[e.code] = false;
      });

      this.ui.playBtn.addEventListener("click", () => {
        this.lockPointer();
      });

      this.renderer.domElement.addEventListener("click", () => {
        if (!this.inventoryOpen && !this.controlsEnabled) {
          this.lockPointer();
        }
      });

      document.addEventListener("pointerlockchange", () => {
        const locked = document.pointerLockElement === this.renderer.domElement;
        this.controlsEnabled = locked && !this.inventoryOpen;
        if (locked) {
          this.ui.instructions.classList.add("hidden");
          this.sfx.ensureCtx();
        } else if (!this.inventoryOpen) {
          this.ui.instructions.classList.remove("hidden");
        }
      });

      document.addEventListener("mousemove", (e) => {
        if (!this.controlsEnabled || this.inventoryOpen) {
          return;
        }
        this.player.look(e.movementX, e.movementY);
      });

      document.addEventListener("mousedown", (e) => {
        if (!this.controlsEnabled || this.inventoryOpen) {
          return;
        }
        if (e.button === 0) {
          this.leftMouseDown = true;
          this.tryStartBreaking();
        }
        if (e.button === 2) {
          if (!this.tryUseBlock()) {
            this.tryPlaceBlock();
          }
        }
      });

      document.addEventListener("mouseup", (e) => {
        if (e.button === 0) {
          this.leftMouseDown = false;
          this.breakState = null;
        }
      });

      window.addEventListener("beforeunload", () => {
        this.saveGame();
      });
    }

    lockPointer() {
      if (this.inventoryOpen) {
        this.toggleInventory(false);
      }
      if (this.testMode) {
        this.controlsEnabled = true;
        this.ui.instructions.classList.add("hidden");
        return;
      }

      if (typeof this.renderer.domElement.requestPointerLock !== "function") {
        this.showMessage("Pointer lock is not supported by this browser", "warn");
        return;
      }

      try {
        const lockResult = this.renderer.domElement.requestPointerLock();
        if (lockResult && typeof lockResult.catch === "function") {
          lockResult.catch(() => {
            this.showMessage("Pointer lock was blocked. Click and try again.", "warn");
          });
        }
      } catch (err) {
        this.showMessage("Pointer lock failed. Click and try again.", "warn");
      }
    }

    unlockPointer() {
      if (this.testMode) {
        return;
      }
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock();
      }
    }

    toggleInventory(forceState = null, context = "inventory", tablePos = null) {
      const next = forceState === null ? !this.inventoryOpen : !!forceState;
      this.inventoryOpen = next;
      this.ui.inventory.classList.toggle("visible", this.inventoryOpen);

      if (this.inventoryOpen) {
        this.setCraftingContext(context, tablePos);
        this.unlockPointer();
        this.controlsEnabled = false;
      } else {
        this.setCraftingContext("inventory");
        this.selectedCraftItemId = null;
        this.clearCraftAutofillHints();
        if (this.testMode) {
          this.controlsEnabled = true;
          this.ui.instructions.classList.add("hidden");
        } else {
          // Keep the intro overlay dismissed when closing inventory/crafting UI.
          // Player can still click to re-lock pointer if needed.
          this.controlsEnabled = document.pointerLockElement === this.renderer.domElement;
          this.ui.instructions.classList.add("hidden");
        }
      }

      this.updateInventoryUI();
    }

    getRegressionSnapshot() {
      let modifiedBlocks = 0;
      for (const map of this.world.modifiedChunks.values()) {
        modifiedBlocks += map.size;
      }

      return {
        mode: this.player.mode,
        flying: this.player.flying,
        inventoryOpen: this.inventoryOpen,
        craftingContext: this.craftingContext,
        controlsEnabled: this.controlsEnabled,
        selectedHotbar: this.inventory.selectedHotbar,
        logs: this.inventory.getCount("minecraft:oak_log"),
        planks: this.inventory.getCount("minecraft:oak_planks"),
        chunksLoaded: this.world.chunks.size,
        modifiedBlocks,
        position: {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z,
        },
      };
    }

    give(itemId, count = 1) {
      if (typeof itemId !== "string" || !itemId) {
        return false;
      }
      const amount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
      this.inventory.add(itemId, amount);
      this.updateHUD(true);
      this.showMessage(`Given ${itemDisplayName(itemId)} x${amount}`, "ok", 1200);
      return true;
    }

    giveAllRecipeItems(count = 32) {
      const amount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 32;
      const items = this.recipeBook.getKnownItemsSorted();
      for (let i = 0; i < items.length; i += 1) {
        this.inventory.add(items[i], amount);
      }
      this.updateHUD(true);
      this.showMessage(`Given all known items x${amount}`, "ok");
    }

    bootstrapChunks() {
      const spawnCx = Math.floor(this.player.position.x / CHUNK_SIZE);
      const spawnCz = Math.floor(this.player.position.z / CHUNK_SIZE);
      for (let dx = -2; dx <= 2; dx += 1) {
        for (let dz = -2; dz <= 2; dz += 1) {
          const cx = spawnCx + dx;
          const cz = spawnCz + dz;
          this.world.enqueueChunk(cx, cz);
        }
      }
      this.world.updateVisible(this.player.position.x, this.player.position.z);
      for (let i = 0; i < 15; i += 1) {
        this.world.processQueues(2, 3);
      }
      this.relocatePlayerToSurface();
    }

    relocatePlayerToSurface() {
      let y = WORLD_HEIGHT - 2;
      const px = Math.floor(this.player.position.x);
      const pz = Math.floor(this.player.position.z);

      while (y > 2) {
        const b = this.world.getBlock(px, y, pz, true);
        const above = this.world.getBlock(px, y + 1, pz, true);
        const head = this.world.getBlock(px, y + 2, pz, true);
        if (
          BLOCK_INFO[b].solid &&
          !BLOCK_INFO[above].solid &&
          !BLOCK_INFO[above].liquid &&
          !BLOCK_INFO[head].solid &&
          !BLOCK_INFO[head].liquid
        ) {
          this.player.position.y = y + 1.01;
          this.player.updateCamera();
          return;
        }
        y -= 1;
      }
    }

    updateRaycastTarget() {
      this.targetInfo = null;
      this.selectionBox.visible = false;
      if (!this.controlsEnabled || this.inventoryOpen) {
        return;
      }

      this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
      const targets = this.world.getRaycastTargets();
      if (targets.length === 0) {
        return;
      }
      const hits = this.raycaster.intersectObjects(targets, false);
      if (!hits || hits.length === 0) {
        return;
      }

      const hit = hits[0];
      if (!hit || !hit.face) {
        return;
      }
      const normal = hit.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();
      normal.x = Math.round(normal.x);
      normal.y = Math.round(normal.y);
      normal.z = Math.round(normal.z);

      const breakPos = hit.point.clone().addScaledVector(normal, -0.01);
      const placePos = hit.point.clone().addScaledVector(normal, 0.01);

      const bx = Math.floor(breakPos.x);
      const by = Math.floor(breakPos.y);
      const bz = Math.floor(breakPos.z);
      const px = Math.floor(placePos.x);
      const py = Math.floor(placePos.y);
      const pz = Math.floor(placePos.z);

      const hitBlock = this.world.getBlock(bx, by, bz, true);
      if (hitBlock === BLOCK.AIR) {
        return;
      }

      this.targetInfo = {
        hit: { x: bx, y: by, z: bz, blockId: hitBlock },
        place: { x: px, y: py, z: pz },
        normal,
      };

      this.selectionBox.position.set(bx + 0.5, by + 0.5, bz + 0.5);
      this.selectionBox.visible = true;
    }

    tryStartBreaking() {
      if (!this.targetInfo) {
        this.breakState = null;
        return;
      }

      const { x, y, z, blockId } = this.targetInfo.hit;
      const info = BLOCK_INFO[blockId];
      if (!info || blockId === BLOCK.AIR || blockId === BLOCK.WATER) {
        this.breakState = null;
        return;
      }

      const hardness = this.player.mode === "creative" ? 0.05 : clamp(info.hardness * 0.35, 0.1, 1.2);
      this.breakState = {
        key: worldKey(x, y, z),
        x,
        y,
        z,
        blockId,
        progress: 0,
        threshold: hardness,
      };
    }

    updateBreaking(dt) {
      if (!this.leftMouseDown) {
        return;
      }

      // Hold-to-dig: when previous block finishes, immediately begin mining next targeted block.
      if (!this.breakState) {
        this.tryStartBreaking();
        if (!this.breakState) {
          return;
        }
      }

      if (!this.targetInfo) {
        this.breakState = null;
        return;
      }

      const keyNow = worldKey(this.targetInfo.hit.x, this.targetInfo.hit.y, this.targetInfo.hit.z);
      if (keyNow !== this.breakState.key) {
        this.tryStartBreaking();
        return;
      }

      this.breakState.progress += dt;
      const ratio = clamp(this.breakState.progress / this.breakState.threshold, 0, 1);
      const pulse = 1 + ratio * 0.05;
      this.selectionBox.scale.setScalar(pulse);
      this.selectionBox.material.color.setRGB(1, 1 - ratio * 0.6, 1 - ratio * 0.6);

      if (this.breakState.progress >= this.breakState.threshold) {
        this.breakBlock(this.breakState.x, this.breakState.y, this.breakState.z, this.breakState.blockId);
        this.breakState = null;
      }
    }

    breakBlock(x, y, z, blockId) {
      const ok = this.world.setBlock(x, y, z, BLOCK.AIR);
      if (!ok) {
        return;
      }

      const drop = BLOCK_INFO[blockId].drop;
      if (this.player.mode !== "creative" && drop !== BLOCK.AIR) {
        this.inventory.add(drop, 1);
      }

      this.sfx.break();
      this.particles.spawn(x, y, z, BLOCK_INFO[blockId].color, 10);
      this.updateHUD();
    }

    tryUseBlock() {
      if (!this.targetInfo || !this.targetInfo.hit) {
        return false;
      }

      const hit = this.targetInfo.hit;
      if (hit.blockId !== BLOCK.CRAFTING_TABLE) {
        return false;
      }

      this.toggleInventory(true, "table", {
        x: hit.x,
        y: hit.y,
        z: hit.z,
      });
      this.showMessage("Opened crafting table (3x3)", "ok", 1200);
      return true;
    }

    tryPlaceBlock() {
      const now = performance.now();
      if (now - this.lastPlaceTime < 110) {
        return;
      }
      this.lastPlaceTime = now;

      if (!this.targetInfo) {
        return;
      }

      const place = this.targetInfo.place;
      if (place.y < 1 || place.y >= WORLD_HEIGHT) {
        return;
      }

      const selected = this.inventory.getSelectedBlock();
      const info = BLOCK_INFO[selected];
      if (!info || selected === BLOCK.AIR) {
        return;
      }

      if (this.player.mode !== "creative") {
        if (this.inventory.getCount(selected) <= 0) {
          this.showMessage("No blocks left in selected slot", "warn");
          return;
        }
      }

      if (info.solid && this.player.intersectsBlock(place.x, place.y, place.z)) {
        return;
      }

      const existing = this.world.getBlock(place.x, place.y, place.z, true);
      if (existing !== BLOCK.AIR && existing !== BLOCK.WATER && existing !== BLOCK.LEAVES) {
        return;
      }

      const placed = this.world.setBlock(place.x, place.y, place.z, selected);
      if (!placed) {
        return;
      }

      if (this.player.mode !== "creative") {
        this.inventory.remove(selected, 1);
      }

      this.sfx.place();
      this.particles.spawn(place.x, place.y, place.z, BLOCK_INFO[selected].color, 5);
      this.updateHUD();
    }

    validateCraftingTableSession() {
      if (!this.inventoryOpen || this.craftingContext !== "table" || !this.craftingTablePos) {
        return;
      }

      const { x, y, z } = this.craftingTablePos;
      if (this.world.getBlock(x, y, z, true) !== BLOCK.CRAFTING_TABLE) {
        this.toggleInventory(false);
        this.showMessage("Crafting table was removed", "warn");
        return;
      }

      const dx = this.player.position.x - (x + 0.5);
      const dy = this.player.position.y - (y + 0.5);
      const dz = this.player.position.z - (z + 0.5);
      const maxDistance = MAX_INTERACT_DISTANCE + 1.5;
      if (dx * dx + dy * dy + dz * dz > maxDistance * maxDistance) {
        this.toggleInventory(false);
        this.showMessage("Moved too far from crafting table", "warn");
      }
    }

    updateDayNight(dt) {
      this.timeOfDay = (this.timeOfDay + dt * 0.015 * this.dayNightSpeed) % 1;
      const angle = this.timeOfDay * Math.PI * 2;
      const sunY = Math.sin(angle);
      const sunX = Math.cos(angle);
      const sunZ = Math.sin(angle * 0.55);

      this.sunLight.position.set(sunX * 90, sunY * 120, sunZ * 90);

      const daylight = clamp((sunY + 0.28) / 1.28, 0, 1);
      this.sunLight.intensity = lerp(0.08, 1.05, daylight);
      this.ambient.intensity = lerp(0.12, 0.58, daylight);

      const dayColor = new THREE.Color(0x88c7ff);
      const nightColor = new THREE.Color(0x06111d);
      const fogColor = nightColor.clone().lerp(dayColor, daylight);
      this.scene.fog.color.copy(fogColor);
      this.scene.background = fogColor;
    }

    updateHUD(force = false) {
      for (let i = 0; i < this.hotbarEls.length; i += 1) {
        const slot = this.hotbarEls[i];
        const blockId = HOTBAR_DEFAULTS[i];
        const info = BLOCK_INFO[blockId];
        const nameEl = slot.querySelector(".slot-name");
        const countEl = slot.querySelector(".slot-count");
        const count = this.inventory.getCount(blockId);

        nameEl.textContent = info.name;
        if (this.player.mode === "creative") {
          countEl.textContent = "∞";
        } else {
          countEl.textContent = String(count);
        }

        slot.classList.toggle("selected", i === this.inventory.selectedHotbar);
      }

      const flyText = this.player.mode === "creative" ? ` | Fly: ${this.player.flying ? "On" : "Off"}` : "";
      this.ui.modeLabel.textContent = `Mode: ${this.player.mode === "creative" ? "Creative" : "Survival"}${flyText}`;

      if (force) {
        this.updateInventoryUI();
      }
    }

    updateInventoryUI() {
      const activeCraftIndexes = this.getActiveCraftIndexes();
      const activeCraftSet = new Set(activeCraftIndexes);
      const usingCraftingTable = this.craftingContext === "table";

      if (this.selectedCraftItemId && this.inventory.getCount(this.selectedCraftItemId) <= 0) {
        this.selectedCraftItemId = null;
      }

      const ownedEntries = Array.from(this.inventory.counts.entries())
        .filter((entry) => entry[1] > 0)
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return this.recipeBook.getItemName(a[0]).localeCompare(this.recipeBook.getItemName(b[0]));
        });

      for (let i = 0; i < this.invCells.length; i += 1) {
        const cell = this.invCells[i];
        const entry = ownedEntries[i];
        if (!entry) {
          this.invCellItemIds[i] = null;
          cell.innerHTML = "Empty";
          cell.draggable = false;
          cell.classList.remove("draggable");
          cell.classList.remove("selected");
          continue;
        }
        const [itemId, count] = entry;
        this.invCellItemIds[i] = itemId;
        cell.innerHTML = `${this.recipeBook.getItemName(itemId)}<span class="count">${count}</span>`;
        cell.draggable = true;
        cell.classList.add("draggable");
        cell.classList.toggle("selected", itemId === this.selectedCraftItemId);
      }

      if (this.ui.craftTitle) {
        this.ui.craftTitle.textContent = usingCraftingTable ? "Crafting Table 3x3" : "Crafting 2x2 (Inventory)";
      }
      if (this.ui.craftHint) {
        this.ui.craftHint.textContent = usingCraftingTable
          ? "3x3 crafting is active. Type/select an Output, then Craft Output. You can also drag or click-fill slots."
          : "2x2 crafting is active here. Type/select an Output to auto-fill. Place/right-click a crafting table for 3x3.";
      }
      if (this.ui.craftGrid) {
        this.ui.craftGrid.classList.toggle("inventory-2x2", !usingCraftingTable);
      }

      for (let i = 0; i < this.craftCells.length; i += 1) {
        const slot = this.craftCells[i];
        const usable = activeCraftSet.has(i);
        const id = this.inventory.craftGrid[i];
        const missing = this.craftMissingSlots.get(i) || null;
        if (!usable) {
          slot.textContent = "Locked";
          slot.draggable = false;
          slot.classList.remove("filled");
          slot.classList.add("locked");
          slot.classList.add("hidden-slot");
          slot.classList.remove("missing");
          slot.removeAttribute("title");
          continue;
        }

        if (id) {
          slot.textContent = this.recipeBook.getItemName(id);
          slot.removeAttribute("title");
        } else if (missing) {
          slot.textContent = `Missing: ${missing}`;
          slot.title = `Missing material: ${missing}`;
        } else {
          slot.textContent = "Empty";
          slot.removeAttribute("title");
        }

        slot.draggable = !!id;
        slot.classList.toggle("filled", !!id);
        slot.classList.toggle("missing", !id && !!missing);
        slot.classList.remove("locked");
        slot.classList.remove("hidden-slot");
      }

      const preview = this.inventory.craftPreview(activeCraftIndexes);
      if (!preview) {
        this.ui.craftResult.textContent = "Output: Empty";
      } else {
        this.ui.craftResult.textContent = `Output: ${this.recipeBook.getItemName(preview.itemId)} x${preview.count}`;
      }
    }

    updateFPS(dt) {
      this.fpsState.frameCount += 1;
      this.fpsState.elapsed += dt;
      if (this.fpsState.elapsed >= 0.35) {
        this.fpsState.fps = Math.round(this.fpsState.frameCount / this.fpsState.elapsed);
        this.fpsState.frameCount = 0;
        this.fpsState.elapsed = 0;

        const p = this.player.position;
        this.ui.stats.textContent = `FPS: ${this.fpsState.fps} | XYZ: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} | Chunks: ${this.world.chunks.size}`;
      }
    }

    loadGame() {
      const raw = localStorage.getItem(this.saveKey);
      if (!raw) {
        return;
      }

      try {
        const state = JSON.parse(raw);
        if (state.seed !== this.seed) {
          return;
        }

        this.world.loadMods(state.modifiedChunks);
        if (state.player && typeof state.player === "object") {
          this.player.position.set(
            Number.isFinite(state.player.x) ? state.player.x : 0.5,
            Number.isFinite(state.player.y) ? state.player.y : 70,
            Number.isFinite(state.player.z) ? state.player.z : 0.5
          );
          if (state.player.mode === "creative" || state.player.mode === "survival") {
            this.player.setMode(state.player.mode);
          }
          if (typeof state.player.flying === "boolean" && this.player.mode === "creative") {
            this.player.flying = state.player.flying;
          }
          if (Number.isFinite(state.player.yaw)) {
            this.player.yaw = state.player.yaw;
          }
          if (Number.isFinite(state.player.pitch)) {
            this.player.pitch = clamp(state.player.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
          }
        }

        if (state.inventory) {
          this.inventory.load(state.inventory);
        }

        if (Number.isFinite(state.timeOfDay)) {
          this.timeOfDay = state.timeOfDay;
        }

        this.player.updateCamera();
        this.showMessage("Loaded saved world state", "ok");
      } catch (err) {
        console.warn("Failed to load BrowserCraft save", err);
      }
    }

    saveGame() {
      const state = {
        version: SAVE_VERSION,
        seed: this.seed,
        timeOfDay: this.timeOfDay,
        player: {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z,
          yaw: this.player.yaw,
          pitch: this.player.pitch,
          mode: this.player.mode,
          flying: this.player.flying,
        },
        inventory: this.inventory.toJSON(),
        modifiedChunks: this.world.serializeMods(),
      };

      try {
        localStorage.setItem(this.saveKey, JSON.stringify(state));
      } catch (err) {
        console.warn("Saving world failed", err);
      }
    }

    animate(now) {
      const dt = clamp((now - this.lastFrameTime) / 1000, 0.001, 0.05);
      this.lastFrameTime = now;

      this.updateFPS(dt);
      this.updateDayNight(dt);

      this.player.update(dt, this.keys, this.controlsEnabled, this.inventoryOpen);
      this.validateCraftingTableSession();

      this.chunkUpdateTimer += dt;
      if (this.chunkUpdateTimer >= 0.14) {
        this.chunkUpdateTimer = 0;
        this.world.updateVisible(this.player.position.x, this.player.position.z);
      }

      this.world.processQueues(2, 3);

      this.updateRaycastTarget();
      this.updateBreaking(dt);

      if (this.selectionBox.visible && !this.breakState) {
        this.selectionBox.scale.setScalar(1);
        this.selectionBox.material.color.set(0xffffff);
      }

      this.particles.update(dt);

      this.saveTimer += dt;
      if (this.saveTimer >= 12) {
        this.saveTimer = 0;
        this.saveGame();
      }

      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this.animate);
    }
  }

  if (typeof THREE === "undefined") {
    const msg = document.getElementById("message");
    if (msg) {
      msg.textContent = "Failed to load Three.js. Check network/CDN access.";
      msg.className = "show warn";
    }
    throw new Error("Three.js is required for BrowserCraft.");
  }

  const game = new BrowserCraft();
  if (typeof window !== "undefined") {
    window.__BROWSERCRAFT__ = game;
  }
})();
