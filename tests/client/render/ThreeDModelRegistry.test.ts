import {
  THREE_D_MODELS,
  threeDModel,
} from "../../../src/client/render/gl/three-d/ThreeDModelRegistry";
import { rotateThreeDModelOffset } from "../../../src/client/render/gl/three-d/ThreeDUnitPass";
import { UnitType } from "../../../src/core/game/Game";

describe("3D model registry", () => {
  it("defines a renderable model for every game unit", () => {
    for (const type of Object.values(UnitType)) {
      const model = threeDModel(type);
      expect(model, `${type} is missing a 3D model`).toBeDefined();
      expect(model.footprint).toBeGreaterThan(0);
      expect(model.primitives.length).toBeGreaterThan(0);
      expect(model.lods).toHaveLength(2);
      expect(model.lods[0].maxScreenSize).toBeGreaterThan(
        model.lods[1].maxScreenSize,
      );
      expect(model.signature).toContain(type);
    }
    expect(Object.keys(THREE_D_MODELS)).toHaveLength(
      Object.values(UnitType).length,
    );
  });

  it("uses only finite transforms so new models cannot poison instance buffers", () => {
    for (const model of Object.values(THREE_D_MODELS)) {
      for (const primitive of model.primitives) {
        expect(
          [
            ...primitive.position,
            ...primitive.scale,
            ...(primitive.rotation ?? []),
          ].every(Number.isFinite),
        ).toBe(true);
      }
    }
  });

  it("uses silhouette geometry instead of generic boxes for major vehicles", () => {
    expect(threeDModel(UnitType.Tank).primitives[0].kind).toBe(
      "trackedChassis",
    );
    expect(threeDModel(UnitType.Plane).primitives[0].kind).toBe("hull");
    expect(threeDModel(UnitType.Warship).primitives[0].kind).toBe("hull");
  });

  it.each([UnitType.TransportShip, UnitType.Warship, UnitType.TradeShip])(
    "declares a bow-forward correction for %s",
    (type) => {
      expect(Math.abs(threeDModel(type).forwardYaw ?? 0)).toBeCloseTo(
        Math.PI / 2,
      );
    },
  );
});

describe("3D assembled model transforms", () => {
  it("rotates primitive offsets with the parent heading", () => {
    expect(rotateThreeDModelOffset(2, 0, Math.PI / 2)[0]).toBeCloseTo(0);
    expect(rotateThreeDModelOffset(2, 0, Math.PI / 2)[1]).toBeCloseTo(-2);
  });

  it("preserves the distance of every part from the model center", () => {
    const [x, z] = rotateThreeDModelOffset(1.4, -0.8, 1.237);
    expect(Math.hypot(x, z)).toBeCloseTo(Math.hypot(1.4, -0.8));
  });
});
