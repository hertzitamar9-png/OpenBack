import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Someone who opened the site once is not a player.
 *
 * Every visitor without a session is handed an account so the game can talk to
 * them at all, so a crawler, a private window, or a second browser each adds a
 * row. On the live server that made 74 accounts of which 3 had ever signed up
 * and 6 had ever played, and the owner reasonably read the rest as bots.
 *
 * They are still available behind a toggle, because how many people looked is
 * worth knowing -- it just is not the same question as who played.
 */
const modal = readFileSync("src/client/OwnerAnalyticsModal.ts", "utf8");
const usernameInput = readFileSync("src/client/UsernameInput.ts", "utf8");

describe("owner dashboard player list", () => {
  it("counts someone as a player once they play or sign up", () => {
    expect(modal).toMatch(
      /hasArrived[\s\S]{0,120}gamesPlayed > 0 \|\| player\.email !== null/,
    );
  });

  it("hides visitors by default but keeps the count", () => {
    expect(modal).toMatch(/showVisitors = false/);
    expect(modal).toMatch(
      /if \(!this\.showVisitors && !hasArrived\(player\)\)/,
    );
    expect(modal).toMatch(/const visitors = data\.players\.filter/);
  });

  it("offers a way to see them", () => {
    expect(modal).toContain("analytics.show_visitors");
    expect(modal).toContain("analytics.hide_visitors");
  });
});

/**
 * A name the game invented for someone must never be filed as theirs.
 *
 * The placeholder is drawn once and kept in the browser, so a person visiting
 * without a session repeatedly hands the same made-up name to every account
 * they are given. Five accounts on the live server were all called
 * AnonPulley5 that way.
 */
describe("placeholder names", () => {
  it("marks a generated name as a placeholder", () => {
    expect(usernameInput).toMatch(
      /genAnonUsername\(\);\s*\n\s*this\.nameIsPlaceholder = true;/,
    );
  });

  it("stops being a placeholder once the player types", () => {
    expect(usernameInput).toMatch(
      /this\.baseUsername = val;[\s\S]{0,120}this\.nameIsPlaceholder = false;/,
    );
  });

  it("never records a placeholder on the account", () => {
    expect(usernameInput).toMatch(
      /rememberNameOnAccount\(name: string\) \{\s*\n\s*if \(this\.nameIsPlaceholder\) return;/,
    );
  });
});
