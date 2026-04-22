#!/usr/bin/env python3
"""
Import vanilla Minecraft recipe JSONs into a BrowserCraft runtime bundle.

Usage:
  python3 tools/import_minecraft_recipes.py \
    --source /Users/yishengj/Desktop/minecraft_recipes/data/minecraft/recipe \
    --out /Users/yishengj/mc4/data/recipes.generated.js
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
from collections import Counter
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


SUPPORTED_TYPES = {
    "minecraft:crafting_shaped",
    "minecraft:crafting_shapeless",
    "minecraft:stonecutting",
    "minecraft:smelting",
    "minecraft:blasting",
    "minecraft:smoking",
    "minecraft:campfire_cooking",
    "minecraft:smithing_transform",
    "minecraft:smithing_trim",
    "minecraft:crafting_transmute",
    "minecraft:crafting_decorated_pot",
    "minecraft:crafting_special_bookcloning",
    "minecraft:crafting_special_firework_star_fade",
    "minecraft:crafting_special_firework_rocket",
    "minecraft:crafting_special_mapcloning",
    "minecraft:crafting_special_repairitem",
    "minecraft:crafting_special_bannerduplicate",
    "minecraft:crafting_special_armordye",
    "minecraft:crafting_special_tippedarrow",
    "minecraft:crafting_special_firework_star",
    "minecraft:crafting_special_mapextending",
    "minecraft:crafting_special_shielddecoration",
}


def ns_item(v: str) -> str:
    v = v.strip()
    if not v:
        return ""
    if ":" in v:
        return v
    return f"minecraft:{v}"


def ns_tag(v: str) -> str:
    vv = v.strip()
    if vv.startswith("#"):
        vv = vv[1:]
    if not vv:
        return "#minecraft:unknown"
    if ":" in vv:
        return f"#{vv}"
    return f"#minecraft:{vv}"


def uniq_keep_order(values: Iterable[str]) -> List[str]:
    out: List[str] = []
    seen: Set[str] = set()
    for v in values:
        if not v or v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def normalize_ingredient(expr: Any) -> List[str]:
    """Normalize ingredient expression into OR-able tokens.

    Token values are either:
    - minecraft:item_id
    - #minecraft:tag_id
    """
    if expr is None:
        return []

    if isinstance(expr, str):
        if expr.startswith("#"):
            return [ns_tag(expr)]
        return [ns_item(expr)]

    if isinstance(expr, list):
        out: List[str] = []
        for part in expr:
            out.extend(normalize_ingredient(part))
        return uniq_keep_order(out)

    if isinstance(expr, dict):
        if "item" in expr and isinstance(expr["item"], str):
            return [ns_item(expr["item"])]
        if "id" in expr and isinstance(expr["id"], str):
            # Some data packs use id for ingredients.
            val = expr["id"]
            if val.startswith("#"):
                return [ns_tag(val)]
            return [ns_item(val)]
        if "tag" in expr and isinstance(expr["tag"], str):
            return [ns_tag(expr["tag"])]
        out2: List[str] = []
        for val in expr.values():
            out2.extend(normalize_ingredient(val))
        return uniq_keep_order(out2)

    return []


def parse_result(obj: Any) -> Optional[Dict[str, Any]]:
    if obj is None:
        return None

    if isinstance(obj, str):
        item_id = ns_item(obj)
        return {"id": item_id, "count": 1}

    if isinstance(obj, dict):
        rid = obj.get("id") or obj.get("item")
        if not isinstance(rid, str):
            return None
        item_id = ns_item(rid)
        count = obj.get("count", 1)
        if not isinstance(count, int) or count <= 0:
            count = 1
        return {"id": item_id, "count": count}

    return None


def strip_ns(item_id: str) -> str:
    return item_id.split(":", 1)[1] if ":" in item_id else item_id


def item_matches(item_id: str, *, suffix: Optional[str] = None, prefix: Optional[str] = None) -> bool:
    raw = strip_ns(item_id)
    if suffix and not raw.endswith(suffix):
        return False
    if prefix and not raw.startswith(prefix):
        return False
    return True


def expand_tag(tag: str, items: Set[str]) -> List[str]:
    """Best-effort expansion for tags referenced by vanilla recipe files.

    Input tag must be namespaced and include leading #.
    """
    t = ns_tag(tag)
    raw = t[1:]  # remove #
    if raw.startswith("minecraft:"):
        body = raw.split(":", 1)[1]
    else:
        body = raw

    items_sorted = sorted(items)

    def pick(pred) -> List[str]:
        return [iid for iid in items_sorted if pred(iid)]

    direct_map: Dict[str, List[str]] = {
        "coals": ["minecraft:coal", "minecraft:charcoal"],
        "stone_crafting_materials": [
            "minecraft:cobblestone",
            "minecraft:blackstone",
            "minecraft:cobbled_deepslate",
        ],
        "smelts_to_glass": ["minecraft:sand", "minecraft:red_sand"],
        "soul_fire_base_blocks": ["minecraft:soul_sand", "minecraft:soul_soil"],
        "eggs": ["minecraft:egg"],
        "netherite_tool_materials": ["minecraft:netherite_ingot"],
        "diamond_tool_materials": ["minecraft:diamond"],
        "copper_tool_materials": ["minecraft:copper_ingot"],
        "iron_tool_materials": ["minecraft:iron_ingot"],
        "gold_tool_materials": ["minecraft:gold_ingot"],
        "wooden_tool_materials": [
            "minecraft:oak_planks",
            "minecraft:spruce_planks",
            "minecraft:birch_planks",
            "minecraft:jungle_planks",
            "minecraft:acacia_planks",
            "minecraft:dark_oak_planks",
            "minecraft:mangrove_planks",
            "minecraft:cherry_planks",
            "minecraft:bamboo_planks",
            "minecraft:crimson_planks",
            "minecraft:warped_planks",
            "minecraft:pale_oak_planks",
        ],
        "stone_tool_materials": [
            "minecraft:cobblestone",
            "minecraft:blackstone",
            "minecraft:cobbled_deepslate",
        ],
        "trim_materials": [
            "minecraft:quartz",
            "minecraft:iron_ingot",
            "minecraft:copper_ingot",
            "minecraft:gold_ingot",
            "minecraft:emerald",
            "minecraft:diamond",
            "minecraft:lapis_lazuli",
            "minecraft:redstone",
            "minecraft:netherite_ingot",
            "minecraft:amethyst_shard",
            "minecraft:resin_brick",
        ],
    }

    if body in direct_map:
        return [x for x in direct_map[body] if x in items]

    if body == "planks":
        return pick(lambda iid: item_matches(iid, suffix="_planks"))

    if body == "wooden_slabs":
        plank_names = {strip_ns(x) for x in items if strip_ns(x).endswith("_planks")}
        return pick(
            lambda iid: strip_ns(iid).endswith("_slab")
            and strip_ns(iid).replace("_slab", "_planks") in plank_names
        )

    if body == "logs":
        return pick(
            lambda iid: strip_ns(iid).endswith("_log")
            or strip_ns(iid).endswith("_wood")
            or strip_ns(iid).endswith("_stem")
            or strip_ns(iid).endswith("_hyphae")
        )

    if body == "logs_that_burn":
        return pick(
            lambda iid: strip_ns(iid).endswith("_log")
            or strip_ns(iid).endswith("_wood")
            or strip_ns(iid) in {"bamboo_block", "stripped_bamboo_block"}
        )

    if body.endswith("_logs"):
        wood = body[: -len("_logs")]
        return pick(
            lambda iid: strip_ns(iid)
            in {
                f"{wood}_log",
                f"stripped_{wood}_log",
                f"{wood}_wood",
                f"stripped_{wood}_wood",
            }
        )

    if body == "warped_stems":
        return pick(
            lambda iid: strip_ns(iid)
            in {"warped_stem", "stripped_warped_stem", "warped_hyphae", "stripped_warped_hyphae"}
        )

    if body == "crimson_stems":
        return pick(
            lambda iid: strip_ns(iid)
            in {"crimson_stem", "stripped_crimson_stem", "crimson_hyphae", "stripped_crimson_hyphae"}
        )

    if body == "bamboo_blocks":
        return pick(lambda iid: strip_ns(iid) in {"bamboo_block", "stripped_bamboo_block"})

    if body == "leaves":
        return pick(
            lambda iid: strip_ns(iid).endswith("_leaves")
            or strip_ns(iid) in {"azalea_leaves", "flowering_azalea_leaves"}
        )

    if body == "wool":
        return pick(lambda iid: strip_ns(iid).endswith("_wool") or strip_ns(iid) == "wool")

    if body == "shulker_boxes":
        return pick(lambda iid: strip_ns(iid) == "shulker_box" or strip_ns(iid).endswith("_shulker_box"))

    if body == "bundles":
        return pick(lambda iid: strip_ns(iid) == "bundle" or strip_ns(iid).endswith("_bundle"))

    if body == "trimmable_armor":
        armor_suffixes = ("_helmet", "_chestplate", "_leggings", "_boots")
        return pick(
            lambda iid: strip_ns(iid).endswith(armor_suffixes)
            or strip_ns(iid) in {"turtle_helmet", "wolf_armor", "nautilus_armor"}
        )

    return []


def normalize_recipe(raw: Dict[str, Any], recipe_id: str) -> Dict[str, Any]:
    rtype = raw.get("type", "")
    result = parse_result(raw.get("result"))

    out: Dict[str, Any] = {
        "id": recipe_id,
        "type": rtype,
    }

    cat = raw.get("category")
    if isinstance(cat, str):
        out["category"] = cat
    grp = raw.get("group")
    if isinstance(grp, str):
        out["group"] = grp

    if rtype == "minecraft:crafting_shaped":
        patt = raw.get("pattern")
        key = raw.get("key")
        if isinstance(patt, list) and isinstance(key, dict):
            out["pattern"] = [str(x) for x in patt]
            nkey: Dict[str, List[str]] = {}
            for symbol, expr in key.items():
                if not isinstance(symbol, str) or len(symbol) != 1:
                    continue
                toks = normalize_ingredient(expr)
                if toks:
                    nkey[symbol] = toks
            out["key"] = nkey
    elif rtype == "minecraft:crafting_shapeless":
        ingr = raw.get("ingredients")
        if isinstance(ingr, list):
            out["ingredients"] = [normalize_ingredient(x) for x in ingr]
    elif rtype in {
        "minecraft:stonecutting",
        "minecraft:smelting",
        "minecraft:blasting",
        "minecraft:smoking",
        "minecraft:campfire_cooking",
    }:
        out["ingredient"] = normalize_ingredient(raw.get("ingredient"))
    elif rtype == "minecraft:crafting_transmute":
        out["input"] = normalize_ingredient(raw.get("input"))
        out["material"] = normalize_ingredient(raw.get("material"))
    elif rtype == "minecraft:smithing_transform":
        out["template"] = normalize_ingredient(raw.get("template"))
        out["base"] = normalize_ingredient(raw.get("base"))
        out["addition"] = normalize_ingredient(raw.get("addition"))
    elif rtype == "minecraft:smithing_trim":
        out["template"] = normalize_ingredient(raw.get("template"))
        out["base"] = normalize_ingredient(raw.get("base"))
        out["addition"] = normalize_ingredient(raw.get("addition"))
        out["result_copy_from"] = "base"
        pattern = raw.get("pattern")
        if isinstance(pattern, str):
            out["trim_pattern"] = ns_item(pattern)
    elif rtype == "minecraft:crafting_decorated_pot":
        out["special"] = True
        out["special_kind"] = "decorated_pot"
        # Approximation to keep this recipe executable in BrowserCraft.
        out["ingredients"] = [
            ["minecraft:brick", "minecraft:angler_pottery_sherd", "minecraft:archer_pottery_sherd", "minecraft:arms_up_pottery_sherd", "minecraft:blade_pottery_sherd", "minecraft:brewer_pottery_sherd", "minecraft:burn_pottery_sherd", "minecraft:danger_pottery_sherd", "minecraft:explorer_pottery_sherd", "minecraft:friend_pottery_sherd", "minecraft:heart_pottery_sherd", "minecraft:heartbreak_pottery_sherd", "minecraft:howl_pottery_sherd", "minecraft:miner_pottery_sherd", "minecraft:mourner_pottery_sherd", "minecraft:plenty_pottery_sherd", "minecraft:prize_pottery_sherd", "minecraft:scrape_pottery_sherd", "minecraft:sheaf_pottery_sherd", "minecraft:shelter_pottery_sherd", "minecraft:skull_pottery_sherd", "minecraft:snort_pottery_sherd"],
            ["minecraft:brick", "minecraft:angler_pottery_sherd", "minecraft:archer_pottery_sherd", "minecraft:arms_up_pottery_sherd", "minecraft:blade_pottery_sherd", "minecraft:brewer_pottery_sherd", "minecraft:burn_pottery_sherd", "minecraft:danger_pottery_sherd", "minecraft:explorer_pottery_sherd", "minecraft:friend_pottery_sherd", "minecraft:heart_pottery_sherd", "minecraft:heartbreak_pottery_sherd", "minecraft:howl_pottery_sherd", "minecraft:miner_pottery_sherd", "minecraft:mourner_pottery_sherd", "minecraft:plenty_pottery_sherd", "minecraft:prize_pottery_sherd", "minecraft:scrape_pottery_sherd", "minecraft:sheaf_pottery_sherd", "minecraft:shelter_pottery_sherd", "minecraft:skull_pottery_sherd", "minecraft:snort_pottery_sherd"],
            ["minecraft:brick", "minecraft:angler_pottery_sherd", "minecraft:archer_pottery_sherd", "minecraft:arms_up_pottery_sherd", "minecraft:blade_pottery_sherd", "minecraft:brewer_pottery_sherd", "minecraft:burn_pottery_sherd", "minecraft:danger_pottery_sherd", "minecraft:explorer_pottery_sherd", "minecraft:friend_pottery_sherd", "minecraft:heart_pottery_sherd", "minecraft:heartbreak_pottery_sherd", "minecraft:howl_pottery_sherd", "minecraft:miner_pottery_sherd", "minecraft:mourner_pottery_sherd", "minecraft:plenty_pottery_sherd", "minecraft:prize_pottery_sherd", "minecraft:scrape_pottery_sherd", "minecraft:sheaf_pottery_sherd", "minecraft:shelter_pottery_sherd", "minecraft:skull_pottery_sherd", "minecraft:snort_pottery_sherd"],
            ["minecraft:brick", "minecraft:angler_pottery_sherd", "minecraft:archer_pottery_sherd", "minecraft:arms_up_pottery_sherd", "minecraft:blade_pottery_sherd", "minecraft:brewer_pottery_sherd", "minecraft:burn_pottery_sherd", "minecraft:danger_pottery_sherd", "minecraft:explorer_pottery_sherd", "minecraft:friend_pottery_sherd", "minecraft:heart_pottery_sherd", "minecraft:heartbreak_pottery_sherd", "minecraft:howl_pottery_sherd", "minecraft:miner_pottery_sherd", "minecraft:mourner_pottery_sherd", "minecraft:plenty_pottery_sherd", "minecraft:prize_pottery_sherd", "minecraft:scrape_pottery_sherd", "minecraft:sheaf_pottery_sherd", "minecraft:shelter_pottery_sherd", "minecraft:skull_pottery_sherd", "minecraft:snort_pottery_sherd"],
        ]
        out["result_like"] = "minecraft:decorated_pot"
    elif rtype.startswith("minecraft:crafting_special_"):
        out["special"] = True
        out["special_kind"] = rtype.replace("minecraft:crafting_special_", "")
    else:
        out["special"] = True
        out["special_kind"] = "unsupported"

    if result is not None:
        out["result"] = result
    elif rtype == "minecraft:smithing_trim":
        # Trim retains base item type in vanilla (NBT differs). Keep executable.
        out["result_copy_from"] = "base"

    return out


def collect_items_and_tags(recipes: List[Dict[str, Any]]) -> Tuple[Set[str], Set[str]]:
    items: Set[str] = set()
    tags: Set[str] = set()

    def visit_token(tok: str) -> None:
        if not tok:
            return
        if tok.startswith("#"):
            tags.add(ns_tag(tok))
        else:
            items.add(ns_item(tok))

    def visit_value(v: Any) -> None:
        if isinstance(v, str):
            visit_token(v)
        elif isinstance(v, list):
            for x in v:
                visit_value(x)
        elif isinstance(v, dict):
            for x in v.values():
                visit_value(x)

    for r in recipes:
        res = r.get("result")
        if isinstance(res, dict):
            rid = res.get("id")
            if isinstance(rid, str):
                items.add(ns_item(rid))

        like = r.get("result_like")
        if isinstance(like, str):
            items.add(ns_item(like))

        visit_value(r.get("ingredients"))
        visit_value(r.get("ingredient"))
        visit_value(r.get("input"))
        visit_value(r.get("material"))
        visit_value(r.get("template"))
        visit_value(r.get("base"))
        visit_value(r.get("addition"))
        visit_value(r.get("key"))

    return items, tags


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import minecraft recipes into BrowserCraft data bundle")
    parser.add_argument(
        "--source",
        required=True,
        help="Path to directory containing recipe JSON files",
    )
    parser.add_argument(
        "--out",
        default="data/recipes.generated.js",
        help="Output JS file path",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_dir = pathlib.Path(args.source).expanduser().resolve()
    out_path = pathlib.Path(args.out).expanduser().resolve()

    if not source_dir.exists() or not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")

    files = sorted(source_dir.glob("*.json"))
    recipes: List[Dict[str, Any]] = []
    type_counter: Counter[str] = Counter()
    parse_errors: List[str] = []

    for fp in files:
        rid = f"minecraft:{fp.stem}"
        try:
            raw = json.loads(fp.read_text(encoding="utf-8"))
            rtype = str(raw.get("type", ""))
            type_counter[rtype] += 1
            nr = normalize_recipe(raw, rid)
            recipes.append(nr)
        except Exception as exc:  # noqa: BLE001
            parse_errors.append(f"{fp.name}: {exc}")

    items, tags = collect_items_and_tags(recipes)

    # Add BrowserCraft starter/placeable items to registry for UI and crafting interop.
    starter_items = {
        "minecraft:grass_block",
        "minecraft:dirt",
        "minecraft:stone",
        "minecraft:oak_log",
        "minecraft:oak_leaves",
        "minecraft:water_bucket",
        "minecraft:sand",
        "minecraft:oak_planks",
        "minecraft:cobblestone",
        "minecraft:coal_ore",
        "minecraft:iron_ore",
        "minecraft:egg",
    }
    items.update(starter_items)

    tag_map: Dict[str, List[str]] = {}
    unresolved_tags: List[str] = []
    for tag in sorted(tags):
        expanded = expand_tag(tag, items)
        if not expanded:
            unresolved_tags.append(tag)
        tag_map[tag[1:]] = expanded

    # Keep only declared supported recipe types (but still include unknown as special for observability).
    unsupported_type_recipes = [r for r in recipes if r.get("type") not in SUPPORTED_TYPES]

    payload = {
        "version": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "sourcePath": str(source_dir),
        "recipeCount": len(recipes),
        "typeCounts": dict(type_counter),
        "items": sorted(items),
        "tags": tag_map,
        "recipes": recipes,
        "stats": {
            "parseErrorCount": len(parse_errors),
            "parseErrors": parse_errors,
            "tagCount": len(tag_map),
            "unresolvedTagCount": len(unresolved_tags),
            "unresolvedTags": unresolved_tags,
            "unknownTypeRecipeCount": len(unsupported_type_recipes),
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    js = "window.BROWSERCRAFT_RECIPE_DATA = " + json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + ";\n"
    out_path.write_text(js, encoding="utf-8")

    print(f"Imported {len(recipes)} recipes from {source_dir}")
    print(f"Output: {out_path}")
    print(f"Unique items: {len(items)} | Tags: {len(tag_map)}")
    if unresolved_tags:
        print("Unresolved tags:")
        for t in unresolved_tags:
            print(f"  - {t}")
    if parse_errors:
        print("Parse errors:")
        for err in parse_errors:
            print(f"  - {err}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
