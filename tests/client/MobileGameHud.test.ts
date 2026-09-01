import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile game HUD", () => {
  const playerInfo = readFileSync(
    "src/client/hud/layers/PlayerInfoOverlay.ts",
    "utf8",
  );
  const controlPanel = readFileSync(
    "src/client/hud/layers/ControlPanel.ts",
    "utf8",
  );
  const unitDisplay = readFileSync(
    "src/client/hud/layers/UnitDisplay.ts",
    "utf8",
  );
  const index = readFileSync("index.html", "utf8");
  const styles =
    readFileSync("src/client/styles.css", "utf8") +
    // OpenBack rules live in their own sheet so upstream styles.css stays
    // untouched and merges cleanly; assert across both.
    readFileSync("src/client/styles/openback.css", "utf8");

  it("keeps the phone player panel edge-to-edge", () => {
    expect(playerInfo).toContain("player-info-surface");
    expect(playerInfo).toContain("w-full sm:w-[720px] sm:max-w-[96vw]");
    expect(playerInfo).not.toContain("w-full sm:w-[720px] max-w-[96vw]");
  });

  it("provides stable responsive HUD hooks", () => {
    expect(index).toContain('id="game-bottom-hud"');
    expect(index).toContain("game-safe-area");
    expect(index).toContain("game-hud-primary");
    expect(controlPanel).toContain("game-control-panel");
    expect(unitDisplay).toContain("game-unit-grid");
    expect(unitDisplay).toContain("game-unit-item");
  });

  it("keeps curved-screen safe areas inside the mobile HUD", () => {
    expect(styles).toContain("max(0.25rem, env(safe-area-inset-left))");
    expect(styles).toContain("max(0.25rem, env(safe-area-inset-right))");
    expect(styles).toContain("--game-safe-top");
    expect(styles).toContain("--game-safe-bottom");
    expect(styles).toContain("max(0.75rem, env(safe-area-inset-left))");
    expect(styles).toContain("max(0.75rem, env(safe-area-inset-right))");
    expect(styles).toContain(".game-top-right-safe");
    expect(styles).toContain(".game-left-sidebar-surface");
    // The column count comes from the variable the panel sets per render, not
    // a hardcoded number. It carries a fallback now -- an unset custom
    // property with no fallback makes the whole declaration invalid, which
    // renders as a single column -- so allow either form.
    expect(styles).toMatch(
      /\.player-info-unit-grid\s*{[^}]*grid-template-columns:\s*repeat\(\s*var\(--player-unit-columns[,)]/s,
    );
  });

  it("keeps complete unit information inside the mobile viewport", () => {
    expect(unitDisplay).toContain("game-unit-tooltip");
    expect(unitDisplay).toContain("game-unit-mobile-info");
    expect(styles).toContain("100dvw - var(--game-safe-left)");
    expect(styles).toContain("var(--game-safe-right)");
    expect(styles).toMatch(
      /\.game-unit-mobile-info\s*{[^}]*env\(safe-area-inset-bottom\)/s,
    );
  });

  it("defines a short-landscape layout without hiding controls", () => {
    expect(styles).toMatch(
      /@media \(orientation: landscape\)[^{]*\(max-height: 600px\)/,
    );
    expect(styles).toMatch(
      /\.game-unit-grid\s*{[^}]*grid-template-columns:\s*repeat\(\s*var\(--game-unit-columns(?:,\s*\d+)?\),/s,
    );
    expect(styles).not.toMatch(/grid-template-columns:\s*repeat\((?:8|16),/);
    expect(unitDisplay).toContain("bottomHudLayout");
    expect(unitDisplay).toContain("ResizeObserver");
    expect(unitDisplay).toContain("data-label-mode");
    expect(styles).toContain("#game-bottom-hud");
    expect(styles).not.toMatch(
      /@media \(orientation: landscape\)[\s\S]*?\.game-unit-grid\s*{[^}]*display:\s*none/,
    );
  });
});
