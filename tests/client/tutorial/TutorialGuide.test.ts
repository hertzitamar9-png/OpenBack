import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TutorialGuide } from "../../../src/client/hud/layers/TutorialGuide";
import { TransformHandler } from "../../../src/client/TransformHandler";
import { GameView } from "../../../src/client/view/GameView";
import { GameType } from "../../../src/core/game/Game";
import { MissionSnapshot } from "../../../src/core/tutorial/Mission";

const snapshot = (phase: number): MissionSnapshot => ({
  phase,
  elapsedTicks: 250,
  phaseTicks: 0,
  objectiveMet: false,
  completed: false,
  skipped: false,
  recovered: 0,
  cue: "briefing",
});
beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
async function mount(gameType = GameType.Singleplayer) {
  const command = vi.fn();
  const game = {
    tutorial: snapshot(2),
    worker: { tutorialCommand: command },
    config: () => ({
      gameConfig: () => ({ gameType, tutorialMission: "first-command-v1" }),
    }),
  } as unknown as GameView;
  const guide = new TutorialGuide();
  guide.setGame(game);
  document.body.append(guide);
  guide.init();
  guide.tick();
  await guide.updateComplete;
  return { guide, game, command };
}
it("uses authoritative mission config, not a stale storage flag", async () => {
  sessionStorage.setItem("openback.tutorial.active", "1");
  const { guide } = await mount(GameType.Public);
  expect(guide.querySelector(".mission-panel")).toBeNull();
  sessionStorage.clear();
});
it("sends a real slider action and offers skip without requiring a game tick", async () => {
  const { guide, command } = await mount();
  const slider = document.createElement("input");
  slider.type = "range";
  slider.dataset.tutorial = "troop-ratio";
  slider.value = "40";
  document.body.append(slider);
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  expect(command).toHaveBeenCalledWith({
    phase: 2,
    action: "ratio",
    value: 40,
  });
  guide.querySelector<HTMLButtonElement>(".mission-footer button")!.click();
  await guide.updateComplete;
  expect(command).toHaveBeenCalledWith({ phase: 2, action: "skip" });
  expect(guide.querySelector(".mission-finale")).not.toBeNull();
});
it("removes listeners and tutorial-only layout on disposal", async () => {
  const { guide, command } = await mount();
  expect(document.body.classList.contains("first-command-active")).toBe(true);
  guide.dispose();
  await guide.updateComplete;
  expect(document.body.classList.contains("first-command-active")).toBe(false);
  const input = document.createElement("input");
  input.type = "range";
  input.dataset.tutorial = "troop-ratio";
  document.body.append(input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  expect(command).not.toHaveBeenCalled();
  expect(guide.querySelector(".mission-panel")).toBeNull();
});

it("focuses a phone objective below the briefing, not underneath its buttons", async () => {
  vi.stubGlobal("innerWidth", 320);
  vi.stubGlobal("innerHeight", 568);
  const { guide, game } = await mount();
  const focusMission = vi.fn();
  guide.setGame(game, { focusMission } as unknown as TransformHandler);
  guide.querySelector<HTMLElement>(".mission-panel")!.getBoundingClientRect =
    () => new DOMRect(12, 66, 296, 244);
  guide.querySelector<HTMLButtonElement>(".mission-focus")!.click();
  expect(focusMission).toHaveBeenCalledWith(220, 228.2, 1.25);
});
