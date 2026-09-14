import { afterEach, expect, it, vi } from "vitest";
import { HeadsUpMessage } from "../../../src/client/hud/layers/HeadsUpMessage";
import { TransformHandler } from "../../../src/client/TransformHandler";
import { GameView } from "../../../src/client/view/GameView";
import { EventBus } from "../../../src/core/EventBus";
import { Cell } from "../../../src/core/game/Game";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("clears a finished game's banner but keeps menu toasts usable", async () => {
  const banner = new HeadsUpMessage();
  banner.game = {
    inSpawnPhase: () => false,
    config: () => ({ isRandomSpawn: () => false }),
  } as unknown as GameView;
  document.body.append(banner);
  banner.init();
  await banner.updateComplete;
  expect(banner.textContent?.trim()).not.toBe("");
  banner.dispose();
  await banner.updateComplete;
  expect(banner.textContent?.trim()).toBe("");
  window.dispatchEvent(
    new CustomEvent("show-message", { detail: { message: "Menu notice" } }),
  );
  await banner.updateComplete;
  expect(banner.textContent).toContain("Menu notice");
});

it.each([true, false])(
  "frames the mission with reduced motion=%s",
  (reduced) => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: reduced }));
    const canvas = document.createElement("div");
    canvas.getBoundingClientRect = () => new DOMRect(0, 0, 1280, 720);
    const game = {
      width: () => 768,
      height: () => 512,
      config: () => ({ experienceMode: () => "2d" }),
    } as unknown as GameView;
    const camera = new TransformHandler(game, new EventBus(), canvas);
    camera.override(0, 0, 8);
    camera.focusMission(145, 285, 1.8);
    if (!reduced) vi.advanceTimersByTime(10000);
    expect(camera.scale).toBeCloseTo(1.8, 1);
    const position = camera.worldToScreenCoordinates(new Cell(145, 285));
    expect(Math.abs(position.x - 640)).toBeLessThan(5);
    expect(Math.abs(position.y - 360)).toBeLessThan(5);
    camera.dispose();
  },
);
