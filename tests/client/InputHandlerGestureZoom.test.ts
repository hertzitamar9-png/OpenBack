import {
  ContextMenuEvent,
  DragEvent,
  InputHandler,
  RotateCameraEvent,
  TouchEvent,
  ZOOM_DELTA_DIVISOR,
  ZoomEvent,
} from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";

/** jsdom has no GestureEvent, so fake one with a plain cancelable Event. */
function dispatchGesture(
  target: EventTarget,
  type: string,
  props: { scale?: number; clientX?: number; clientY?: number } = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { scale: 1, clientX: 0, clientY: 0, ...props });
  target.dispatchEvent(event);
  return event;
}

/** Same, for pointers — jsdom's PointerEvent drops pointerId/pointerType. */
function dispatchPointerDown(
  target: EventTarget,
  pointerId: number,
  props: { clientX?: number; clientY?: number } = {},
): void {
  const event = new Event("pointerdown", { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId,
    pointerType: "touch",
    button: 0,
    clientX: 0,
    clientY: 0,
    ...props,
  });
  target.dispatchEvent(event);
}

function dispatchPointerUp(target: EventTarget, pointerId: number): void {
  const event = new Event("pointerup", { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId, pointerType: "touch", button: 0 });
  target.dispatchEvent(event);
}

function dispatchPointerCancel(target: EventTarget, pointerId: number): void {
  const event = new Event("pointercancel", {
    bubbles: true,
    cancelable: true,
  });
  Object.assign(event, { pointerId, pointerType: "touch", button: 0 });
  target.dispatchEvent(event);
}

function setup(threeDMode = false) {
  const canvas = document.createElement("div");
  document.body.appendChild(canvas);

  const eventBus = new EventBus();
  const zooms: ZoomEvent[] = [];
  const touches: TouchEvent[] = [];
  const drags: DragEvent[] = [];
  const rotations: RotateCameraEvent[] = [];
  const contextMenus: ContextMenuEvent[] = [];
  eventBus.on(ZoomEvent, (e) => zooms.push(e));
  eventBus.on(TouchEvent, (e) => touches.push(e));
  eventBus.on(DragEvent, (e) => drags.push(e));
  eventBus.on(RotateCameraEvent, (e) => rotations.push(e));
  eventBus.on(ContextMenuEvent, (e) => contextMenus.push(e));

  const gameView = {
    inSpawnPhase: () => false,
    config: () => ({ worldMechanics: () => ({ threeDMode }) }),
  } as unknown as GameView;
  const handler = new InputHandler(
    gameView,
    { ghostStructure: null } as UIState,
    canvas,
    eventBus,
  );
  handler.initialize();

  return { canvas, handler, zooms, touches, drags, rotations, contextMenus };
}

function dispatchMousePointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  button: number,
  clientX: number,
  clientY: number,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: 99,
    pointerType: "mouse",
    button,
    buttons: type === "pointerup" ? 0 : 1 << button,
    clientX,
    clientY,
    x: clientX,
    y: clientY,
  });
  target.dispatchEvent(event);
  return event;
}

