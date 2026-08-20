import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Twin World public lobby scheduling", () => {
  it("maintains a scheduled lobby for both experiences in every playlist", () => {
    const source = readFileSync("src/server/MasterLobbyService.ts", "utf8");
    expect(source).toContain(
      'for (const experienceMode of ["2d", "3d"] as const)',
    );
    expect(source).toContain("lobby.experienceMode === experienceMode");
    expect(source).toContain("experienceMode,");
  });
});
