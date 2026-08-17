import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile homepage match layout", () => {
  const selector = readFileSync("src/client/GameModeSelector.ts", "utf8");
  const styles =
    readFileSync("src/client/styles.css", "utf8") +
    // OpenBack rules live in their own sheet so upstream styles.css stays
    // untouched and merges cleanly; assert across both.
    readFileSync("src/client/styles/openback.css", "utf8");

  it("shows all three matches in a responsive mosaic instead of a carousel", () => {
    expect(selector).toContain("mobile-lobby-mosaic");
    expect(selector).toContain("mobile-lobby-feature");
    expect(selector).toContain("mobile-lobby-secondary");
    expect(selector).not.toContain(
      'class="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory',
    );
    expect(styles).toMatch(
      /\.mobile-lobby-mosaic\s*{[^}]*grid-template-columns:\s*repeat\(2,/s,
    );
  });

  it("keeps the phone composition through short landscape widths", () => {
    expect(selector).toContain("home-command-layout");
    expect(selector).toContain("mobile-home-primary-actions lg:hidden");
    expect(selector).toContain("mobile-home-secondary-actions lg:hidden");
    expect(selector).toContain("mobile-lobby-mosaic lg:hidden");
    expect(selector).toContain("desktop-home-actions hidden lg:block");
    expect(selector).toContain("desktop-home-secondary-actions");
    expect(selector).toContain("desktop-lobby-feature");
    expect(selector).toContain("desktop-lobby-secondary");
    expect(styles).toContain(
      "@media (max-width: 1023px) {\n  .mobile-lobby-mosaic",
    );
    expect(styles).toMatch(
      /\.mobile-lobby-feature\s*>\s*button\s*{[^}]*height:\s*11rem/s,
    );
    expect(styles).toMatch(
      /@media \(orientation: landscape\)[^{]*\(max-height: 600px\)[^{]*\(max-width: 1366px\)[\s\S]*?\.mobile-lobby-mosaic\s*{[^}]*grid-template-columns:\s*repeat\(3,/s,
    );
    expect(styles).toMatch(
      /@media \(orientation: landscape\)[\s\S]*?\.desktop-home-actions,[\s\S]*?\.desktop-home-secondary-actions,[\s\S]*?\.desktop-lobby-feature,[\s\S]*?\.desktop-lobby-secondary\s*{[^}]*display:\s*none\s*!important/s,
    );
    expect(styles).toMatch(
      /@media \(orientation: landscape\)[\s\S]*?\.home-command-layout\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*3fr\)/s,
    );
  });

  it("locks the fitted phone homepage while leaving subpages scrollable", () => {
    expect(styles).toMatch(
      /body:not\(\.openback-subpage-open\)\s+\.main-layout-scroll\s*{[^}]*overflow-y:\s*hidden\s*!important[^}]*overscroll-behavior:\s*none/s,
    );
  });
});
