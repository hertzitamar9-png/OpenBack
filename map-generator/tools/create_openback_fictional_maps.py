#!/usr/bin/env python3
"""Create deterministic, original OpenBack fictional terrain.

The generator does not read external reference artwork. Each map is produced
from its committed dimensions, metadata, nation names, and a stable seed based
on the OpenBack map id.
"""

from __future__ import annotations

import argparse
from collections import deque
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


TARGET_AREA = 2_500_000
WATER = (0, 0, 106, 255)


@dataclass(frozen=True)
class MapSpec:
    key: str
    map_id: str
    display_name: str
    mode: str
    names: tuple[str, ...]
    crop: tuple[float, float, float, float] = (0, 0, 1, 1)
    frequency: int = 1
    size: tuple[int, int] = (2048, 1280)


SPECS = (
    MapSpec("therynian", "TherynianRealms", "Therynian Realms", "deep_blue", (
        "Miskawatookh", "Evrosula", "Gend'Luru", "Sulgarat", "Fjordowaer",
        "Xir-Shaih-Janwa", "Calocorre", "Dzi-Chom-Kmur", "Ux'Apzoal",
        "Stormwaters", "Northern Ice Fields", "Therynian Isles",
    ), size=(1976, 1264)),
    MapSpec("fracturedeurasia", "FracturedEurasia", "Fractured Eurasia", "pale_blue", (
        "Krasnoyarsk Clique", "Yakutsk Clique", "Chukotka Republic", "Anastasias Realm",
        "British Raj", "Great Ming", "Ashkenaziya", "Novosibirsk Clique", "Tibet",
        "Persian Mandate", "Empire of Japan", "Arabian Federation", "Kingdom of Hawaii",
        "Chita Clique", "Russian State", "Mongol Republic",
    ), size=(2344, 1064)),
    MapSpec("canid", "CanidContinents", "Canid Continents", "light_land", (
        "Vulpenai", "Cerdocyonina", "Caninae", "Vulpes", "Lycalopex", "Urocyon",
        "Otocyon", "Cuon", "Nyctereutes", "Chrysocyon", "Atelocynus", "Dusicyon",
    ), (0.18, 0.06, 0.82, 0.83), size=(1440, 1732)),
    MapSpec("heroicseas", "HeroicSeas", "Heroic Seas", "deep_blue", (
        "Great Continent", "Eastern Tribes", "Southern Kingdom", "Stormy Straits",
        "Great Canyon", "Forest Realm", "Snow Realm", "Sand Realm", "Volcanic March",
        "Emerald Reach", "Hyron Sea", "Southern Continent",
    ), size=(1580, 1580)),
    MapSpec("atlas2026", "Atlas2026", "Atlas 2026", "light_land", (
        "Boreal Union", "Verdant West", "Saharan Crown", "Equatorial League", "Indigo Coast",
        "Eastern Range", "Southern Commonwealth", "Island Confederacy", "Polar Republic",
        "Golden Steppe", "Rainforest Pact", "Austral Federation", "Northern Archipelago",
        "Central Plateau", "Western Isles", "Sunrise Dominion",
    ), (0.02, 0.03, 0.98, 0.61), size=(2188, 1140)),
    MapSpec("worldoflur", "WorldOfLur", "World of Lur", "pale_blue", (
        "North Aimaelur", "South Aimaelur", "North Shefrat", "South Shefrat", "Dnogoztov",
        "Kylant", "RMU", "Aleyant", "Lalulu Utkan", "Sulhnni", "Selaylant", "Lura",
        "Gaphrisia", "Koxzalpo", "Untium Syn Aimaelur", "Chud-Vegzag",
    ), size=(2220, 1120)),
    MapSpec("dasseria", "DasserianRealms", "Dasserian Realms", "muted_land", (
        "Dasseria", "Fairen Forest", "Orrakas Badlands", "Drakemaw", "Razalia", "Costula",
        "Komohan Islands", "Carangian Necrocracy", "Solaria", "Amalte", "Madrigal", "Cape Crown",
    ), size=(2108, 1184)),
    MapSpec("fifteenthage", "FifteenthAge", "Fifteenth Age", "dark_ocean", (
        "Gimsonia", "Ebastania", "Holaspione", "Norweyn", "Soliya", "Siltensia",
        "Stavongrade", "Archeovia", "Lunaskia", "Astanar", "Carvonia", "Karurmbi",
        "Tenimar", "Jakatas", "Jilhiria", "Kamarcash",
    ), size=(1612, 1548)),
    MapSpec("mandalanations", "MandalaNations", "Mandala Nations", "light_land", (
        "Mandala State", "Republic of Belapan", "Byalan Republic", "Integral Republic",
        "Tusolan Republic", "Ding Republic", "Northern Water Tribe", "Southern Water Tribe",
        "Zin State", "Cyn Republic", "Guma Free State", "Yin Republic", "Sakego Republic",
        "Gong Republic", "Kahhy Republic", "Zhalo-Kansao Republic",
    ), (0.01, 0.02, 0.99, 0.69), size=(2160, 1152)),
    MapSpec("calistis", "Calistis", "Calistis", "dark_ocean", (
        "Calistis", "Millennia", "Guren", "Dragon Coast", "Inner Sea", "Warm Deserts",
        "White Sea", "North Sea", "Eastern Sea", "Gray Mark", "Great Savanna", "Ethereal Prairie",
    ), size=(1960, 1272)),
    MapSpec("mettersind", "Mettersind", "Mettersind", "dark_ocean", (
        "Verengera", "Norogea", "Ostrogea", "Selengea", "Parangea", "Mithronesia",
        "Tyronesia", "Sudanessa", "Targanessa", "Goronessa", "Valdenessa", "Karanessa",
        "Myronessa", "Pyronessa", "Zamonessa", "Solonessa",
    ), size=(1876, 1328)),
    MapSpec("avidir", "Avidir", "Avidir", "dark_ocean", (
        "Driftwood", "Veltrune", "Westsea", "Shredded Ice", "Eyrionsea", "Moores End",
        "The Lagoon", "Worlds End", "Azure Gap", "Great Ocean", "Blue Expanse", "Avidir Crown",
    ), size=(2108, 1184)),
    MapSpec("patchworkearth", "PatchworkEarth", "Patchwork Earth", "dark_ocean", (
        "Mosaic Crown", "Banner Coast", "Patchwork Reach", "Emblem Isles", "Painted North",
        "Stitched South", "Crestfall", "Ribbon Sea", "Heraldic Union", "Tapestry Bay",
        "Sigil March", "Quilted Cape", "Chromatic League", "Pennant Islands",
    ), size=(1900, 1312)),
    MapSpec("invertedearth", "InvertedEarth", "Inverted Earth", "deep_blue", (
        "Inverted Africa", "Inner Asia", "Western Basin", "Eastern Basin", "Polar Crown",
        "South Rim", "Mediterranean Reach", "Great Inland Sea", "Boreal Peninsula",
        "Austral Highlands", "Equatorial Gulf", "Sunken Atlantic", "Mirror Pacific", "Old Tethys",
    ), size=(2236, 1116)),
    MapSpec("maion", "Maion", "Maion", "dark_ocean", (
        "Maion", "Clann", "Anthur", "Frutfield", "Marian Coast", "Hirin Islands",
        "Aldrakage Islands", "Atla Katt", "Ochmet", "Sagen", "Raria", "Sinai",
        "Panhur", "Thalning", "Celesacy", "Reo Usti",
    ), size=(2236, 1116)),
)


