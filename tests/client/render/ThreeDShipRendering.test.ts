import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { THREE_D_HULL_DRAFT } from "../../../src/client/render/gl/three-d/ThreeDWaterSurface";
import {
  HeadingTracker,
  MAX_TURN_PER_TICK,
} from "../../../src/client/render/gl/UnitHeadingTracker";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const unitPass3D = read("src/client/render/gl/three-d/ThreeDUnitPass.ts");
const unitPass2D = read("src/client/render/gl/passes/UnitPass.ts");

// The transport's hull primitive, straight out of the model registry: centred
// at y=0.25 with a height of 0.45, and the model's origin is its keel rather
// than its middle.
const HULL_CENTRE = 0.25;
const HULL_HEIGHT = 0.45;

describe("ships on the water", () => {
  it("keeps most of the hull above the waterline", () => {
    const bottom = HULL_CENTRE - HULL_HEIGHT / 2 - THREE_D_HULL_DRAFT;
    const top = HULL_CENTRE + HULL_HEIGHT / 2 - THREE_D_HULL_DRAFT;
    const submerged = Math.max(0, Math.min(HULL_HEIGHT, -bottom));

    // The keel sits under the surface -- it displaces water rather than
    // resting on it like a decal...
    expect(bottom).toBeLessThan(0);
    // ...but the hull is mostly dry. At the 0.35 this started as, 78% of the
    // hull was under water, leaving a sliver and the cabin showing, which is
    // what "the ship is drowning" looked like.
    expect(submerged / HULL_HEIGHT).toBeLessThan(0.35);
    expect(top).toBeGreaterThan(0.25);

    // Vessels also bob +/-0.11 from their hover animation; the trough of that
    // must not put the deck under.
    expect(top - 0.11).toBeGreaterThan(0);
  });

  it("reads its height from the shared sea, not a fixed plane", () => {
    expect(unitPass3D).toContain(
      "waterSurfaceHeight(iWorld.xz,waterPhase(uTime)",
    );
    expect(unitPass3D).not.toContain("surface==1?-0.08");
  });
});

describe("ship heading", () => {
  // Both renderers derived a heading from the last step and both fell back to
  // zero -- due north -- on a tick without one. Ships move a tile at a time,
  // so they snapped upright between steps. Fixing only the 2D pass left 3D
  // models, which is what ships actually are, still doing it.
  it("is tracked by both renderers through the one shared tracker", () => {
    expect(unitPass3D).toContain("HeadingTracker");
    expect(unitPass3D).toContain("this.headingTracker.track(");
    expect(unitPass2D).toContain("HeadingTracker");

    // The 3D pass must not fall back to north when a unit has not moved.
    expect(unitPass3D).not.toContain(
      "let heading = unit.trajectoryAngle ?? 0;",
    );
    expect(unitPass3D).toContain(
      "let headingTarget: number | null = unit.trajectoryAngle ?? null;",
    );
  });

  it("holds the last heading when a unit does not move", () => {
    const tracker = new HeadingTracker();
    tracker.beginFrame();
    // Turn far enough that it takes several ticks, so the held value is not
    // just the target already reached.
    tracker.track(1, Math.PI, true);
    tracker.beginFrame();
    const moving = tracker.track(1, Math.PI, true);
    tracker.beginFrame();
    const idle = tracker.track(1, null, true);

    expect(idle).toBe(moving);
    expect(idle).not.toBe(0);
  });

  it("turns gradually toward a new course", () => {
    const tracker = new HeadingTracker();
    tracker.beginFrame();
    tracker.track(7, 0, true);
    tracker.beginFrame();
    const next = tracker.track(7, Math.PI / 2, true);

    expect(next).toBeCloseTo(MAX_TURN_PER_TICK);
    expect(next).toBeLessThan(Math.PI / 2);
  });

  it("forgets units that are gone", () => {
    const tracker = new HeadingTracker();
    tracker.beginFrame();
    tracker.track(3, Math.PI, true);
    tracker.endFrame();

    // Next frame the unit is absent, so its heading must not survive for a
    // recycled id to inherit.
    tracker.beginFrame();
    tracker.endFrame();
    tracker.beginFrame();
    expect(tracker.track(3, null, true)).toBe(0);
  });
});

