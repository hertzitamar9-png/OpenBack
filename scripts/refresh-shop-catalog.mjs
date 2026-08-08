import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cosmeticsPath = path.join(root, "resources", "cosmetics.json");

const svgData = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const outline = "#07111f";
const crowns = {
  command_crown: {
    rarity: "common",
    priceSoft: 350,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#dff6ff"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><path d="M36 188L25 82l55 42 48-82 48 82 55-42-11 106z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M45 177h166v38H45z" fill="#0284c7" stroke="${outline}" stroke-width="11"/><path d="M128 91l11 22 25 4-18 17 4 25-22-12-22 12 4-25-18-17 25-4z" fill="#f8fafc" stroke="${outline}" stroke-width="5"/></svg>`,
  },
  victory_crown: {
    rarity: "uncommon",
    priceSoft: 600,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#fff7ae"/><stop offset="1" stop-color="#eab308"/></linearGradient></defs><path d="M67 181L48 91l48 31 32-77 32 77 48-31-19 90z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M63 174h130v38H63z" fill="#facc15" stroke="${outline}" stroke-width="11"/><g fill="none" stroke="#fef3c7" stroke-width="11" stroke-linecap="round"><path d="M52 204c-29-22-36-58-17-84"/><path d="M204 204c29-22 36-58 17-84"/></g><g fill="#fde047" stroke="${outline}" stroke-width="4"><path d="M35 121l-17-17 25-1z"/><path d="M26 147L5 136l24-9z"/><path d="M221 121l17-17-25-1z"/><path d="M230 147l21-11-24-9z"/></g></svg>`,
  },
  ember_crown: {
    rarity: "rare",
    priceSoft: 900,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#fef08a"/><stop offset=".48" stop-color="#f97316"/><stop offset="1" stop-color="#b91c1c"/></linearGradient></defs><path d="M46 188c-8-45 21-67 7-117 31 15 43 36 48 57 4-40 34-62 30-102 44 35 53 67 44 102 14-20 29-34 48-43 2 47-5 74-17 103z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M47 176h162v39H47z" fill="#dc2626" stroke="${outline}" stroke-width="11"/><path d="M128 82c18 23 19 47 0 70-19-23-18-47 0-70z" fill="#fff7ae" stroke="${outline}" stroke-width="6"/></svg>`,
  },
  emerald_crown: {
    rarity: "epic",
    priceSoft: 1200,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#bbf7d0"/><stop offset="1" stop-color="#059669"/></linearGradient></defs><path d="M36 178l18-98 50 43 24-82 24 82 50-43 18 98z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M48 174h160v40H48z" fill="#047857" stroke="${outline}" stroke-width="11"/><g fill="#a7f3d0" stroke="${outline}" stroke-width="5"><path d="M78 125l18 23-18 23-18-23z"/><path d="M128 102l23 31-23 31-23-31z"/><path d="M178 125l18 23-18 23-18-23z"/></g><path d="M128 59c17 12 25 25 25 39-17 1-29-7-36-22-1-7 3-13 11-17z" fill="#34d399" stroke="${outline}" stroke-width="5"/></svg>`,
  },
  royal_crown: {
    rarity: "legendary",
    priceSoft: 1700,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#f5d0fe"/><stop offset="1" stop-color="#9333ea"/></linearGradient></defs><path d="M28 179L20 73l49 42 25-70 34 59 34-59 25 70 49-42-8 106z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M37 173h182v43H37z" fill="#7e22ce" stroke="${outline}" stroke-width="11"/><g stroke="${outline}" stroke-width="5"><path d="M128 107l24 30-24 30-24-30z" fill="#fef08a"/><circle cx="72" cy="146" r="13" fill="#67e8f9"/><circle cx="184" cy="146" r="13" fill="#fb7185"/></g><path d="M45 194h166" stroke="#e9d5ff" stroke-width="7" stroke-linecap="round"/></svg>`,
  },
  midnight_crown: {
    rarity: "mythic",
    priceSoft: 2600,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><radialGradient id="g"><stop stop-color="#818cf8"/><stop offset="1" stop-color="#1e1b4b"/></radialGradient></defs><path d="M33 183L19 74l62 46 47-91 47 91 62-46-14 109z" fill="url(#g)" stroke="${outline}" stroke-width="12" stroke-linejoin="round"/><path d="M42 176h172v40H42z" fill="#312e81" stroke="${outline}" stroke-width="11"/><path d="M141 82c-25 4-41 24-37 48 4 23 25 39 49 35-13 12-32 18-51 13-31-8-49-39-41-70 8-30 38-49 68-42 5 2 9 3 12 6z" fill="#e0e7ff" stroke="${outline}" stroke-width="6"/><g fill="#f8fafc"><circle cx="189" cy="105" r="7"/><circle cx="173" cy="75" r="5"/><circle cx="202" cy="144" r="4"/></g></svg>`,
  },
};

const rarityPrices = {
  common: 250,
  uncommon: 400,
  rare: 650,
  epic: 950,
  legendary: 1400,
  mythic: 2300,
  ultra: 3600,
};

function importedFlagRarity(item) {
  const digest = createHash("sha256")
    .update(`${item.name}|${item.url}|${item.artist ?? ""}`)
    .digest();
  const score = digest.readUInt16BE(0) % 1000;
  if (score < 360) return "common";
  if (score < 620) return "uncommon";
  if (score < 800) return "rare";
  if (score < 910) return "epic";
  if (score < 970) return "legendary";
  if (score < 993) return "mythic";
  return "ultra";
}

const cosmetics = JSON.parse(await readFile(cosmeticsPath, "utf8"));

for (const [name, spec] of Object.entries(crowns)) {
  cosmetics.crowns[name] = {
    ...cosmetics.crowns[name],
    name,
    url: svgData(spec.svg),
    rarity: spec.rarity,
    priceSoft: spec.priceSoft,
    artist: "OpenBack",
  };
}

for (const [name, flag] of Object.entries(cosmetics.flags)) {
  if (!name.startsWith("fictional_")) continue;
  const rarity = importedFlagRarity(flag);
  flag.rarity = rarity;
  flag.priceSoft = rarityPrices[rarity];
}

await writeFile(cosmeticsPath, `${JSON.stringify(cosmetics, null, 2)}\n`);
console.log(
  "Refreshed unique crown artwork and item-specific fictional-flag rarity.",
);
