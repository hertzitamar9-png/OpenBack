import { describe, expect, it } from "vitest";
import { shouldConfirmLeaving } from "../../src/client/openback/LeaveGuard";

describe("leaving a match asks first", () => {
  it("asks a living player", () => {
    expect(shouldConfirmLeaving({ isAlive: () => true })).toBe(true);
  });

  it("lets an eliminated player go straight out", () => {
    expect(shouldConfirmLeaving({ isAlive: () => false })).toBe(false);
  });

  it("asks while the local player is still unresolved", () => {
    // The lag case: the client has not resolved myPlayer() yet. Treating that
    // as "already dead" abandoned live matches on a single tap.
    expect(shouldConfirmLeaving(null)).toBe(true);
    expect(shouldConfirmLeaving(undefined)).toBe(true);
  });
});
