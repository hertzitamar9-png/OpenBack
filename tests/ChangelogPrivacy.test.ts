import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("player-facing changelog", () => {
  const changelog = fs.readFileSync(
    path.resolve(__dirname, "../resources/changelog.md"),
    "utf8",
  );

  test("does not publish email addresses", () => {
    expect(changelog).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  test("does not include operator infrastructure or development notes", () => {
    const operatorOnlyTerms = [
      "Brevo",
      "SMTP",
      "Render deployment",
      "Deno Deploy",
      "PostgreSQL",
      "GitHub Actions",
      "ESLint",
      "Prettier",
      "Turnstile",
      "environment variable",
      "webhook",
      "robots.txt",
      "sitemap.xml",
      "admin bot API",
      "CI test",
    ];

    for (const term of operatorOnlyTerms) {
      expect(changelog.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });
});
