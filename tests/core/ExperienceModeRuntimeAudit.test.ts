import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const runtimeFiles = [
  "src/client/ClientGameRunner.ts",
  "src/client/InputHandler.ts",
  "src/client/TransformHandler.ts",
  "src/client/render/gl/Renderer.ts",
  "src/core/GameRunner.ts",
  "src/core/execution/TrainExecution.ts",
  "src/core/execution/WorldMechanicsExecution.ts",
  "src/core/pathfinding/PathFinder.Air.ts",
  "src/core/world/ThreeDWorldCycle.ts",
];

describe("experience mode runtime consumers", () => {
  it("uses the canonical experience API instead of the legacy modifier", () => {
    for (const file of runtimeFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source, file).not.toContain("worldMechanics().threeDMode");
      expect(source, file).not.toContain("mechanics.threeDMode");
      expect(source, file).not.toContain("wm.threeDMode");
    }
  });
});
