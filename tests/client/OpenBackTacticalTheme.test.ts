import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OpenBack Tactical theme", () => {
  const theme = readFileSync("src/client/styles.css", "utf8");
  const variables = readFileSync(
    "src/client/styles/core/variables.css",
    "utf8",
  );

  it.each([
    "--ob-surface-base",
    "--ob-surface-raised",
    "--ob-surface-overlay",
    "--ob-action",
    "--ob-success",
    "--ob-warning",
    "--ob-danger",
    "--ob-border",
    "--ob-text",
    "--ob-text-muted",
    "--ob-radius-sm",
    "--ob-radius-md",
    "--ob-motion-fast",
  ])("defines %s as a shared production token", (token) => {
    expect(theme).toContain(`${token}:`);
  });

  it("routes legacy component variables through OpenBack tokens", () => {
    expect(variables).toContain(
      "--boxBackgroundColor: var(--ob-surface-overlay)",
    );
    expect(variables).toContain("--secondaryColor: var(--ob-action)");
    expect(variables).toContain("--fontColorDark: var(--ob-text)");
  });

  it("supports reduced motion without changing interaction state", () => {
    expect(theme).toContain("@media (prefers-reduced-motion: reduce)");
    expect(theme).toContain("animation-duration: 0.01ms !important");
  });
});
