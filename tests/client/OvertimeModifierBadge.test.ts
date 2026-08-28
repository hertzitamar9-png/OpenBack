import { describe, expect, it } from "vitest";
import { OvertimePanel } from "../../src/client/components/OvertimePanel";
import { getActiveModifiers } from "../../src/client/Utils";
import type { GameView } from "../../src/client/view";

// Overtime runs as a public FFA modifier, so an active isOvertime modifier
// must surface a lobby badge like every other rotation modifier.
describe("overtime public modifier", () => {
  it("stays hidden for legacy and focused test config doubles", async () => {
    const panel = new OvertimePanel();
    panel.game = {
      config: () => ({ gameConfig: () => ({}) }),
      elapsedGameSeconds: () => 0,
    } as unknown as GameView;
    document.body.appendChild(panel);
    await panel.updateComplete;
    expect(panel.style.display).toBe("none");
    panel.remove();
  });

  it("surfaces an overtime badge when the modifier is active", () => {
    const mods = getActiveModifiers({ isOvertime: true });
    expect(mods).toHaveLength(1);
    expect(mods[0].badgeKey).toBe("public_game_modifier.overtime");
    expect(mods[0].labelKey).toBe("overtime.title");
  });

  it("omits the badge when the modifier is absent", () => {
    expect(getActiveModifiers({})).toHaveLength(0);
    expect(getActiveModifiers({ isOvertime: false })).toHaveLength(0);
  });
});
