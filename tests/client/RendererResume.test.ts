import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("battlefield renderer resume", () => {
  const runner = readFileSync("src/client/ClientGameRunner.ts", "utf8");

  it("forces an immediate and next-frame map draw when the app returns", () => {
    expect(runner).toContain("resumeRenderingImmediately");
    expect(runner).toContain(
      'document.addEventListener("visibilitychange", resumeRenderingImmediately)',
    );
    expect(runner).toContain(
      'window.addEventListener("pageshow", resumeRenderingImmediately)',
    );
    expect(runner).toMatch(
      /resumeRenderingImmediately[\s\S]*?syncCamera\(\);[\s\S]*?requestAnimationFrame/,
    );
  });
});
