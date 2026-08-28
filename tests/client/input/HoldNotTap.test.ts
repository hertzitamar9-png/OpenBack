import { describe, expect, it } from "vitest";
import { MobileGestureArbiter } from "../../../src/client/input/MobileGestureArbiter";

/**
 * On the battlefield a tap is an attack, so a press that was meant as a hold
 * must never come back as one. The hold used to be recognised only by a
 * timer; when the main thread was busy the timer ran late and a long press
 * that had already been released was still counted as a tap.
 */
describe("mobile hold detection", () => {
  const arbiter = () => new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });

  it("calls a long press a hold even if the timer never ran", () => {
    const g = arbiter();
    g.pointerDown(1, 100, 100, 1000);
    // No holdDeadline() call: the timer was starved by a slow frame.
    expect(g.pointerUp(1, 100, 100, 1000 + 700).kind).toBe("hold");
  });

  it("still reports a quick press as a tap", () => {
    const g = arbiter();
    g.pointerDown(1, 100, 100, 1000);
    expect(g.pointerUp(1, 100, 100, 1000 + 120).kind).toBe("tap");
  });

  it("treats a press released exactly at the deadline as a hold", () => {
    const g = arbiter();
    g.pointerDown(1, 100, 100, 1000);
    expect(g.pointerUp(1, 100, 100, 1650).kind).toBe("hold");
  });

  it("does not resurrect a hold the timer already announced", () => {
    const g = arbiter();
    g.pointerDown(1, 100, 100, 1000);
    expect(g.holdDeadline(1650)?.kind).toBe("hold");
    expect(g.pointerUp(1, 100, 100, 1700).kind).toBe("consumed");
  });

  it("leaves a drag alone", () => {
    const g = arbiter();
    g.pointerDown(1, 100, 100, 1000);
    g.pointerMove(1, 140, 100, 1100);
    expect(g.pointerUp(1, 140, 100, 1900).kind).toBe("consumed");
  });
});
