import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cosmeticsPath = path.join(root, "resources", "cosmetics.json");
const creditsPath = path.join(root, "CREDITS.md");
const commonsApi = new URL("https://commons.wikimedia.org/w/api.php");
commonsApi.search = new URLSearchParams({
  action: "query",
  generator: "categorymembers",
  gcmtitle: "Category:Fictional_flags",
  gcmtype: "file",
  gcmlimit: "max",
  prop: "imageinfo",
  iiprop: "url|extmetadata",
  format: "json",
  formatversion: "2",
  origin: "*",
}).toString();

const allowedLicenses = new Set([
  "CC0",
  "Public domain",
  "CC BY 4.0",
  "CC BY-SA 3.0",
  "CC BY-SA 4.0",
]);

function plainText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return value
    .replace(/^File:/i, "")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueName(title, usedNames) {
  const titleSlug = slug(title);
  const base = `fictional_${titleSlug.length > 0 ? titleSlug : "flag"}`.slice(
    0,
    32,
  );
  if (!usedNames.has(base)) return base;
  const suffix = createHash("sha1").update(title).digest("hex").slice(0, 5);
  return `${base.slice(0, 26)}_${suffix}`;
}

function rarityFor(index) {
  return ["common", "uncommon", "rare", "epic", "legendary"][index % 5];
}

function priceFor(index) {
  return [250, 400, 600, 850, 1200][index % 5];
}