describe("ship wake", () => {
  it("trails a vessel that is under way, and only then", () => {
    expect(unitPass3D).toContain(
      "surface === SURFACE.water && headingTarget !== null",
    );
    // It rides the sea like the hull does rather than the terrain.
    expect(unitPass3D).toContain("ANIMATION.none + surface * 10");
  });
});

// The generated models for ships and trains are assembled from a few boxes and
// cones, which at the size they are actually seen reads as a pile of blocks --
// train carriages especially, which sit as separate lumps with gaps between
// them because each is placed independently rather than coupled to the next.
// The flat sprite is real artwork and is drawn screen-facing in 3D, so it
// shows its face from every angle.
describe("units that keep their flat artwork in 3D", () => {
  it("lists the ships, trains and warheads", () => {
    for (const type of [
      "TransportShip",
      "TradeShip",
      "Warship",
      "Train",
      // A warhead's built model is a 0.28-wide cylinder against a ship's 2.7
      // footprint. Loading it hid the sprite and put almost nothing in its
      // place, so an incoming strike had no readable marker at all.
      "AtomBomb",
      "HydrogenBomb",
      "MIRV",
      "MIRVWarhead",
    ]) {
      expect(unitPass3D).toContain(`UnitType.${type},`);
    }
    expect(unitPass3D).toContain("export const SPRITE_IN_THREE_D");
  });

  it("keeps them out of the ready-model set", () => {
    // That set becomes the mask telling the sprite shader to stand down, so a
    // type left in it would have its sprite hidden and nothing drawn at all.
    expect(unitPass3D).toContain("if (SPRITE_IN_THREE_D.has(type)) return;");
  });

  it("still gives them a shadow and a wake", () => {
    // Only the built hull is skipped. Dropping out of the loop earlier would
    // have taken the ground shadow and the vessel wake with it.
    const skip = unitPass3D.indexOf(
      "if (SPRITE_IN_THREE_D.has(unit.unitType as UnitType)) continue;",
    );
    const wake = unitPass3D.indexOf("// Wake: a foam patch trailing a vessel");
    const hull = unitPass3D.indexOf(
      "const key = threeDModelBatchKey(unit.unitType as UnitType);",
    );
    expect(skip).toBeGreaterThan(wake);
    expect(skip).toBeLessThan(hull);
  });
});

// Sprites in 3D are anchored to terrain height. On ocean that is just below
// zero, while the night tide and its crests rise several units over it -- so a
// ship drawn as a sprite went under exactly when the water came up. Measured
// against the real wave formula at a night sea state: the water reached 8.36
// units above the sprite and covered it in 60% of samples.
describe("sprite vessels ride the sea", () => {
  const unitVert = read("src/client/render/gl/shaders/unit/unit.vert.glsl");
  const unitPassSrc = read("src/client/render/gl/passes/UnitPass.ts");

  it("anchors ships to the water surface, not the seabed", () => {
    expect(unitVert).toContain(
      "waterSurfaceHeight(center, waterPhase(uWaterTime), uTideHeight)",
    );
    expect(unitVert).toContain("mix(groundHeight, seaHeight, isShip)");
    // Everything that is not a vessel still stands on the ground.
    expect(unitVert).toContain(
      "float groundHeight = smoothTerrainHeight(center);",
    );
  });

  it("knows which sprites are vessels", () => {
    for (const col of ["TRANSPORT_COL", "TRADE_SHIP_COL", "WARSHIP_COL"]) {
      expect(unitVert).toContain(col);
      expect(unitPassSrc).toContain(col);
    }
  });

  it("builds its sea from the one shared definition", () => {
    // Sharing the source is what keeps a hull from drifting out of the water
    // the mesh actually draws.
    expect(unitPassSrc).toContain("THREE_D_WATER_SURFACE_GLSL");
    expect(unitVert).toContain("//__WATER_SURFACE__");
    expect(unitPassSrc).toContain("setWorldCycle(");
  });
});
