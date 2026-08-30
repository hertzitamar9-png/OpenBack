import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

type VerificationClass =
  | "openfront-inherited"
  | "openback-generated"
  | "third-party-licensed"
  | "unverified-reference";

interface MapProvenance {
  class: VerificationClass;
  displayName: string;
  origin: string;
  creator: string;
  license: string | null;
  sourceUrl: string | null;
  sourceCommit: string | null;
  generator: string | null;
  generatorSeed: number | null;
  modifications: string;
  manifestSha256: string;
  thumbnailSha256: string;
}

const mapsRoot = path.join("resources", "maps");
const mapDirectories = readdirSync(mapsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const provenance = JSON.parse(
  readFileSync(path.join(mapsRoot, "provenance.json"), "utf8"),
) as Record<string, MapProvenance>;

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

describe("map provenance", () => {
  it("has exactly one evidence record for every shipped map", () => {
    expect(Object.keys(provenance).sort()).toEqual(mapDirectories);
  });

  it("requires evidence appropriate to each verification class", () => {
    for (const [id, record] of Object.entries(provenance)) {
      expect(record.displayName, `${id} display name`).toBeTruthy();
      expect(record.origin, `${id} origin`).toBeTruthy();
      expect(record.creator, `${id} creator`).toBeTruthy();
      expect(record.modifications, `${id} modifications`).toBeTruthy();

      if (record.class === "openfront-inherited") {
        expect(record.license, `${id} inherited licence`).toBe("CC-BY-SA-4.0");
        expect(record.sourceCommit, `${id} upstream commit`).toMatch(
          /^[a-f0-9]{40}$/,
        );
      } else if (record.class === "openback-generated") {
        expect(record.license, `${id} generated licence`).toBeTruthy();
        expect(record.sourceUrl, `${id} input source`).toBeTruthy();
        expect(record.generator, `${id} committed generator`).toBeTruthy();
        if (record.generator?.endsWith("create_openback_fictional_maps.py")) {
          expect(
            Number.isInteger(record.generatorSeed),
            `${id} stable seed`,
          ).toBe(true);
        }
      } else if (record.class === "third-party-licensed") {
        expect(record.license, `${id} third-party licence`).toBeTruthy();
        expect(record.sourceUrl, `${id} source page`).toMatch(/^https:\/\//);
      } else {
        expect(record.license, `${id} unverified licence`).toBeNull();
        expect(record.sourceUrl, `${id} unverified source`).toBeNull();
      }
    }
  });

  it("binds every evidence record to the shipped files", () => {
    for (const [id, record] of Object.entries(provenance)) {
      expect(record.manifestSha256, `${id} manifest hash`).toBe(
        sha256(path.join(mapsRoot, id, "manifest.json")),
      );
      expect(record.thumbnailSha256, `${id} thumbnail hash`).toBe(
        sha256(path.join(mapsRoot, id, "thumbnail.webp")),
      );
    }
  });

  it("ships no map whose source rights remain unverified", () => {
    const unresolved = Object.entries(provenance)
      .filter(([, record]) => record.class === "unverified-reference")
      .map(([id]) => id);
    expect(unresolved).toEqual([]);
  });

  it("regenerates OpenBack-original terrain deterministically", () => {
    const first = mkdtempSync(path.join(os.tmpdir(), "openback-map-a-"));
    const second = mkdtempSync(path.join(os.tmpdir(), "openback-map-b-"));
    try {
      for (const output of [first, second]) {
        execFileSync(
          "python",
          [
            "map-generator/tools/create_openback_fictional_maps.py",
            "--output-root",
            output,
            "--only",
            "avidir",
          ],
          { stdio: "pipe" },
        );
      }

      const firstImage = path.join(first, "avidir", "image.png");
      const secondImage = path.join(second, "avidir", "image.png");
      const firstInfo = path.join(first, "avidir", "info.json");
      const secondInfo = path.join(second, "avidir", "info.json");
      expect(sha256(firstImage)).toBe(sha256(secondImage));
      expect(readFileSync(firstInfo, "utf8")).toBe(
        readFileSync(secondInfo, "utf8"),
      );

      const originalInfo = JSON.parse(
        readFileSync("map-generator/assets/maps/avidir/info.json", "utf8"),
      );
      const regeneratedInfo = JSON.parse(readFileSync(firstInfo, "utf8"));
      expect(regeneratedInfo.id).toBe(originalInfo.id);
      expect(regeneratedInfo.name).toBe(originalInfo.name);
      expect(regeneratedInfo.categories).toEqual(originalInfo.categories);
      expect(regeneratedInfo.multiplayer_frequency).toBe(
        originalInfo.multiplayer_frequency,
      );
      expect(
        regeneratedInfo.nations.map((nation: { name: string }) => nation.name),
      ).toEqual(
        originalInfo.nations.map((nation: { name: string }) => nation.name),
      );
    } finally {
      rmSync(first, { recursive: true, force: true });
      rmSync(second, { recursive: true, force: true });
    }
  });

  it("ships the exact deterministic terrain committed by the generator", () => {
    const output = mkdtempSync(path.join(os.tmpdir(), "openback-map-all-"));
    try {
      execFileSync(
        "python",
        [
          "map-generator/tools/create_openback_fictional_maps.py",
          "--output-root",
          output,
          "--skip-archipelago",
        ],
        { stdio: "pipe" },
      );

      const generatedIds = Object.entries(provenance)
        .filter(([, record]) =>
          record.generator?.endsWith("create_openback_fictional_maps.py"),
        )
        .map(([id]) => id)
        .sort();
      expect(generatedIds).toHaveLength(15);
      for (const id of generatedIds) {
        expect(
          sha256(path.join(output, id, "image.png")),
          `${id} terrain`,
        ).toBe(
          sha256(path.join("map-generator", "assets", "maps", id, "image.png")),
        );
        expect(
          JSON.parse(readFileSync(path.join(output, id, "info.json"), "utf8")),
          `${id} metadata`,
        ).toEqual(
          JSON.parse(
            readFileSync(
              path.join("map-generator", "assets", "maps", id, "info.json"),
              "utf8",
            ),
          ),
        );
      }
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
