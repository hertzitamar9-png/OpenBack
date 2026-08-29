import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The score is kept in the repository split into pieces.
 *
 * Each track is three hours at the quality it was recorded in, past the 100 MB
 * a single file may be in a push, and compression is no way out: an MP3 is
 * already entropy-coded and gzip and xz each save under 1% of one. So the
 * bytes are stored in pieces and joined back before a build.
 *
 * These checks are on the manifest and the pieces on disk, not on the joined
 * audio -- assemble-music.mjs verifies the SHA-256 of the result every time it
 * runs, and a wrong file stops the build there.
 */
const musicDir = path.join("resources", "sounds", "music");
const manifest = JSON.parse(
  readFileSync(path.join(musicDir, "music-manifest.json"), "utf8"),
) as Record<string, { sha256: string; bytes: number; parts: string[] }>;

describe("background score parts", () => {
  it("covers both experiences", () => {
    expect(Object.keys(manifest).sort()).toEqual([
      "openback-theme-2d.mp3",
      "openback-theme-3d.mp3",
    ]);
  });

  it.each(Object.entries(manifest))(
    "%s has every piece it lists",
    (_name, entry) => {
      expect(entry.parts.length).toBeGreaterThan(0);
      for (const part of entry.parts) {
        expect(() => statSync(path.join(musicDir, part))).not.toThrow();
      }
    },
  );

  it.each(Object.entries(manifest))(
    "%s pieces add up to the recorded length",
    (_name, entry) => {
      const total = entry.parts.reduce(
        (sum, part) => sum + statSync(path.join(musicDir, part)).size,
        0,
      );
      expect(total).toBe(entry.bytes);
    },
  );

  it.each(Object.entries(manifest))(
    "%s keeps every piece pushable",
    (_name, entry) => {
      // A push refuses any file over 100 MB, which is the whole reason these
      // are split; a piece that grew past it would be rejected at the remote.
      const limit = 100 * 1000 * 1000;
      for (const part of entry.parts) {
        expect(statSync(path.join(musicDir, part)).size).toBeLessThan(limit);
      }
    },
  );

  it.each(Object.entries(manifest))("%s records a SHA-256", (_name, entry) => {
    expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