function svgData(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const wrapFamilies = [
  "apex",
  "cascade",
  "circuit",
  "comet",
  "horizon",
  "prism",
  "ripple",
  "slash",
  "spectrum",
  "vortex",
];
const wrapColors = [
  ["crimson", 355],
  ["ember", 18],
  ["gold", 44],
  ["lime", 90],
  ["emerald", 145],
  ["aqua", 178],
  ["azure", 210],
  ["indigo", 245],
  ["violet", 280],
  ["magenta", 320],
];

function wrapSvg(familyIndex, hue) {
  const accent = (hue + 38 + familyIndex * 7) % 360;
  const dark = (hue + 205) % 360;
  const transforms = [
    '<path d="M-30 190L92-20h58L28 210z" fill="url(#a)"/><path d="M68 210L190-10h38L108 210z" fill="url(#b)"/>',
    '<path d="M0 38Q64 4 128 38t128 0v54Q192 58 128 92T0 92z" fill="url(#a)"/><path d="M0 148q64-34 128 0t128 0v54q-64-34-128 0T0 202z" fill="url(#b)"/>',
    '<g fill="none" stroke="url(#a)" stroke-width="16"><path d="M-20 50h82v50h76v54h138"/><path d="M18 236v-62h64v-58h74V42h120"/></g>',
    '<path d="M-20 192L74 98l38 38L218 30l58 58-132 132z" fill="url(#a)"/><circle cx="78" cy="70" r="34" fill="url(#b)"/>',
    '<path d="M0 82h256v92H0z" fill="url(#a)"/><path d="M0 104h256v48H0z" fill="url(#b)"/>',
    '<path d="M128 12l42 78 86 38-86 38-42 78-42-78L0 128l86-38z" fill="url(#a)"/><circle cx="128" cy="128" r="38" fill="url(#b)"/>',
    '<g fill="none" stroke="url(#a)" stroke-width="18"><circle cx="128" cy="128" r="92"/><circle cx="128" cy="128" r="55"/></g><circle cx="128" cy="128" r="25" fill="url(#b)"/>',
    '<path d="M-20 30L276 190v66L-20 96z" fill="url(#a)"/><path d="M82-20l194 104v42L48 4z" fill="url(#b)"/>',
    '<path d="M0 0h86l42 72L170 0h86l-74 128 74 128h-86l-42-72-42 72H0l74-128z" fill="url(#a)"/>',
    '<path d="M128 128m-118 0a118 118 0 1 0 236 0a88 88 0 1 1-176 0 58 58 0 1 0 116 0 28 28 0 1 1-56 0" fill="none" stroke="url(#a)" stroke-width="24"/>',
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${dark} 38% 10%)"/><stop offset="1" stop-color="hsl(${hue} 65% 23%)"/></linearGradient><linearGradient id="a"><stop stop-color="hsl(${hue} 96% 62%)"/><stop offset="1" stop-color="hsl(${accent} 94% 54%)"/></linearGradient><linearGradient id="b" x2="1" y2="1"><stop stop-color="hsl(${accent} 100% 76%)" stop-opacity=".92"/><stop offset="1" stop-color="hsl(${hue} 96% 48%)" stop-opacity=".2"/></linearGradient></defs><rect width="256" height="256" fill="url(#g)"/>${transforms[familyIndex]}<path d="M0 224L224 0h32v32L32 256H0z" fill="#fff" opacity=".08"/></svg>`;
}

const response = await fetch(commonsApi, {
  headers: { "user-agent": "OpenBack cosmetics importer/1.0" },
});
if (!response.ok) throw new Error(`Wikimedia API returned ${response.status}`);
const payload = await response.json();
const pages = [...(payload.query?.pages ?? [])].sort((a, b) =>
  a.title.localeCompare(b.title),
);
if (pages.length !== 150) {
  throw new Error(
    `Expected 150 direct fictional flags, received ${pages.length}`,
  );
}

const thumbnailUrls = new Map();
for (let offset = 0; offset < pages.length; offset += 50) {
  const thumbnailApi = new URL("https://commons.wikimedia.org/w/api.php");
  thumbnailApi.search = new URLSearchParams({
    action: "query",
    titles: pages
      .slice(offset, offset + 50)
      .map((page) => page.title)
      .join("|"),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "320",
    format: "json",
    formatversion: "2",
    origin: "*",
  }).toString();
  const thumbnailResponse = await fetch(thumbnailApi, {
    headers: { "user-agent": "OpenBack cosmetics importer/1.0" },
  });
  if (!thumbnailResponse.ok) {
    throw new Error(
      `Wikimedia thumbnail API returned ${thumbnailResponse.status}`,
    );
  }
  const thumbnailPayload = await thumbnailResponse.json();
  for (const page of thumbnailPayload.query?.pages ?? []) {
    const url = page.imageinfo?.[0]?.thumburl;
    if (url) thumbnailUrls.set(page.title, url);
  }
}

const cosmetics = JSON.parse(await readFile(cosmeticsPath, "utf8"));
cosmetics.flags ??= {};
cosmetics.skins ??= {};
for (const key of Object.keys(cosmetics.flags)) {
  if (key.startsWith("fictional_")) delete cosmetics.flags[key];
}
for (const key of Object.keys(cosmetics.skins)) {
  if (key.startsWith("wrap_")) delete cosmetics.skins[key];
}

const usedFlagNames = new Set(Object.keys(cosmetics.flags));
const creditRows = [];
for (const [index, page] of pages.entries()) {
  const info = page.imageinfo?.[0];
  const metadata = info?.extmetadata ?? {};
  const license = plainText(metadata.LicenseShortName?.value);
  if (!info?.url || !allowedLicenses.has(license)) {
    throw new Error(
      `Unsupported or missing license for ${page.title}: ${license}`,
    );
  }
  const name = uniqueName(page.title, usedFlagNames);
  usedFlagNames.add(name);
  const artist =
    plainText(metadata.Artist?.value) || "Wikimedia Commons contributor";
  const shopUrl = thumbnailUrls.get(page.title);
  if (!shopUrl) throw new Error(`Missing thumbnail for ${page.title}`);
  cosmetics.flags[name] = {
    name,
    url: shopUrl,
    product: null,
    priceSoft: priceFor(index),
    rarity: rarityFor(index),
    artist: artist.slice(0, 100),
  };
  const descriptionUrl = info.descriptionurl;
  const licenseUrl = plainText(metadata.LicenseUrl?.value) || descriptionUrl;
  creditRows.push(
    `- [${page.title.replace(/^File:/, "")}](${descriptionUrl}) — ${artist}; [${license}](${licenseUrl})`,
  );
}

for (const [familyIndex, family] of wrapFamilies.entries()) {
  for (const [colorIndex, [color, hue]] of wrapColors.entries()) {
    const name = `wrap_${family}_${color}`;
    const index = familyIndex * wrapColors.length + colorIndex;
    cosmetics.skins[name] = {
      name,
      url: svgData(wrapSvg(familyIndex, hue)),
      product: null,
      priceSoft: [300, 500, 750, 1000, 1500][index % 5],
      rarity: rarityFor(index),
      artist: "OpenBack",
    };
  }
}

await writeFile(cosmeticsPath, `${JSON.stringify(cosmetics, null, 2)}\n`);

const markerStart = "<!-- OPENBACK FICTIONAL FLAGS START -->";
const markerEnd = "<!-- OPENBACK FICTIONAL FLAGS END -->";
const existingCredits = await readFile(creditsPath, "utf8");
const before = existingCredits.includes(markerStart)
  ? existingCredits.slice(0, existingCredits.indexOf(markerStart)).trimEnd()
  : existingCredits.trimEnd();
const after = existingCredits.includes(markerEnd)
  ? existingCredits
      .slice(existingCredits.indexOf(markerEnd) + markerEnd.length)
      .trimStart()
  : "";
const generatedCredits = `${markerStart}\n\n## OpenBack Fictional Flag Cosmetics\n\nThe following shop flags are served from Wikimedia Commons. Each item retains its individual source, creator, and license attribution. The 100 wrap skins are original OpenBack SVG artwork by **frootz jhklphy** and are not redistributed Vecteezy assets.\n\n${creditRows.join("\n")}\n\n${markerEnd}`;
await writeFile(
  creditsPath,
  `${before}\n\n${generatedCredits}${after ? `\n\n${after}` : ""}\n`,
);

console.log(
  `Imported ${pages.length} fictional flags and 100 original wrap skins.`,
);
