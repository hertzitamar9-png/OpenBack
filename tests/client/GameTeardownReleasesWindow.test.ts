import { afterEach, describe, expect, it, vi } from "vitest";
import { GameRenderer } from "../../src/client/hud/GameRenderer";
import { TransformHandler } from "../../src/client/TransformHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";

/**
 * A match has to hand the window back when it ends.
 *
 * One HUD renderer and one camera are built per match, but `window` and its
 * timers outlive them all. Nothing took the resize listener off, and a camera
 * glide interrupted by the game ending kept running -- so each game played
 * left another handler measuring a canvas nobody was looking at, holding that
 * game's camera, UI state and HUD layers alive behind it.
 */
function makeGame(): GameView {
  const width = 200;
  const height = 100;
  return {
    config: () => ({ experienceMode: () => "2d" }),
    width: () => width,
    height: () => height,
    isValidCoord: (x: number, y: number) =>
      x >= 0 && y >= 0 && x < width && y < height,
    ref: (x: number, y: number) => y * width + x,
    terrainByte: () => 0x86,
  } as unknown as GameView;
}

function makeCanvas(): HTMLElement {
  const canvas = document.createElement("div");
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({
      width: 400,
      height: 300,
      left: 0,
      top: 0,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return canvas;
}

function makeRenderer(): {
  renderer: GameRenderer;
  transform: TransformHandler;
} {
  const transform = new TransformHandler(
    makeGame(),
    new EventBus(),
    makeCanvas(),
  );
  const renderer = new GameRenderer(
    transform,
    { ghostStructure: null } as UIState,
    [],
    null,
  );
  return { renderer, transform };
}

describe("a finished match releases the window", () => {
  afterEach(() => vi.useRealTimers());

  it("measures the canvas on resize while the match is running", () => {
    const { renderer, transform } = makeRenderer();
    const measure = vi.spyOn(transform, "updateCanvasBoundingRect");
    renderer.initialize();

    window.dispatchEvent(new Event("resize"));

    expect(measure).toHaveBeenCalledTimes(1);
  });

  it("stops measuring once the match is torn down", () => {
    const { renderer, transform } = makeRenderer();
    const measure = vi.spyOn(transform, "updateCanvasBoundingRect");
    renderer.initialize();
    renderer.destroy();

    window.dispatchEvent(new Event("resize"));

    expect(measure).not.toHaveBeenCalled();
  });

  it("leaves a running match alone when an earlier one is torn down", () => {
    // The case that makes the leak visible: a second game starts while the
    // first game's renderer is still subscribed.
    const first = makeRenderer();
    const second = makeRenderer();
    const firstMeasure = vi.spyOn(first.transform, "updateCanvasBoundingRect");
    const secondMeasure = vi.spyOn(
      second.transform,
      "updateCanvasBoundingRect",
    );
    first.renderer.initialize();
    second.renderer.initialize();
    first.renderer.destroy();

    window.dispatchEvent(new Event("resize"));

    expect(firstMeasure).not.toHaveBeenCalled();
    expect(secondMeasure).toHaveBeenCalledTimes(1);
  });

  it("stops a camera glide that the match ended mid-flight", () => {
    vi.useFakeTimers();
    const { renderer, transform } = makeRenderer();
    renderer.initialize();
    // Somewhere far enough away that the glide cannot have arrived.
    transform.onGoToPosition({ x: 190, y: 95 } as unknown as never);
    const gliding = vi.getTimerCount();
    expect(gliding).toBeGreaterThan(0);

    renderer.destroy();

    expect(vi.getTimerCount()).toBeLessThan(gliding);
  });

  it("keeps the glide running while the match is still on", () => {
    // The teardown must be what stops it, not the act of starting one.
    vi.useFakeTimers();
    const { transform } = makeRenderer();
    transform.onGoToPosition({ x: 190, y: 95 } as unknown as never);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});