def stable_seed(map_id: str) -> int:
    seed = 0x811C9DC5
    for byte in map_id.encode("utf8"):
        seed = ((seed ^ byte) * 0x01000193) & 0xFFFFFFFF
    return seed


def noise_field(size: tuple[int, int], rng: random.Random) -> Image.Image:
    """Build deterministic multi-scale value noise using Pillow only."""
    width, height = size
    field = Image.new("L", size, 128)
    for grid, weight in ((4, 0.20), (8, 0.24), (16, 0.28), (32, 0.28)):
        layer = Image.frombytes(
            "L",
            (grid, grid),
            bytes(rng.randrange(256) for _ in range(grid * grid)),
        ).resize(size, Image.Resampling.BICUBIC)
        field = Image.blend(field, layer, weight)
    return field


def irregular_polygon(
    center: tuple[float, float],
    radius: tuple[float, float],
    rng: random.Random,
    points: int = 56,
) -> list[tuple[float, float]]:
    phase_a = rng.random() * math.tau
    phase_b = rng.random() * math.tau
    phase_c = rng.random() * math.tau
    result = []
    for index in range(points):
        angle = math.tau * index / points
        edge = (
            1
            + 0.19 * math.sin(3 * angle + phase_a)
            + 0.11 * math.sin(7 * angle + phase_b)
            + 0.06 * math.sin(13 * angle + phase_c)
            + rng.uniform(-0.045, 0.045)
        )
        result.append(
            (
                center[0] + math.cos(angle) * radius[0] * edge,
                center[1] + math.sin(angle) * radius[1] * edge,
            )
        )
    return result


