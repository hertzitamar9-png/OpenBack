#!/usr/bin/env python3
"""Build OpenBack's Grand Earth map from Natural Earth public-domain data."""

from __future__ import annotations

import json
import math
import urllib.request
from pathlib import Path
from typing import Any, Iterable

from PIL import Image, ImageDraw, ImageFilter


WIDTH = 12_288
HEIGHT = 6_144
MAP_KEY = "grandearth"
MAP_ID = "GrandEarth"
MAP_NAME = "Grand Earth"
WATER = (0, 0, 106, 255)

LAND_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_10m_land.geojson"
)
MINOR_ISLANDS_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_10m_minor_islands.geojson"
)
COUNTRIES_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_10m_admin_0_countries.geojson"
)


def fetch_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "OpenBack map generator"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def project(point: Iterable[float]) -> tuple[int, int]:
    coordinates = tuple(point)
    longitude, latitude = coordinates[:2]
    x = round((float(longitude) + 180.0) / 360.0 * (WIDTH - 1))
    y = round((90.0 - float(latitude)) / 180.0 * (HEIGHT - 1))
    return max(0, min(WIDTH - 1, x)), max(0, min(HEIGHT - 1, y))


def polygons(
    geometry: dict[str, Any],
) -> Iterable[list[list[list[float]]]]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    if geometry_type == "Polygon":
        yield coordinates
    elif geometry_type == "MultiPolygon":
        yield from coordinates


def draw_land(mask: Image.Image, collection: dict[str, Any]) -> None:
    draw = ImageDraw.Draw(mask)
    for feature in collection.get("features", []):
        geometry = feature.get("geometry") or {}
        for rings in polygons(geometry):
            if not rings:
                continue
            # Natural Earth polygons are oriented consistently: exterior rings
            # are followed by any lake/interior rings.
            draw.polygon([project(point) for point in rings[0]], fill=255)
            for hole in rings[1:]:
                draw.polygon([project(point) for point in hole], fill=0)


def make_terrain(mask: Image.Image) -> Image.Image:
    # Broad elevation bands keep the large map visually readable without
    # inventing political borders or altering the real coastline.
    low = Image.new("RGBA", (WIDTH, HEIGHT), (77, 118, 151, 255))
    latitude = Image.new("L", (1, HEIGHT))
    latitude.putdata(
        [
            max(
                0,
                min(
                    255,
                    round(
                        144
                        + 38 * abs((y / max(1, HEIGHT - 1)) * 2 - 1)
                        + 12 * math.sin(y / 137)
                    ),
                ),
            )
            for y in range(HEIGHT)
        ]
    )
    latitude = latitude.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
    texture = latitude.filter(ImageFilter.GaussianBlur(radius=22))
    land = Image.merge(
        "RGBA",
        (
            Image.new("L", (WIDTH, HEIGHT), 78),
            Image.new("L", (WIDTH, HEIGHT), 122),
            texture,
            Image.new("L", (WIDTH, HEIGHT), 255),
        ),
    )
    land = Image.blend(low, land, 0.72)
    return Image.composite(land, Image.new("RGBA", (WIDTH, HEIGHT), WATER), mask)


def nearest_land(mask: Image.Image, origin: tuple[int, int]) -> tuple[int, int] | None:
    pixels = mask.load()
    x0, y0 = origin
    if pixels[x0, y0] >= 128:
        return origin
    for radius in range(8, 321, 8):
        for dx in range(-radius, radius + 1, 8):
            for x, y in (
                (x0 + dx, y0 - radius),
                (x0 + dx, y0 + radius),
                (x0 - radius, y0 + dx),
                (x0 + radius, y0 + dx),
            ):
                if 0 <= x < WIDTH and 0 <= y < HEIGHT and pixels[x, y] >= 128:
                    return x, y
    return None


def country_label(feature: dict[str, Any]) -> tuple[float, float] | None:
    properties = feature.get("properties") or {}
    longitude = properties.get("LABEL_X")
    latitude = properties.get("LABEL_Y")
    if isinstance(longitude, (int, float)) and isinstance(latitude, (int, float)):
        return float(longitude), float(latitude)
    geometry = feature.get("geometry") or {}
    points = [
        point
        for polygon in polygons(geometry)
        for ring in polygon
        for point in ring
        if len(point) >= 2
    ]
    if not points:
        return None
    return (
        sum(float(point[0]) for point in points) / len(points),
        sum(float(point[1]) for point in points) / len(points),
    )


def build_nations(
    mask: Image.Image, countries: dict[str, Any]
) -> list[dict[str, Any]]:
    nations: list[dict[str, Any]] = []
    occupied: list[tuple[int, int]] = []
    for feature in countries.get("features", []):
        properties = feature.get("properties") or {}
        name = str(
            properties.get("ADMIN")
            or properties.get("NAME_LONG")
            or properties.get("NAME")
            or ""
        ).strip()
        label = country_label(feature)
        if not name or label is None:
            continue
        coordinates = nearest_land(mask, project(label))
        if coordinates is None:
            continue
        x, y = coordinates
        nearby_land = sum(
            1
            for sample_y in range(max(0, y - 10), min(HEIGHT, y + 11))
            for sample_x in range(max(0, x - 10), min(WIDTH, x + 11))
            if mask.getpixel((sample_x, sample_y)) >= 128
        )
        # The native map pipeline intentionally removes isolated islands under
        # 30 tiles. Do not create a nation whose only spawn is on terrain that
        # will be removed during that conversion.
        if nearby_land < 40:
            continue
        # Avoid placing several tiny territories on exactly the same tile.
        if any(
            abs(coordinates[0] - old_x) < 10
            and abs(coordinates[1] - old_y) < 10
            for old_x, old_y in occupied
        ):
            continue
        occupied.append(coordinates)
        flag = str(
            properties.get("ISO_A2_EH")
            or properties.get("ISO_A2")
            or properties.get("WB_A2")
            or "un"
        ).lower()
        if len(flag) != 2 or flag == "-99":
            flag = "un"
        nations.append(
            {
                "coordinates": list(coordinates),
                "name": name,
                "flag": flag,
            }
        )
    return nations


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    output = root / "map-generator" / "assets" / "maps" / MAP_KEY
    output.mkdir(parents=True, exist_ok=True)

    print("Downloading Natural Earth land, island, and country data...")
    land = fetch_json(LAND_URL)
    minor_islands = fetch_json(MINOR_ISLANDS_URL)
    countries = fetch_json(COUNTRIES_URL)

    print(f"Rasterizing the {WIDTH:,} x {HEIGHT:,} Grand Earth coastline...")
    mask = Image.new("L", (WIDTH, HEIGHT), 0)
    draw_land(mask, land)
    draw_land(mask, minor_islands)
    mask = mask.filter(ImageFilter.MaxFilter(3))

    make_terrain(mask).save(output / "image.png", optimize=True)
    nations = build_nations(mask, countries)
    info = {
        "id": MAP_ID,
        "name": MAP_NAME,
        "translation_key": f"map.{MAP_KEY}",
        "categories": ["new", "world"],
        "multiplayer_frequency": 0,
        "nations": nations,
    }
    (output / "info.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Created Grand Earth with {len(nations)} named nations.")


if __name__ == "__main__":
    main()
