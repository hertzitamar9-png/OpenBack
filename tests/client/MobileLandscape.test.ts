import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile landscape support", () => {
  const manifest = JSON.parse(readFileSync("resources/manifest.json", "utf8"));
  const sidebar = readFileSync(
    "src/client/hud/layers/GameRightSidebar.ts",
    "utf8",
  );

  it("does not lock installed OpenBack to portrait", () => {
    expect(manifest.orientation).toBe("any");
  });

  it("shows a portrait-only touch landscape control", () => {
    expect(sidebar).toContain('matchMedia("(pointer: coarse)")');
    expect(sidebar).toContain("window.innerHeight > window.innerWidth");
    expect(sidebar).toContain("this.showLandscapeControl");
    expect(sidebar).toContain("mobile_orientation.enter_landscape");
  });

  it("enters fullscreen before requesting landscape and has a UI fallback", () => {
    const method = sidebar.slice(sidebar.indexOf("requestLandscapeMode"));
    expect(method.indexOf("requestFullscreen()")).toBeGreaterThan(-1);
    expect(method.indexOf('orientation.lock("landscape")')).toBeGreaterThan(
      method.indexOf("requestFullscreen()"),
    );
    expect(method).toContain("mobile_orientation.enable_auto_rotate");
  });
});
