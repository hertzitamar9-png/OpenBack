import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Main clean URL ownership", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/client/Main.ts"),
    "utf8",
  );

  it("delegates page navigation protection to AppRouter", () => {
    expect(source).toContain("appRouter.setNavigationGuard");
    expect(source).toContain("await this.handleLeaveLobby()");
    expect(source).not.toContain(
      'window.addEventListener("popstate", onPopState)',
    );
  });

  it("starts AppRouter even when a special lobby URL owns the screen", () => {
    expect(source.match(/await appRouter\.start\(\)/g)).toHaveLength(1);
    expect(source).toContain("parseAppUrl(new URL(window.location.href))");
    expect(source).toContain(
      "const pathMatch = window.location.pathname.match",
    );
  });
});
