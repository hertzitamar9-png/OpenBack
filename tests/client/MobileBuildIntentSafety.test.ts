import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile build intent safety", () => {
  const runner = readFileSync("src/client/ClientGameRunner.ts", "utf8");
  const preview = readFileSync(
    "src/client/controllers/BuildPreviewController.ts",
    "utf8",
  );

  it("never converts a build-placement release into an attack", () => {
    expect(runner).toMatch(
      /inputEvent\(event: MouseUpEvent\)[\s\S]*?event\.isBuildPlacement[\s\S]*?return;/,
    );
  });

  it("cancels the selected structure after a confirmed invalid tile", () => {
    expect(preview).toMatch(
      /if \(!unit\)[\s\S]*?pendingConfirm[\s\S]*?removeGhostStructure\(\)/,
    );
  });
});
