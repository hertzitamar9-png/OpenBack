import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  ContextMenuEvent,
  DragEvent,
  InputHandler,
  MouseUpEvent,
  TouchEvent,
} from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";

function pointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  pointerId: number,
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    pointerId,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}

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
  const contexts: ContextMenuEvent[] = [];
  const touches: TouchEvent[] = [];
  const mouseUps: MouseUpEvent[] = [];
  const drags: DragEvent[] = [];
  bus.on(ContextMenuEvent, (event) => contexts.push(event));
  bus.on(TouchEvent, (event) => touches.push(event));
  bus.on(MouseUpEvent, (event) => mouseUps.push(event));
  bus.on(DragEvent, (event) => drags.push(event));
  handler.initialize();
  return { canvas, handler, contexts, touches, mouseUps, drags };
}

describe("InputHandler touch intent ownership", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  test("long press opens context once and release never attacks", async () => {
    const ctx = setup();
    pointer(ctx.canvas, "pointerdown", 1, 120, 90);
    await vi.advanceTimersByTimeAsync(650);
    pointer(window, "pointermove", 1, 122, 91);
    pointer(window, "pointerup", 1, 122, 91);

    expect(ctx.contexts).toEqual([expect.objectContaining({ x: 120, y: 90 })]);
    expect(ctx.touches).toHaveLength(0);
    expect(ctx.mouseUps).toHaveLength(0);
    ctx.handler.destroy();
  });

  test("tap emits one touch intent at the release coordinates", () => {
    const ctx = setup();
    pointer(ctx.canvas, "pointerdown", 2, 80, 70);
    pointer(window, "pointerup", 2, 84, 73);

    expect(ctx.touches).toEqual([expect.objectContaining({ x: 84, y: 73 })]);
    expect(ctx.contexts).toHaveLength(0);
    ctx.handler.destroy();
  });

  test("drag consumes release instead of becoming a tap", () => {
    const ctx = setup();
    pointer(ctx.canvas, "pointerdown", 3, 80, 70);
    pointer(window, "pointermove", 3, 120, 100);
    pointer(window, "pointerup", 3, 120, 100);

    expect(ctx.drags.length).toBeGreaterThan(0);
    expect(ctx.touches).toHaveLength(0);
    expect(ctx.contexts).toHaveLength(0);
    ctx.handler.destroy();
  });

  test("two-finger gesture consumes both releases", () => {
    const ctx = setup();
    pointer(ctx.canvas, "pointerdown", 4, 80, 70);
    pointer(ctx.canvas, "pointerdown", 5, 140, 70);
    pointer(window, "pointerup", 4, 80, 70);
    pointer(window, "pointerup", 5, 140, 70);

    expect(ctx.touches).toHaveLength(0);
    expect(ctx.contexts).toHaveLength(0);
    expect(ctx.mouseUps).toHaveLength(0);
    ctx.handler.destroy();
  });

  test("pointer cancellation consumes the sequence", () => {
    const ctx = setup();
    pointer(ctx.canvas, "pointerdown", 6, 80, 70);
    pointer(window, "pointercancel", 6, 80, 70);
    pointer(window, "pointerup", 6, 80, 70);

    expect(ctx.touches).toHaveLength(0);
    expect(ctx.contexts).toHaveLength(0);
    ctx.handler.destroy();
  });
});