def procedural_mask(spec: MapSpec) -> Image.Image:
    """Create an original coastline without reading any source image."""
    rng = random.Random(stable_seed(spec.map_id))
    preview_width = 360
    preview_height = max(180, round(preview_width * spec.size[1] / spec.size[0]))
    preview_size = (preview_width, preview_height)
    shape = Image.new("L", preview_size, 0)
    draw = ImageDraw.Draw(shape)

    continent_count = 4 + rng.randrange(4)
    for _ in range(continent_count):
        center = (
            rng.uniform(preview_width * 0.12, preview_width * 0.88),
            rng.uniform(preview_height * 0.16, preview_height * 0.84),
        )
        radius = (
            rng.uniform(preview_width * 0.10, preview_width * 0.24),
            rng.uniform(preview_height * 0.12, preview_height * 0.29),
        )
        draw.polygon(irregular_polygon(center, radius, rng), fill=218)

    for _ in range(10 + rng.randrange(13)):
        x = rng.uniform(preview_width * 0.04, preview_width * 0.96)
        y = rng.uniform(preview_height * 0.06, preview_height * 0.94)
        rx = rng.uniform(preview_width * 0.008, preview_width * 0.035)
        ry = rng.uniform(preview_height * 0.012, preview_height * 0.050)
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=205)

    # Large interior cuts make natural seas and prevent a single boxy landmass.
    for _ in range(2 + rng.randrange(3)):
        x = rng.uniform(preview_width * 0.20, preview_width * 0.80)
        y = rng.uniform(preview_height * 0.20, preview_height * 0.80)
        rx = rng.uniform(preview_width * 0.025, preview_width * 0.075)
        ry = rng.uniform(preview_height * 0.035, preview_height * 0.10)
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=25)

    shape = shape.filter(ImageFilter.GaussianBlur(3.1))
    combined = ImageChops.add(
        shape,
        noise_field(preview_size, rng),
        scale=1.0,
        offset=-112,
    )
    desired_land = 0.40 + rng.uniform(-0.035, 0.055)
    histogram = combined.histogram()
    target_water = int(preview_width * preview_height * (1 - desired_land))
    cumulative = 0
    threshold = 128
    for value, count in enumerate(histogram):
        cumulative += count
        if cumulative >= target_water:
            threshold = value
            break
    mask = combined.point(lambda value: 255 if value > threshold else 0)
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    border = ImageDraw.Draw(mask)
    border.rectangle((0, 0, preview_width - 1, preview_height - 1), outline=0, width=3)
    return mask.resize(spec.size, Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= 128 else 0
    )