describe("InputHandler Safari trackpad pinch", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  afterEach(() => {
    ctx.handler.destroy();
    ctx.canvas.remove();
  });

  it("emits a negative delta when pinching out (zoom in)", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });

    expect(ctx.zooms).toHaveLength(1);
    expect(ctx.zooms[0].delta).toBeLessThan(0);
  });

  it("emits a positive delta when pinching in (zoom out)", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 0.8 });

    expect(ctx.zooms).toHaveLength(1);
    expect(ctx.zooms[0].delta).toBeGreaterThan(0);
  });

  it("converts the pinch ratio using the TransformHandler.onZoom convention", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.5 });

    // A 1.5x pinch must produce a zoomFactor of 1/1.5.
    const zoomFactor = 1 + ctx.zooms[0].delta / ZOOM_DELTA_DIVISOR;
    expect(zoomFactor).toBeCloseTo(1 / 1.5, 10);
  });

  it("treats scale as cumulative, not per-event", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.44 });

    // Both steps are the same 1.2x ratio, so both deltas must match.
    expect(ctx.zooms).toHaveLength(2);
    expect(ctx.zooms[1].delta).toBeCloseTo(ctx.zooms[0].delta, 10);
  });

  it("uses the gesture position as the zoom focal point", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", {
      scale: 1.2,
      clientX: 321,
      clientY: 123,
    });

    expect(ctx.zooms[0].x).toBe(321);
    expect(ctx.zooms[0].y).toBe(123);
  });

  it("ignores gesturechange with no gesture in progress", () => {
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });

    expect(ctx.zooms).toHaveLength(0);
  });

  it("does not carry scale across a completed gesture", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 4 });
    dispatchGesture(ctx.canvas, "gestureend", { scale: 4 });
    ctx.zooms.length = 0;

    // Without the reset this reads as a 1.2/4 ratio and zooms the wrong way.
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });

    expect(ctx.zooms).toHaveLength(1);
    expect(ctx.zooms[0].delta).toBeLessThan(0);
  });

  it("defers to the pointer pinch path when two pointers are down", () => {
    dispatchPointerDown(ctx.canvas, 1, { clientX: 100, clientY: 100 });
    dispatchPointerDown(ctx.canvas, 2, { clientX: 200, clientY: 200 });

    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });

    expect(ctx.zooms).toHaveLength(0);
  });

  it("advances the scale during a pointer pinch so a lift does not re-zoom", () => {
    dispatchPointerDown(ctx.canvas, 1, { clientX: 100, clientY: 100 });
    dispatchPointerDown(ctx.canvas, 2, { clientX: 200, clientY: 200 });

    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    // Deferred to the pointer path, but the scale must still advance to 2.
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 2 });
    expect(ctx.zooms).toHaveLength(0);

    dispatchPointerUp(ctx.canvas, 1);
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 2.2 });

    // Ratio must be 2.2/2, not 2.2/1 — the 1→2 zoom was already handled.
    expect(ctx.zooms).toHaveLength(1);
    const zoomFactor = 1 + ctx.zooms[0].delta / ZOOM_DELTA_DIVISOR;
    expect(zoomFactor).toBeCloseTo(1 / 1.1, 10);
  });

  it("still zooms for a trackpad pinch, which registers no pointers", () => {
    dispatchPointerDown(ctx.canvas, 1, { clientX: 100, clientY: 100 });

    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1.2 });

    expect(ctx.zooms).toHaveLength(1);
  });

  it("does not turn the final finger of a pinch into a country tap", () => {
    dispatchPointerDown(ctx.canvas, 1, { clientX: 100, clientY: 100 });
    dispatchPointerDown(ctx.canvas, 2, { clientX: 200, clientY: 200 });

    dispatchPointerUp(window, 1);
    dispatchPointerUp(window, 2);

    expect(ctx.touches).toHaveLength(0);
  });

  it("does not turn a canceled touch into a country tap", () => {
    dispatchPointerDown(ctx.canvas, 1, { clientX: 100, clientY: 100 });
    dispatchPointerCancel(window, 1);

    expect(ctx.touches).toHaveLength(0);
  });

  it("emits nothing when the pinch has not moved", () => {
    dispatchGesture(ctx.canvas, "gesturestart", { scale: 1 });
    dispatchGesture(ctx.canvas, "gesturechange", { scale: 1 });

    expect(ctx.zooms).toHaveLength(0);
  });

  it("calls preventDefault so the page does not zoom", () => {
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      const event = dispatchGesture(ctx.canvas, type, { scale: 1.2 });
      expect(event.defaultPrevented).toBe(true);
    }
  });
});

describe("InputHandler 3D desktop camera", () => {
  it("keeps a short right-click available for the gameplay menu", () => {
    const ctx = setup(true);
    dispatchMousePointer(ctx.canvas, "pointerdown", 2, 100, 90);
    dispatchMousePointer(window, "pointerup", 2, 100, 90);
    ctx.canvas.dispatchEvent(
      Object.assign(
        new Event("contextmenu", { bubbles: true, cancelable: true }),
        {
          clientX: 100,
          clientY: 90,
        },
      ),
    );

    expect(ctx.contextMenus).toHaveLength(1);
    expect(ctx.contextMenus[0]).toMatchObject({ x: 100, y: 90 });
    expect(ctx.rotations).toHaveLength(0);
    ctx.handler.destroy();
    ctx.canvas.remove();
  });

  it("orbits only while the right mouse button is held", () => {
    const ctx = setup(true);
    dispatchMousePointer(ctx.canvas, "pointerdown", 2, 100, 90);
    dispatchMousePointer(window, "pointermove", -1, 128, 104);
    dispatchMousePointer(window, "pointerup", 2, 128, 104);
    ctx.canvas.dispatchEvent(
      Object.assign(
        new Event("contextmenu", { bubbles: true, cancelable: true }),
        {
          clientX: 128,
          clientY: 104,
        },
      ),
    );

    expect(ctx.rotations).toHaveLength(1);
    expect(ctx.rotations[0]).toMatchObject({ deltaX: 28, deltaY: 14 });
    expect(ctx.drags).toHaveLength(0);
    expect(ctx.contextMenus).toHaveLength(0);
    ctx.handler.destroy();
    ctx.canvas.remove();
  });

  it("uses left-drag to move across the 3D tabletop", () => {
    const ctx = setup(true);
    dispatchMousePointer(ctx.canvas, "pointerdown", 0, 100, 90);
    dispatchMousePointer(window, "pointermove", -1, 128, 104);
    dispatchMousePointer(window, "pointerup", 0, 128, 104);

    expect(ctx.drags).toHaveLength(1);
    expect(ctx.drags[0]).toMatchObject({ deltaX: 28, deltaY: 14 });
    expect(ctx.rotations).toHaveLength(0);
    ctx.handler.destroy();
    ctx.canvas.remove();
  });
});
