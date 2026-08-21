import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DragEvent,
  InputHandler,
  MouseMoveEvent,
  MouseUpEvent,
  RotateCameraEvent,
  TouchEvent,
  ZoomEvent,
} from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";
import { UnitType } from "../../src/core/game/Game";

function pointer(
  target: EventTarget,
  type: "pointerdown" | "pointermove" | "pointerup",
  pointerId: number,
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    pointerId,
    pointerType: "touch",
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}

function setup(ghost: UIState["ghostStructure"] = null, threeD = false) {
  const canvas = document.createElement("div");
  document.body.appendChild(canvas);
  const bus = new EventBus();
  const uiState = { ghostStructure: ghost } as UIState;
  const game = {
    inSpawnPhase: () => false,
    config: () => ({ worldMechanics: () => ({ threeDMode: threeD }) }),
  } as unknown as GameView;
  const handler = new InputHandler(game, uiState, canvas, bus);
  const moves: MouseMoveEvent[] = [];
  const drags: DragEvent[] = [];
  const placements: MouseUpEvent[] = [];
  const touches: TouchEvent[] = [];
  const rotations: RotateCameraEvent[] = [];
  const zooms: ZoomEvent[] = [];
  bus.on(MouseMoveEvent, (event) => moves.push(event));
  bus.on(DragEvent, (event) => drags.push(event));
  bus.on(MouseUpEvent, (event) => placements.push(event));
  bus.on(TouchEvent, (event) => touches.push(event));
  bus.on(RotateCameraEvent, (event) => rotations.push(event));
  bus.on(ZoomEvent, (event) => zooms.push(event));
  handler.initialize();
  return {
    canvas,
    handler,
    uiState,
    moves,
    drags,
    placements,
    touches,
    rotations,
    zooms,
  };
}

describe("InputHandler mobile placement gestures", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("moves a selected build preview with the finger without panning", () => {
    const ctx = setup(UnitType.City);
    pointer(ctx.canvas, "pointerdown", 1, 100, 100);
    pointer(window, "pointermove", 1, 140, 180);

    expect(ctx.moves.at(-1)).toMatchObject({ x: 140, y: 180 });
    expect(ctx.drags).toHaveLength(0);
    ctx.handler.destroy();
  });

  it("accepts ordinary finger jitter as one placement tap", () => {
    const ctx = setup(UnitType.City);
    pointer(ctx.canvas, "pointerdown", 2, 100, 100);
    pointer(window, "pointermove", 2, 112, 108);
    pointer(window, "pointerup", 2, 112, 108);

    expect(ctx.placements).toEqual([
      expect.objectContaining({ x: 112, y: 108, isBuildPlacement: true }),
    ]);
    ctx.handler.destroy();
  });

  it("cancels a selected nuclear weapon after a stationary hold", async () => {
    const ctx = setup(UnitType.HydrogenBomb);
    pointer(ctx.canvas, "pointerdown", 3, 100, 100);
    await vi.advanceTimersByTimeAsync(800);
    pointer(window, "pointerup", 3, 100, 100);

    expect(ctx.uiState.ghostStructure).toBeNull();
    expect(ctx.placements).toHaveLength(0);
    ctx.handler.destroy();
  });

  it("keeps a dragged nuclear preview active and cancels its hold timer", async () => {
    const ctx = setup(UnitType.AtomBomb);
    pointer(ctx.canvas, "pointerdown", 4, 100, 100);
    pointer(window, "pointermove", 4, 130, 130);
    await vi.advanceTimersByTimeAsync(900);

    expect(ctx.uiState.ghostStructure).toBe(UnitType.AtomBomb);
    expect(ctx.moves.at(-1)).toMatchObject({ x: 130, y: 130 });
    ctx.handler.destroy();
  });

  it("rotates and zooms 3D with the same two-finger gesture", () => {
    const ctx = setup(null, true);
    pointer(ctx.canvas, "pointerdown", 5, 100, 100);
    pointer(ctx.canvas, "pointerdown", 6, 200, 100);
    pointer(window, "pointermove", 5, 110, 110);

    expect(ctx.rotations).toHaveLength(1);
    expect(ctx.rotations[0]).toMatchObject({ deltaX: 5, deltaY: 5 });
    expect(ctx.zooms).toHaveLength(1);
    ctx.handler.destroy();
  });

  it("consumes the remaining finger after a two-finger gesture", () => {
    const ctx = setup(null, true);
    pointer(ctx.canvas, "pointerdown", 7, 100, 100);
    pointer(ctx.canvas, "pointerdown", 8, 200, 100);
    pointer(window, "pointerup", 7, 100, 100);
    pointer(window, "pointermove", 8, 230, 120);
    pointer(window, "pointerup", 8, 230, 120);

    expect(ctx.drags).toHaveLength(0);
    expect(ctx.touches).toHaveLength(0);
    expect(ctx.placements).toHaveLength(0);
    ctx.handler.destroy();
  });
});
