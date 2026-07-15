#!/usr/bin/env python3
"""Create clean OpenBack terrain sources from user-supplied map references.

The references are used only to recover broad land/water silhouettes. Labels,
political borders, legends, and the original visual styling are discarded. The
output is a native OpenBack terrain PNG plus info.json for each map.
"""

from __future__ import annotations

import argparse
import colorsys
from collections import deque
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


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


SPECS = (
    MapSpec("therynian", "TherynianRealms", "Therynian Realms", "deep_blue", (
        "Miskawatookh", "Evrosula", "Gend'Luru", "Sulgarat", "Fjordowaer",
        "Xir-Shaih-Janwa", "Calocorre", "Dzi-Chom-Kmur", "Ux'Apzoal",
        "Stormwaters", "Northern Ice Fields", "Therynian Isles",
    )),
    MapSpec("fracturedeurasia", "FracturedEurasia", "Fractured Eurasia", "pale_blue", (
        "Krasnoyarsk Clique", "Yakutsk Clique", "Chukotka Republic", "Anastasias Realm",
        "British Raj", "Great Ming", "Ashkenaziya", "Novosibirsk Clique", "Tibet",
        "Persian Mandate", "Empire of Japan", "Arabian Federation", "Kingdom of Hawaii",
        "Chita Clique", "Russian State", "Mongol Republic",
    )),
    MapSpec("canid", "CanidContinents", "Canid Continents", "light_land", (
        "Vulpenai", "Cerdocyonina", "Caninae", "Vulpes", "Lycalopex", "Urocyon",
        "Otocyon", "Cuon", "Nyctereutes", "Chrysocyon", "Atelocynus", "Dusicyon",
    ), (0.18, 0.06, 0.82, 0.83)),
    MapSpec("heroicseas", "HeroicSeas", "Heroic Seas", "deep_blue", (
        "Great Continent", "Eastern Tribes", "Southern Kingdom", "Stormy Straits",
        "Great Canyon", "Forest Realm", "Snow Realm", "Sand Realm", "Volcanic March",
        "Emerald Reach", "Hyron Sea", "Southern Continent",
    )),
    MapSpec("atlas2026", "Atlas2026", "Atlas 2026", "light_land", (
        "Boreal Union", "Verdant West", "Saharan Crown", "Equatorial League", "Indigo Coast",
        "Eastern Range", "Southern Commonwealth", "Island Confederacy", "Polar Republic",
        "Golden Steppe", "Rainforest Pact", "Austral Federation", "Northern Archipelago",
        "Central Plateau", "Western Isles", "Sunrise Dominion",
    ), (0.02, 0.03, 0.98, 0.61)),
    MapSpec("worldoflur", "WorldOfLur", "World of Lur", "pale_blue", (
        "North Aimaelur", "South Aimaelur", "North Shefrat", "South Shefrat", "Dnogoztov",
        "Kylant", "RMU", "Aleyant", "Lalulu Utkan", "Sulhnni", "Selaylant", "Lura",
        "Gaphrisia", "Koxzalpo", "Untium Syn Aimaelur", "Chud-Vegzag",
    )),
    MapSpec("dasseria", "DasserianRealms", "Dasserian Realms", "muted_land", (
        "Dasseria", "Fairen Forest", "Orrakas Badlands", "Drakemaw", "Razalia", "Costula",
        "Komohan Islands", "Carangian Necrocracy", "Solaria", "Amalte", "Madrigal", "Cape Crown",
    )),
    MapSpec("fifteenthage", "FifteenthAge", "Fifteenth Age", "dark_ocean", (
        "Gimsonia", "Ebastania", "Holaspione", "Norweyn", "Soliya", "Siltensia",
        "Stavongrade", "Archeovia", "Lunaskia", "Astanar", "Carvonia", "Karurmbi",
        "Tenimar", "Jakatas", "Jilhiria", "Kamarcash",
    )),
    MapSpec("mandalanations", "MandalaNations", "Mandala Nations", "light_land", (
        "Mandala State", "Republic of Belapan", "Byalan Republic", "Integral Republic",
        "Tusolan Republic", "Ding Republic", "Northern Water Tribe", "Southern Water Tribe",
        "Zin State", "Cyn Republic", "Guma Free State", "Yin Republic", "Sakego Republic",
        "Gong Republic", "Kahhy Republic", "Zhalo-Kansao Republic",
    ), (0.01, 0.02, 0.99, 0.69)),
    MapSpec("calistis", "Calistis", "Calistis", "dark_ocean", (
        "Calistis", "Millennia", "Guren", "Dragon Coast", "Inner Sea", "Warm Deserts",
        "White Sea", "North Sea", "Eastern Sea", "Gray Mark", "Great Savanna", "Ethereal Prairie",
    )),
    MapSpec("mettersind", "Mettersind", "Mettersind", "dark_ocean", (
        "Verengera", "Norogea", "Ostrogea", "Selengea", "Parangea", "Mithronesia",
        "Tyronesia", "Sudanessa", "Targanessa", "Goronessa", "Valdenessa", "Karanessa",
        "Myronessa", "Pyronessa", "Zamonessa", "Solonessa",
    )),
    MapSpec("avidir", "Avidir", "Avidir", "dark_ocean", (
        "Driftwood", "Veltrune", "Westsea", "Shredded Ice", "Eyrionsea", "Moores End",
        "The Lagoon", "Worlds End", "Azure Gap", "Great Ocean", "Blue Expanse", "Avidir Crown",
    )),
    MapSpec("patchworkearth", "PatchworkEarth", "Patchwork Earth", "dark_ocean", (
        "Mosaic Crown", "Banner Coast", "Patchwork Reach", "Emblem Isles", "Painted North",
        "Stitched South", "Crestfall", "Ribbon Sea", "Heraldic Union", "Tapestry Bay",
        "Sigil March", "Quilted Cape", "Chromatic League", "Pennant Islands",
    )),
    MapSpec("invertedearth", "InvertedEarth", "Inverted Earth", "deep_blue", (
        "Inverted Africa", "Inner Asia", "Western Basin", "Eastern Basin", "Polar Crown",
        "South Rim", "Mediterranean Reach", "Great Inland Sea", "Boreal Peninsula",
        "Austral Highlands", "Equatorial Gulf", "Sunken Atlantic", "Mirror Pacific", "Old Tethys",
    )),
    MapSpec("maion", "Maion", "Maion", "dark_ocean", (
        "Maion", "Clann", "Anthur", "Frutfield", "Marian Coast", "Hirin Islands",
        "Aldrakage Islands", "Atla Katt", "Ochmet", "Sagen", "Raria", "Sinai",
        "Panhur", "Thalning", "Celesacy", "Reo Usti",
    )),
)


