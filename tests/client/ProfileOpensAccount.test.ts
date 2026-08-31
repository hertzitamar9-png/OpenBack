import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Pressing the profile pill opens the account page, not the shortcut menu.
 *
 * The pill is labelled PROFILE and shows the player's picture and name, so
 * pressing it should go to the page with the account, stats, games and friends
 * tabs -- which is what a player means by their profile. It used to open only
 * the small dropdown, and there was no route to that page from the bar at all.
 * The chevron beside the picture is what opens the dropdown.
 */
const menu = readFileSync("src/client/components/NavAccountMenu.ts", "utf8");
const nav = readFileSync("src/client/components/DesktopNavBar.ts", "utf8");
const helper = readFileSync("src/client/utilities/OpenOwnProfile.ts", "utf8");

describe("profile opens the account page", () => {
  it("goes to page-account, the one with the friends tab", () => {
    expect(helper).toMatch(/pageId: "page-account"/);
  });

  it("opens it when the press missed the chevron", () => {
    expect(menu).toMatch(/data-account-chevron/);
    expect(menu).toMatch(
      /if \(!onChevron\) \{[\s\S]{0,140}openAccountSettings\(\);/,
    );
  });

  it("still opens the dropdown from the chevron", () => {
    expect(menu).toMatch(/this\.menuOpen = !this\.menuOpen;/);
  });

  it("does not open the dropdown at the same time", () => {
    // Navigating away with the menu left open would leave it hanging over the
    // page it moved to, since the panel is portalled to the body.
    expect(menu).toMatch(/if \(!onChevron\) \{\s*\n\s*this\.menuOpen = false;/);
  });

  it("offers the same thing from the bar, beside Clans", () => {
    expect(nav).toMatch(/data-page="page-clan"/);
    expect(nav).toMatch(/data-i18n="main\.profile"/);
    expect(nav).toMatch(/openAccountSettings\(\)/);
  });

  it("leaves a signed-out player signing in rather than navigating", () => {
    expect(menu).toMatch(
      /if \(!this\.isSignedIn\(\)\) \{\s*\n\s*this\.signIn\(\);/,
    );
  });
});