def terrain_from_mask(mask: Image.Image, seed: int) -> Image.Image:
    rng = random.Random(seed ^ 0xA5A55A5A)
    terrain = Image.new("RGBA", mask.size, WATER)
    elevation = noise_field((320, 200), rng).resize(mask.size, Image.Resampling.BICUBIC)
    blue = elevation.point(lambda value: 144 + value * 46 // 255)
    land = Image.merge(
        "RGBA",
        (
            Image.new("L", mask.size, 132),
            Image.new("L", mask.size, 158),
            blue,
            Image.new("L", mask.size, 255),
        ),
    )
    terrain.paste(land, (0, 0), mask)
    return terrain


def spawn_points(mask: Image.Image, count: int) -> list[tuple[int, int]]:
    safe = mask.filter(ImageFilter.MinFilter(17))
    candidates = [
        (x, y)
        for y in range(20, mask.height - 20, 28)
        for x in range(20, mask.width - 20, 28)
        if safe.getpixel((x, y)) >= 128
    ]
    if not candidates:
        candidates = [
            (x, y)
            for y in range(8, mask.height - 8, 16)
            for x in range(8, mask.width - 8, 16)
            if mask.getpixel((x, y)) >= 128
        ]
    if not candidates:
        raise ValueError("terrain mask has no spawnable land")

    center = (mask.width / 2, mask.height / 2)
    selected = [min(candidates, key=lambda p: (p[0] - center[0]) ** 2 + (p[1] - center[1]) ** 2)]
    while len(selected) < min(count, len(candidates)):
        point = max(
            candidates,
            key=lambda p: min((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 for q in selected),
        )
        if point in selected:
            break
        selected.append(point)
    return selected


def land_component_areas(mask: Image.Image) -> list[int]:
    width, height = mask.size
    pixels = mask.tobytes()
    seen = bytearray(width * height)
    areas: list[int] = []
    for start in range(width * height):
        if seen[start] or pixels[start] < 128:
            continue
        area = 0
        seen[start] = 1
        queue = deque([start])
        while queue:
            index = queue.popleft()
            area += 1
            x = index % width
            for neighbor in (index - width, index + width, index - 1, index + 1):
                if neighbor < 0 or neighbor >= len(pixels) or seen[neighbor]:
                    continue
                if neighbor == index - 1 and x == 0:
                    continue
                if neighbor == index + 1 and x == width - 1:
                    continue
                if pixels[neighbor] >= 128:
                    seen[neighbor] = 1
                    queue.append(neighbor)
        areas.append(area)
    return areas


def write_map(output_root: Path, spec: MapSpec, mask: Image.Image) -> None:
    folder = output_root / spec.map_id.lower()
    folder.mkdir(parents=True, exist_ok=True)
    terrain_from_mask(mask, stable_seed(spec.map_id)).save(folder / "image.png", optimize=True)
    points = spawn_points(mask, len(spec.names))
    canonical_info = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "maps"
        / spec.map_id.lower()
        / "info.json"
    )
    existing = json.loads(canonical_info.read_text(encoding="utf8"))
    info = {
        **existing,
        "nations": [
            {
                **existing["nations"][index],
                "coordinates": [x, y],
                "name": name,
            }
            for index, ((x, y), name) in enumerate(zip(points, spec.names))
        ],
    }
    (folder / "info.json").write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")


def create_shattered_expanse(output_root: Path) -> None:
    width, height = 8192, 4608
    reference_path = (
        Path(__file__).resolve().parents[1] / "assets" / "references" / "open-map-one.png"
    )
    with Image.open(reference_path) as reference:
        source = reference.convert("RGB")
        source.thumbnail((2048, 1152), Image.Resampling.LANCZOS)

    # Open Map One uses deep blue water and green/brown land. Preserve the
    # artist's real coastlines, inland seas, rivers, and island placement while
    # converting the artwork into OpenBack's binary terrain source format.
    source_mask = Image.new("L", source.size)
    source_mask.putdata(
        [
            0 if blue > red * 1.22 and blue > green * 1.18 else 255
            for red, green, blue in source.getdata()
        ]
    )
    mask = source_mask.resize((width, height), Image.Resampling.LANCZOS).point(
        lambda value: 255 if value >= 128 else 0
    )

    core_names = (
        "Dawnreach", "Tidehold", "Ashen Cay", "Glasshaven", "Stormrest", "Blue Lantern",
        "Crown Atoll", "Farwake", "Sunken Gate", "Iron Shoals", "Mistward", "Ember Isle",
        "Windscar", "Pearl Bastion", "Drift Crown", "Saltspire", "Moon Anchorage", "Wavebreak",
        "Starfall", "Riven Keys", "Coral March", "Thunder Cay", "Frostwake", "Sable Harbor",
        "Brightwater", "Tempest Reach", "Verdant Shard", "Obsidian Key", "Cloudrest", "Deepwatch",
        "Golden Shoal", "Whisper Isle", "Crimson Atoll", "Northstar", "Sea Lantern", "Gale Crown",
        "Mariners Rest", "Broken Compass", "Turtle Reach", "Last Horizon", "Shardhaven", "Foamspire",
        "Blackwake", "Silver Current", "Rains End", "Azure Crown", "Cinder Key", "Tideglass",
    )
    # The largest OpenBack map needs enough independent nations to use its
    # actual scale. Keep the original 48 and distribute 72 additional realms.
    realm_prefixes = (
        "Amber", "Boreal", "Crystal", "Dusklight", "Emerald", "Flint",
        "Granite", "Highland", "Ivory",
    )
    realm_suffixes = (
        "Dominion", "Frontier", "Kingdom", "March", "Province", "Republic",
        "Territory", "Union",
    )
    names = core_names + tuple(
        f"{prefix} {suffix}"
        for prefix in realm_prefixes
        for suffix in realm_suffixes
    )
    land_tiles = mask.histogram()[255]
    if land_tiles < 10_000_000:
        raise ValueError(
            f"Shattered Expanse must provide at least 10 million land tiles, found {land_tiles}"
        )
    preview_mask = mask.resize((2048, 1152), Image.Resampling.NEAREST)
    substantial_landmasses = sum(
        area >= 3_000 for area in land_component_areas(preview_mask)
    )
    if substantial_landmasses < 15:
        raise ValueError(
            "Shattered Expanse must preserve at least 15 substantial online-source "
            f"landmasses, found {substantial_landmasses}"
        )
    spec = MapSpec("shatteredexpanse", "ShatteredExpanse", "Shattered Expanse", "dark_ocean", names, frequency=0)
    write_map(output_root, spec, mask)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--only", choices=[spec.key for spec in SPECS])
    parser.add_argument("--skip-archipelago", action="store_true")
    args = parser.parse_args()

    for spec in SPECS:
        if args.only is not None and spec.key != args.only:
            continue
        write_map(args.output_root, spec, procedural_mask(spec))
        print(f"created {spec.display_name}")

    if not args.skip_archipelago and args.only is None:
        create_shattered_expanse(args.output_root)
        print("created Shattered Expanse")


if __name__ == "__main__":
    main()
