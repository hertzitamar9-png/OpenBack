import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("in-game notification controls", () => {
  const settings = readFileSync("src/core/game/UserSettings.ts", "utf8");
  const events = readFileSync("src/client/hud/layers/EventsDisplay.ts", "utf8");
  const actionable = readFileSync(
    "src/client/hud/layers/ActionableEvents.ts",
    "utf8",
  );
  const modal = readFileSync("src/client/hud/layers/SettingsModal.ts", "utf8");

  it("provides one master switch and the recommended categories", () => {
    expect(settings).toContain("gameNotifications()");
    expect(settings).toContain("gameNotificationCategory(");
    for (const category of [
      "COMBAT",
      "NUKE",
      "ALLIANCE",
      "TRADE",
      "CHAT",
      "WORLD",
    ]) {
      expect(modal).toContain(`MessageCategory.${category}`);
    }
  });

  it("filters informational events but never actionable accept-or-deny cards", () => {
    expect(events).toContain("isGameNotificationEnabled");
    expect(actionable).not.toContain("isGameNotificationEnabled");
  });

  it("supports horizontal swipe dismissal only in the informational feed", () => {
    expect(events).toContain("data-swipe-dismissable");
    expect(events).toContain("dismissEvent(");
    expect(actionable).not.toContain("data-swipe-dismissable");
  });
});
