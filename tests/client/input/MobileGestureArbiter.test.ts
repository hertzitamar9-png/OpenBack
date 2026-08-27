import { describe, expect, test } from "vitest";
import { MobileGestureArbiter } from "../../../src/client/input/MobileGestureArbiter";

describe("MobileGestureArbiter", () => {
  test("a quick release is exactly one tap at its release point", () => {
    const gesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
    gesture.pointerDown(1, 100, 120, 0);

    expect(gesture.pointerUp(1, 103, 124, 120)).toEqual({
      kind: "tap",
      x: 103,
      y: 124,
    });
    expect(gesture.snapshot()).toEqual({
      mode: "idle",
      activePointers: 0,
      primaryPointerId: null,
    });
  });

  test("a completed hold consumes its release", () => {
    const gesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
    gesture.pointerDown(1, 100, 120, 0);

    expect(gesture.holdDeadline(649)).toBeNull();
    expect(gesture.holdDeadline(650)).toEqual({
      kind: "hold",
      x: 100,
      y: 120,
    });
    expect(gesture.pointerUp(1, 100, 120, 700)).toEqual({
      kind: "consumed",
    });
  });

  test("movement past slop becomes a drag and consumes release", () => {
    const gesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
    gesture.pointerDown(1, 100, 120, 0);

    expect(gesture.pointerMove(1, 110, 125, 50)).toBeNull();
    expect(gesture.pointerMove(1, 125, 120, 100)).toEqual({
      kind: "drag-start",
      x: 125,
      y: 120,
    });
    expect(gesture.pointerMove(1, 130, 125, 120)).toEqual({
      kind: "drag",
      x: 130,
      y: 125,
    });
    expect(gesture.pointerUp(1, 130, 125, 150)).toEqual({
      kind: "consumed",
    });
  });

  test("multitouch consumes every release", () => {
    const gesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
    gesture.pointerDown(2, 50, 50, 200);
    expect(gesture.pointerDown(3, 90, 50, 210)).toEqual({
      kind: "multitouch",
    });

    expect(gesture.pointerUp(2, 50, 50, 230)).toEqual({ kind: "consumed" });
    expect(gesture.pointerUp(3, 90, 50, 240)).toEqual({ kind: "consumed" });
    expect(gesture.snapshot().mode).toBe("idle");
  });

  test("explicit consumption and cancellation never emit a tap", () => {
    const gesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
    gesture.pointerDown(4, 10, 20, 0);
    gesture.consume();
    expect(gesture.pointerUp(4, 10, 20, 20)).toEqual({ kind: "consumed" });

    gesture.pointerDown(5, 30, 40, 100);
    expect(gesture.cancel()).toEqual({ kind: "cancelled" });
    expect(gesture.pointerUp(5, 30, 40, 120)).toEqual({ kind: "consumed" });
  });
});
