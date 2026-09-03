import { afterEach, describe, expect, it, vi } from "vitest";
import { InputHandler, MouseMoveEvent } from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";

/**
 * A finished game's input handler has to let go of the window.
 *
 * Most of its listeners are on `window`, which outlives the match, and
 * nothing removed them: every game played left another handler subscribed,
 * still reacting to keys and pointers next to the handler for the game
 * actually being played, and holding that game's view, event bus and renderer
 * alive behind it.
 */
function setup() {
  const canvas = document.createElement("div");
  document.body.appendChild(canvas);
  const bus = new EventBus();
  const handler = new InputHandler(
    {
      inSpawnPhase: () => false,
      config: () => ({ worldMechanics: () => ({ threeDMode: false }) }),
    } as unknown as GameView,
    { ghostStructure: null } as UIState,
    canvas,
    bus,
  );
  const moves: MouseMoveEvent[] = [];
  bus.on(MouseMoveEvent, (event) => moves.push(event));
  handler.initialize();
  return { canvas, handler, moves };
}

function mouseMove(x: number, y: number): void {
  const event = new Event("mousemove", { bubbles: true });
  Object.assign(event, { clientX: x, clientY: y, movementX: 4, movementY: 0 });
  window.dispatchEvent(event);
}

describe("an input handler releases the window when the game ends", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("listens while the game is running", () => {
    const { moves } = setup();
    mouseMove(10, 20);
    expect(moves).toHaveLength(1);
  });

  it("stops listening once destroyed", () => {
    const { handler, moves } = setup();
    mouseMove(10, 20);
    handler.destroy();
    mouseMove(30, 40);
    expect(moves).toHaveLength(1);
  });

  it("leaves a live handler alone when an earlier one is destroyed", () => {
    // The case that made the leak visible: a second game starts while the
    // first game's handler is still subscribed. Tearing the old one down must
    // not take the new one's listeners with it.
    const first = setup();
    const second = setup();
    first.handler.destroy();

    mouseMove(50, 60);

    expect(first.moves).toHaveLength(0);
    expect(second.moves).toHaveLength(1);
  });

  it("stops its key-repeat timer", () => {
    vi.useFakeTimers();
    const { handler } = setup();
    const pending = vi.getTimerCount();
    expect(pending).toBeGreaterThan(0);
    handler.destroy();
    expect(vi.getTimerCount()).toBeLessThan(pending);
  });
});