def target_size(source: Image.Image) -> tuple[int, int]:
    aspect = source.width / source.height
    width = int(math.sqrt(TARGET_AREA * aspect))
    height = int(width / aspect)
    return max(512, width - width % 4), max(512, height - height % 4)


def is_land(rgb: tuple[int, int, int], mode: str) -> bool:
    r, g, b = (channel / 255 for channel in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hue = h * 360
    blue_hue = 175 <= hue <= 255

    if mode == "deep_blue":
        return not ((blue_hue and b > r + 0.06) or v < 0.10)
    if mode == "pale_blue":
        return s > 0.11 and not (blue_hue and b > r + 0.035)
    if mode == "light_land":
        return s > 0.12 and not (blue_hue and b > r + 0.08 and b > g + 0.015)
    if mode == "muted_land":
        return s > 0.16 and not (blue_hue and b > r + 0.035)
    if mode == "dark_ocean":
        return s > 0.12 and v > 0.22 and not (blue_hue and b > r + 0.05 and v < 0.72)
    raise ValueError(f"unknown mode: {mode}")


def remove_small_land(mask: Image.Image, minimum: int) -> Image.Image:
    """Remove detached labels, grid fragments, and other tiny false islands."""
    width, height = mask.size
    pixels = bytearray(mask.tobytes())
    seen = bytearray(width * height)
    for start in range(width * height):
        if seen[start] or pixels[start] < 128:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        while queue:
            index = queue.popleft()
            component.append(index)
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
        if len(component) < minimum:
            for index in component:
                pixels[index] = 0
    return Image.frombytes("L", mask.size, bytes(pixels))


def fill_small_water_holes(mask: Image.Image, maximum: int) -> Image.Image:
    """Fill label and border cuts while preserving real seas and large lakes."""
    width, height = mask.size
    pixels = bytearray(mask.tobytes())
    seen = bytearray(width * height)
    for start in range(width * height):
        if seen[start] or pixels[start] >= 128:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        touches_edge = False
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            touches_edge = touches_edge or x == 0 or x == width - 1 or y == 0 or y == height - 1
            for neighbor in (index - width, index + width, index - 1, index + 1):
                if neighbor < 0 or neighbor >= len(pixels) or seen[neighbor]:
                    continue
                if neighbor == index - 1 and x == 0:
                    continue
                if neighbor == index + 1 and x == width - 1:
                    continue
                if pixels[neighbor] < 128:
                    seen[neighbor] = 1
                    queue.append(neighbor)
        if not touches_edge and len(component) < maximum:
            for index in component:
                pixels[index] = 255
    return Image.frombytes("L", mask.size, bytes(pixels))


def erase_reference_decorations(mask: Image.Image, spec: MapSpec) -> None:
    """Remove the few large legends that cannot be rejected as small text."""
    draw = ImageDraw.Draw(mask)
    width, height = mask.size
    if spec.key == "therynian":
        draw.rectangle((0, height * 0.91, width * 0.36, height), fill=0)
    elif spec.key == "canid":
        draw.rectangle((0, height * 0.72, width * 0.15, height), fill=0)
    elif spec.key == "worldoflur":
        draw.rectangle((width * 0.875, height * 0.72, width, height), fill=0)
    elif spec.key == "dasseria":
        draw.rectangle((0, height * 0.84, width * 0.26, height), fill=0)
    elif spec.key == "fifteenthage":
        draw.rectangle((0, 0, width, height * 0.055), fill=0)
        draw.rectangle((0, height * 0.94, width, height), fill=0)
    elif spec.key == "mettersind":
        draw.rectangle((0, height * 0.77, width * 0.16, height), fill=0)
    elif spec.key == "avidir":
        draw.rectangle((width * 0.41, height * 0.78, width * 0.68, height), fill=0)
    elif spec.key == "patchworkearth":
        draw.rectangle((0, 0, width, height * 0.075), fill=0)
        draw.rectangle((0, height * 0.91, width, height), fill=0)
    elif spec.key == "maion":
        draw.rectangle((width * 0.68, height * 0.69, width * 0.93, height * 0.91), fill=0)


def clean_mask(source: Image.Image, spec: MapSpec) -> Image.Image:
    left, top, right, bottom = spec.crop
    cropped = source.crop((
        int(source.width * left), int(source.height * top),
        int(source.width * right), int(source.height * bottom),
    )).convert("RGB")
    cropped = cropped.resize(target_size(cropped), Image.Resampling.LANCZOS)
    mask = Image.new("L", cropped.size)
    mask.putdata([255 if is_land(pixel, spec.mode) else 0 for pixel in cropped.get_flattened_data()])
    # Remove labels/grid lines and reconnect coastlines broken by map borders.
    opening = 7 if spec.key == "canid" else 3
    mask = mask.filter(ImageFilter.MinFilter(opening)).filter(ImageFilter.MaxFilter(opening))
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    erase_reference_decorations(mask, spec)
    mask = remove_small_land(mask, max(900, mask.width * mask.height // 2000))
    return fill_small_water_holes(mask, max(1200, mask.width * mask.height // 1600))


def terrain_from_mask(mask: Image.Image, seed: int) -> Image.Image:
    width, height = mask.size
    mask_data = mask.load()
    terrain = Image.new("RGBA", mask.size, WATER)
    pixels = terrain.load()
    rng = random.Random(seed)
    phases = [rng.random() * math.tau for _ in range(4)]
    for y in range(height):
        for x in range(width):
            if mask_data[x, y] < 128:
                continue
            waves = (
                math.sin(x / 71 + phases[0])
                + math.cos(y / 59 + phases[1])
                + math.sin((x + y) / 113 + phases[2])
                + math.cos((x - y) / 151 + phases[3])
            ) / 4
            blue = max(144, min(190, int(160 + waves * 24)))
            pixels[x, y] = (132, 158, blue, 255)
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


def land_component_count(mask: Image.Image) -> int:
    width, height = mask.size
    pixels = mask.tobytes()
    seen = bytearray(width * height)
    count = 0
    for start in range(width * height):
        if seen[start] or pixels[start] < 128:
            continue
        count += 1
        seen[start] = 1
        queue = deque([start])
        while queue:
            index = queue.popleft()
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
    return count


def write_map(output_root: Path, spec: MapSpec, mask: Image.Image) -> None:
    folder = output_root / spec.map_id.lower()
    folder.mkdir(parents=True, exist_ok=True)
    terrain_from_mask(mask, sum(ord(c) for c in spec.map_id)).save(folder / "image.png", optimize=True)
    points = spawn_points(mask, len(spec.names))
    info = {
        "id": spec.map_id,
        "name": spec.display_name,
        "translation_key": f"map.{spec.map_id.lower()}",
        "categories": ["fictional"],
        "multiplayer_frequency": spec.frequency,
        "nations": [
            {"coordinates": [x, y], "name": name, "flag": ""}
            for (x, y), name in zip(points, spec.names)
        ],
    }
    (folder / "info.json").write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")


def create_shattered_expanse(output_root: Path) -> None:
    width, height = 8192, 3584
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    rng = random.Random(33019)

    def draw_blob(cx: float, cy: float, rx: float, ry: float, points: int = 72) -> None:
        phase_a = rng.random() * math.tau
        phase_b = rng.random() * math.tau
        vertices = []
        for index in range(points):
            angle = index * math.tau / points
            coast = (
                1
                + math.sin(angle * 5 + phase_a) * 0.12
                + math.sin(angle * 11 + phase_b) * 0.07
                + rng.uniform(-0.055, 0.055)
            )
            vertices.append(
                (cx + math.cos(angle) * rx * coast, cy + math.sin(angle) * ry * coast)
            )
        draw.polygon(vertices, fill=255)

    continent_names = (
        "Dawnreach", "Stormrest", "Verdant Crown", "Iron March", "Sunspire",
        "Mistward", "Ashen Dominion", "Brightwater", "Frostwake", "Cinderlands",
        "Tidehold", "Starfall", "Thunder Reach", "Silver Expanse", "Last Horizon",
    )
    continent_centers: list[tuple[int, int]] = []

    # Fifteen genuinely large continents arranged across a long ocean world.
    # Each receives overlapping lobes and peninsulas so it remains one large,
    # irregular landmass rather than a collection of tiny islands.
    for row in range(3):
        for column in range(5):
            cx = 820 + column * 1635 + rng.randint(-55, 55)
            cy = 560 + row * 1230 + rng.randint(-45, 45)
            continent_centers.append((cx, cy))
            rx = rng.randint(610, 690)
            ry = rng.randint(400, 465)
            draw_blob(cx, cy, rx, ry, 96)
            for _ in range(4):
                angle = rng.random() * math.tau
                distance = rng.uniform(0.42, 0.68)
                draw_blob(
                    cx + math.cos(angle) * rx * distance,
                    cy + math.sin(angle) * ry * distance,
                    rng.uniform(0.28, 0.43) * rx,
                    rng.uniform(0.28, 0.43) * ry,
                    42,
                )

    # Medium offshore islands add naval routes without overwhelming the fifteen
    # continents or turning the map back into a tiny-island field.
    for cx, cy in continent_centers:
        for _ in range(4):
            angle = rng.random() * math.tau
            distance = rng.randint(720, 850)
            island_x = max(55, min(width - 55, cx + math.cos(angle) * distance))
            island_y = max(55, min(height - 55, cy + math.sin(angle) * distance * 0.62))
            draw_blob(island_x, island_y, rng.randint(45, 85), rng.randint(32, 64), 30)

    names = (
        "Dawnreach", "Tidehold", "Ashen Cay", "Glasshaven", "Stormrest", "Blue Lantern",
        "Crown Atoll", "Farwake", "Sunken Gate", "Iron Shoals", "Mistward", "Ember Isle",
        "Windscar", "Pearl Bastion", "Drift Crown", "Saltspire", "Moon Anchorage", "Wavebreak",
        "Starfall", "Riven Keys", "Coral March", "Thunder Cay", "Frostwake", "Sable Harbor",
        "Brightwater", "Tempest Reach", "Verdant Shard", "Obsidian Key", "Cloudrest", "Deepwatch",
        "Golden Shoal", "Whisper Isle", "Crimson Atoll", "Northstar", "Sea Lantern", "Gale Crown",
        "Mariners Rest", "Broken Compass", "Turtle Reach", "Last Horizon", "Shardhaven", "Foamspire",
        "Blackwake", "Silver Current", "Rains End", "Azure Crown", "Cinder Key", "Tideglass",
    )
    land_tiles = mask.histogram()[255]
    if land_tiles < 10_000_000:
        raise ValueError(
            f"Shattered Expanse must provide at least 10 million land tiles, found {land_tiles}"
        )
    for name, center in zip(continent_names, continent_centers):
        if mask.getpixel(center) < 128:
            raise ValueError(f"Shattered Expanse continent {name} has no central land")
    spec = MapSpec("shatteredexpanse", "ShatteredExpanse", "Shattered Expanse", "dark_ocean", names, frequency=0)
    write_map(output_root, spec, mask)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--reference", action="append", default=[], metavar="KEY=PNG")
    parser.add_argument("--skip-archipelago", action="store_true")
    args = parser.parse_args()
    references = {key: Path(path) for key, path in (item.split("=", 1) for item in args.reference)}

    for spec in SPECS:
        source_path = references.get(spec.key)
        if source_path is None:
            raise SystemExit(f"missing --reference {spec.key}=PNG")
        with Image.open(source_path) as source:
            write_map(args.output_root, spec, clean_mask(source, spec))
        print(f"created {spec.display_name}")

    if not args.skip_archipelago:
        create_shattered_expanse(args.output_root)
        print("created Shattered Expanse")


if __name__ == "__main__":
    main()
