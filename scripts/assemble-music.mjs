// Rejoin the background score from the parts held in the repository.
//
// Each track is three hours at the quality it was recorded in, which is past
// the 100 MB a single file may be in a push. Generic compression is no help --
// an MP3 is already entropy-coded, and gzip and xz both save under 1% of it --
// so the tracks are stored split instead. Concatenating the parts reproduces
// the original byte for byte; the recorded SHA-256 is checked so a truncated
// checkout or a half-written file is caught here rather than as silence in
// somebody's game.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const musicDir = path.join(here, "..", "resources", "sounds", "music");
const manifestPath = path.join(musicDir, "music-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error(`[music] no manifest at ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let rebuilt = 0;

for (const [name, entry] of Object.entries(manifest)) {
  const target = path.join(musicDir, name);

  if (fs.existsSync(target) && fs.statSync(target).size === entry.bytes) {
    const existing = createHash("sha256")
      .update(fs.readFileSync(target))
      .digest("hex");
    if (existing === entry.sha256) continue; // already correct
  }

  const pieces = entry.parts.map((part) => {
    const partPath = path.join(musicDir, part);
    if (!fs.existsSync(partPath)) {
      console.error(`[music] missing piece ${part} for ${name}`);
      process.exit(1);
    }
    return fs.readFileSync(partPath);
  });

  const joined = Buffer.concat(pieces);
  const digest = createHash("sha256").update(joined).digest("hex");
  if (digest !== entry.sha256 || joined.length !== entry.bytes) {
    console.error(
      `[music] ${name} did not come back as recorded ` +
        `(${joined.length} bytes, ${digest.slice(0, 12)}…); ` +
        `expected ${entry.bytes} bytes, ${entry.sha256.slice(0, 12)}…`,
    );
    process.exit(1);
  }

  // Write beside the target then move it into place, so an interrupted run
  // never leaves a half-written track that looks finished.
  const pending = `${target}.pending`;
  fs.writeFileSync(pending, joined);
  fs.renameSync(pending, target);
  rebuilt += 1;
  console.log(`[music] assembled ${name} (${joined.length} bytes)`);
}

if (rebuilt === 0) console.log("[music] tracks already in place");
