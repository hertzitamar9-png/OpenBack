import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapsRoot = path.join(root, "resources", "maps");
const upstreamReleaseCommit = "88cc95d8b6d74d951546da341be809bfb3cab960";
const yangtzeCommit = "35a3692dd012dd84c93d3cb238b90cbcb04b03cf";

const openBackProcedural = new Set([
  "atlas2026",
  "avidir",
  "calistis",
  "canidcontinents",
  "dasserianrealms",
  "fifteenthage",
  "fracturedeurasia",
  "heroicseas",
  "invertedearth",
  "maion",
  "mandalanations",
  "mettersind",
  "patchworkearth",
  "therynianrealms",
  "worldoflur",
]);

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function stableSeed(mapId) {
  let seed = 0x811c9dc5;
  for (const byte of Buffer.from(mapId, "utf8")) {
    seed = Math.imul(seed ^ byte, 0x01000193) >>> 0;
  }
  return seed;
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

const upstreamMaps = new Set(
  git(
    "ls-tree",
    "-d",
    "--name-only",
    `${upstreamReleaseCommit}:map-generator/assets/maps`,
  )
    .split(/\r?\n/)
    .filter(Boolean),
);

const mapIds = readdirSync(mapsRoot)
  .filter((name) => statSync(path.join(mapsRoot, name)).isDirectory())
  .sort();

const provenance = {};
for (const id of mapIds) {
  const manifestPath = path.join(mapsRoot, id, "manifest.json");
  const thumbnailPath = path.join(mapsRoot, id, "thumbnail.webp");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const base = {
    displayName: manifest.name ?? manifest.id ?? id,
    origin: "",
    creator: "",
    license: null,
    sourceUrl: null,
    sourceCommit: null,
    generator: null,
    generatorSeed: null,
    modifications:
      "Compiled into OpenFront/OpenBack map binaries and thumbnail.",
    manifestSha256: sha256(manifestPath),
    thumbnailSha256: sha256(thumbnailPath),
  };

  if (upstreamMaps.has(id)) {
    provenance[id] = {
      class: "openfront-inherited",
      ...base,
      origin: "OpenFront v0.33.12 open map assets",
      creator: "OpenFront Inc. and contributors",
      license: "CC-BY-SA-4.0",
      sourceUrl: `https://github.com/openfrontio/OpenFrontIO/tree/${upstreamReleaseCommit}/map-generator/assets/maps/${id}`,
      sourceCommit: upstreamReleaseCommit,
    };
  } else if (id === "yangtzeriver") {
    provenance[id] = {
      class: "openfront-inherited",
      ...base,
      origin: "OpenFront upstream map contribution",
      creator: "OpenFront contributors",
      license: "CC-BY-SA-4.0",
      sourceUrl: `https://github.com/openfrontio/OpenFrontIO/commit/${yangtzeCommit}`,
      sourceCommit: yangtzeCommit,
    };
  } else if (id === "grandearth") {
    provenance[id] = {
      class: "openback-generated",
      ...base,
      origin: "OpenBack Grand Earth generator using Natural Earth 1:10m data",
      creator: "frootz jhklphy; geographic data by Natural Earth contributors",
      license: "Public-Domain",
      sourceUrl:
        "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/",
      sourceCommit: git(
        "log",
        "--format=%H",
        "--reverse",
        "--",
        "map-generator/tools/create_grand_earth_map.py",
      ).split(/\r?\n/)[0],
      generator: "map-generator/tools/create_grand_earth_map.py",
      modifications:
        "OpenBack rasterization, elevation palette, nation placement, validation, map binaries, and thumbnail.",
    };
  } else if (id === "shatteredexpanse") {
    provenance[id] = {
      class: "third-party-licensed",
      ...base,
      origin: "Open Map One",
      creator:
        "Darklighter Designs (2017); OpenBack conversion by frootz jhklphy",
      license: "CC-BY-3.0",
      sourceUrl: "https://opengameart.org/content/open-map-one",
      sourceCommit: git(
        "log",
        "--format=%H",
        "--reverse",
        "--",
        "map-generator/assets/references/open-map-one.png",
      ).split(/\r?\n/)[0],
      modifications:
        "Land/water extraction, scaling, OpenBack elevation palette, nation layout, map binaries, and thumbnail.",
    };
  } else if (openBackProcedural.has(id)) {
    provenance[id] = {
      class: "openback-generated",
      ...base,
      origin: "Deterministic OpenBack procedural terrain",
      creator: "frootz jhklphy",
      license: "CC-BY-SA-4.0",
      sourceUrl:
        "https://github.com/hertzitamar9-png/OpenBack/blob/main/map-generator/tools/create_openback_fictional_maps.py",
      generator: "map-generator/tools/create_openback_fictional_maps.py",
      generatorSeed: stableSeed(manifest.id ?? id),
      modifications:
        "Original procedural coastline and elevation generation, preserved map identity and nation names, recalculated spawn layout, map binaries, and thumbnails.",
    };
  } else {
    throw new Error(`Map ${id} has no provenance classification`);
  }
}

const counts = Object.values(provenance).reduce((result, record) => {
  result[record.class] = (result[record.class] ?? 0) + 1;
  return result;
}, {});

if (
  mapIds.length !== 135 ||
  counts["openfront-inherited"] !== 118 ||
  counts["openback-generated"] !== 16 ||
  counts["third-party-licensed"] !== 1 ||
  (counts["unverified-reference"] ?? 0) !== 0
) {
  throw new Error(
    `Unexpected provenance totals: ${mapIds.length} maps ${JSON.stringify(counts)}`,
  );
}

writeFileSync(
  path.join(mapsRoot, "provenance.json"),
  `${JSON.stringify(provenance, null, 2)}\n`,
);
console.log(
  `Verified inventory: ${mapIds.length} maps ${JSON.stringify(counts)}`,
);
