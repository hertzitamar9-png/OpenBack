import { describe, expect, it } from "vitest";
import {
  TUTORIAL_STEPS,
  TutorialProgress,
} from "../../../src/client/tutorial/TutorialScript";
import { UnitType } from "../../../src/core/game/Game";

/**
 * The tutorial is a real match, and every step is judged on it.
 *
 * Nothing advances on a timer: a step is done when the player has actually
 * built the thing or taken the ground. That makes the script checkable without
 * a game, a renderer or a DOM, which is what these tests do.
 */
const progress = (over: Partial<TutorialProgress> = {}): TutorialProgress => ({
  spawning: false,
  tiles: 100,
  tilesAtStepStart: 100,
  gold: 0n,
  outgoingAttacks: 0,
  alliances: 0,
  everOwned: new Set<UnitType>(),
  ...over,
});

const step = (id: string) => {
  const found = TUTORIAL_STEPS.find((s) => s.id === id);
  if (!found) throw new Error(`no step "${id}"`);
  return found;
};

describe("tutorial script", () => {
  it("is long enough to be worth playing", () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(12);
  });

  it("gives every step a heading and an explanation", () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.title.length).toBeGreaterThan(4);
      // The body says why it matters, not just what to press.
      expect(s.body.length).toBeGreaterThan(60);
    }
  });

  it("uses each id once, so progress cannot be ambiguous", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("waits for a spawn to be placed before anything else", () => {
    expect(TUTORIAL_STEPS[0].id).toBe("spawn");
    expect(step("spawn").done(progress({ spawning: true }))).toBe(false);
    expect(step("spawn").done(progress({ spawning: false }))).toBe(true);
  });

  it("counts ground taken since the step opened, not since the match did", () => {
    const expand = step("expand");
    // Already holding a lot, but none of it gained during this step.
    expect(expand.done(progress({ tiles: 900, tilesAtStepStart: 900 }))).toBe(
      false,
    );
    expect(expand.done(progress({ tiles: 961, tilesAtStepStart: 900 }))).toBe(
      true,
    );
  });

  it("completes a build step from a unit ever owned, not one still standing", () => {
    // A transport unloads and a bomb detonates. Asking whether the player has
    // one right now would be true only for the instant between launch and
    // impact, and the step would never complete.
    const nuke = step("nuke");
    expect(nuke.done(progress())).toBe(false);
    expect(
      nuke.done(progress({ everOwned: new Set([UnitType.AtomBomb]) })),
    ).toBe(true);
  });

  it("asks for an attack that is actually running", () => {
    expect(step("attack").done(progress({ outgoingAttacks: 0 }))).toBe(false);
    expect(step("attack").done(progress({ outgoingAttacks: 1 }))).toBe(true);
  });

  it("teaches gold before it asks the player to spend it", () => {
    const order = TUTORIAL_STEPS.map((s) => s.id);
    // Cities and factories pay for the rest; the sea needs a port first.
    expect(order.indexOf("city")).toBeLessThan(order.indexOf("silo"));
    expect(order.indexOf("factory")).toBeLessThan(order.indexOf("silo"));
    expect(order.indexOf("port")).toBeLessThan(order.indexOf("boat"));
    expect(order.indexOf("silo")).toBeLessThan(order.indexOf("nuke"));
  });

  it("points at a control whenever the step is about pressing one", () => {
    for (const id of ["city", "factory", "port", "silo", "nuke", "warship"]) {
      const target = step(id).target;
      expect(target, `${id} should point somewhere`).toBeDefined();
      expect(target!.selector).toContain("data-build-unit");
    }
  });

  it("does not point anywhere for steps done on the map itself", () => {
    // Spawning, expanding and attacking happen by tapping the world, so a
    // pointer at a button would be aiming at the wrong thing entirely.
    for (const id of ["spawn", "expand", "attack", "boat", "grow"]) {
      expect(step(id).target, `${id} should not point at a button`).toBe(
        undefined,
      );
    }
  });

  it("names build targets that exist in the game", () => {
    const units = new Set<string>(Object.values(UnitType));
    for (const s of TUTORIAL_STEPS) {
      const selector = s.target?.selector ?? "";
      const match = selector.match(/data-build-unit="([^"]+)"/);
      if (match) expect(units.has(match[1])).toBe(true);
    }
  });
});
