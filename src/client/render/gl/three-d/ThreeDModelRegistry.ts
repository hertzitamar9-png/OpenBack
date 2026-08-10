import { UnitType } from "../../../../core/game/Game";

export type ThreeDPrimitiveKind =
  | "box"
  | "beveledBox"
  | "cylinder"
  | "cone"
  | "sphere"
  | "wing"
  | "wedge"
  | "hull"
  | "trackedChassis"
  | "roof"
  | "barrel";
export type ThreeDAnimation =
  | "none"
  | "rotate"
  | "bank"
  | "pulse"
  | "wheel"
  | "hover";

export interface ThreeDPrimitive {
  kind: ThreeDPrimitiveKind;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  animation?: ThreeDAnimation;
  material: "owner" | "dark" | "metal" | "glass" | "emissive" | "ground";
}

export interface ThreeDModelDefinition {
  footprint: number;
  altitude?: number;
  /** Corrects the source asset's forward axis before gameplay heading. */
  forwardYaw?: number;
  animation?: ThreeDAnimation;
  primitives: readonly ThreeDPrimitive[];
  lods: readonly {
    maxScreenSize: number;
    primitiveLimit: number;
  }[];
  signature: string;
}

const p = (
  kind: ThreeDPrimitiveKind,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  material: ThreeDPrimitive["material"],
  rotation?: readonly [number, number, number],
  animation?: ThreeDAnimation,
): ThreeDPrimitive => ({
  kind,
  position,
  scale,
  material,
  rotation,
  animation,
});

/**
 * Complete model catalog. Adding a new unit is intentionally a data-only task:
 * register its primitive composition here and the shared instanced renderer,
 * shadows, owner tint, selection, fog, and disaster lighting apply automatically.
 */
const RAW_MODELS: Readonly<
  Record<UnitType, Omit<ThreeDModelDefinition, "lods" | "signature">>
> = {
  [UnitType.City]: {
    footprint: 2.8,
    primitives: [
      p("beveledBox", [-0.65, 0.65, 0], [0.8, 1.3, 0.9], "owner"),
      p("beveledBox", [0.35, 0.95, 0.2], [0.7, 1.9, 0.7], "owner"),
      p("box", [0.75, 0.45, -0.5], [0.55, 0.9, 0.55], "glass"),
      p("roof", [-0.65, 1.42, 0], [0.9, 0.35, 1.0], "dark"),
    ],
  },
  [UnitType.Factory]: {
    footprint: 3.2,
    primitives: [
      p("box", [0, 0.45, 0], [2.3, 0.9, 1.55], "owner"),
      p("roof", [0, 1.02, 0], [2.35, 0.45, 1.6], "dark"),
      p("box", [-0.65, 1.25, 0.35], [0.38, 1.8, 0.38], "dark"),
      p("box", [0.55, 1.05, 0.35], [0.32, 1.45, 0.32], "dark"),
    ],
  },
  [UnitType.Port]: {
    footprint: 3.5,
    primitives: [
      p("box", [0, 0.18, 0], [3.0, 0.35, 1.0], "ground"),
      p("box", [-0.65, 0.65, 0], [0.18, 1.3, 0.18], "metal"),
      p("box", [-0.05, 1.2, 0], [1.25, 0.16, 0.16], "metal"),
      p("box", [0.5, 0.75, 0], [0.12, 0.9, 0.12], "metal"),
    ],
  },
  [UnitType.DefensePost]: {
    footprint: 2.3,
    primitives: [
      p("beveledBox", [0, 0.45, 0], [1.35, 0.9, 1.35], "owner"),
      p("cylinder", [0, 1.0, 0], [0.7, 0.4, 0.7], "dark", undefined, "rotate"),
      p(
        "barrel",
        [0.75, 1.1, 0],
        [1.25, 0.16, 0.18],
        "metal",
        undefined,
        "rotate",
      ),
    ],
  },
  [UnitType.MissileSilo]: {
    footprint: 2.5,
    primitives: [
      p("cylinder", [0, 0.32, 0], [1.5, 0.65, 1.5], "owner"),
      p("cylinder", [0, 1.15, 0], [0.5, 1.8, 0.5], "metal"),
      p("cone", [0, 2.2, 0], [0.62, 0.8, 0.62], "emissive"),
    ],
  },
  [UnitType.SAMLauncher]: {
    footprint: 2.7,
    primitives: [
      p("trackedChassis", [0, 0.3, 0], [2.1, 0.6, 1.5], "owner"),
      p(
        "box",
        [0, 1.0, 0],
        [1.35, 0.28, 0.85],
        "dark",
        [0, 0, -0.35],
        "rotate",
      ),
      p(
        "cylinder",
        [-0.35, 1.45, 0],
        [0.18, 1.3, 0.18],
        "emissive",
        [0, 0, -0.35],
        "rotate",
      ),
      p(
        "cylinder",
        [0.35, 1.45, 0],
        [0.18, 1.3, 0.18],
        "emissive",
        [0, 0, -0.35],
        "rotate",
      ),
    ],
  },
  [UnitType.Runway]: {
    footprint: 5.2,
    primitives: [
      p("beveledBox", [0, 0.08, 0], [5.0, 0.16, 1.35], "ground"),
      p("box", [0, 0.18, 0], [3.6, 0.04, 0.12], "emissive"),
    ],
  },
  [UnitType.MANPAD]: {
    footprint: 1.7,
    primitives: [
      p("cylinder", [0, 0.55, 0], [0.18, 1.1, 0.18], "owner"),
      p(
        "cylinder",
        [0.25, 1.1, 0],
        [0.2, 1.45, 0.2],
        "metal",
        [0, 0, -0.7],
        "rotate",
      ),
      p(
        "cone",
        [0.78, 1.55, 0],
        [0.28, 0.55, 0.28],
        "emissive",
        [0, 0, -0.7],
        "rotate",
      ),
    ],
  },
  [UnitType.MilitaryBase]: {
    footprint: 3.7,
    primitives: [
      p("box", [0, 0.12, 0], [3.5, 0.22, 2.6], "ground"),
      p("box", [-0.65, 0.65, 0], [1.3, 1.1, 1.7], "owner"),
      p("roof", [-0.65, 1.35, 0], [1.4, 0.42, 1.8], "dark"),
      p("box", [0.75, 0.45, 0.45], [1.15, 0.7, 0.8], "owner"),
      p("cylinder", [0.8, 1.35, -0.4], [0.18, 1.5, 0.18], "metal"),
    ],
  },
  [UnitType.TankMine]: {
    footprint: 1.2,
    primitives: [
      p("cylinder", [0, 0.12, 0], [0.95, 0.24, 0.95], "dark"),
      p("cone", [0, 0.32, 0], [0.34, 0.35, 0.34], "emissive"),
    ],
  },
  [UnitType.Tank]: {
    footprint: 2.6,
    primitives: [
      p("trackedChassis", [0, 0.38, 0], [2.4, 0.65, 1.45], "owner"),
      p(
        "beveledBox",
        [0, 0.75, 0],
        [1.25, 0.52, 1.05],
        "dark",
        undefined,
        "rotate",
      ),
      p(
        "barrel",
        [1.15, 0.92, 0],
        [0.15, 1.65, 0.15],
        "metal",
        [0, 0, -Math.PI / 2],
        "rotate",
      ),
      p(
        "cylinder",
        [-0.75, 0.25, -0.72],
        [0.38, 1.6, 0.38],
        "dark",
        [Math.PI / 2, 0, 0],
        "wheel",
      ),
      p(
        "cylinder",
        [0.75, 0.25, -0.72],
        [0.38, 1.6, 0.38],
        "dark",
        [Math.PI / 2, 0, 0],
        "wheel",
      ),
    ],
  },
  [UnitType.Plane]: {
    footprint: 3.0,
    altitude: 2.2,
    animation: "bank",
    primitives: [
      p("hull", [0, 0.55, 0], [3.1, 0.42, 0.55], "owner", [0, 0, 0]),
      p("cone", [1.65, 0.55, 0], [0.48, 0.8, 0.48], "metal", [
        0,
        0,
        -Math.PI / 2,
      ]),
      p("wing", [0, 0.55, 0], [1.35, 0.12, 3.0], "owner"),
      p("wing", [-1.1, 0.8, 0], [0.75, 0.12, 1.35], "dark"),
    ],
  },
  [UnitType.TransportShip]: {
    footprint: 2.7,
    forwardYaw: Math.PI / 2,
    animation: "hover",
    primitives: [
      p("hull", [0, 0.25, 0], [2.7, 0.45, 0.9], "owner"),
      p("cone", [1.55, 0.25, 0], [0.65, 0.45, 0.55], "owner", [
        0,
        0,
        -Math.PI / 2,
      ]),
      p("box", [-0.25, 0.7, 0], [0.75, 0.6, 0.65], "glass"),
    ],
  },
  [UnitType.Warship]: {
    footprint: 3.2,
    forwardYaw: Math.PI / 2,
    animation: "hover",
    primitives: [
      p("hull", [0, 0.3, 0], [3.1, 0.5, 1.05], "owner"),
      p("cone", [1.75, 0.3, 0], [0.7, 0.5, 0.62], "owner", [
        0,
        0,
        -Math.PI / 2,
      ]),
      p("box", [-0.35, 0.78, 0], [1.0, 0.7, 0.72], "dark"),
      p("box", [0.85, 0.78, 0], [1.1, 0.13, 0.14], "metal"),
    ],
  },
  [UnitType.TradeShip]: {
    footprint: 2.7,
    forwardYaw: Math.PI / 2,
    animation: "hover",
    primitives: [
      p("hull", [0, 0.25, 0], [2.65, 0.45, 0.92], "owner"),
      p("box", [-0.35, 0.72, 0], [0.8, 0.65, 0.65], "glass"),
      p("box", [0.55, 0.55, 0], [0.8, 0.35, 0.62], "emissive"),
    ],
  },
  [UnitType.Train]: {
    footprint: 2.2,
    animation: "hover",
    primitives: [
      p("beveledBox", [0, 0.4, 0], [2.1, 0.75, 0.85], "owner"),
      p("cone", [1.25, 0.48, 0], [0.55, 0.65, 0.55], "metal", [
        0,
        0,
        -Math.PI / 2,
      ]),
      p("cylinder", [-0.65, 0.95, 0], [0.18, 0.8, 0.18], "dark"),
    ],
  },
  [UnitType.AtomBomb]: {
    footprint: 1.2,
    altitude: 3,
    animation: "pulse",
    primitives: [
      p("cylinder", [0, 0.8, 0], [0.28, 1.5, 0.28], "metal"),
      p("cone", [0, 1.75, 0], [0.42, 0.55, 0.42], "emissive"),
    ],
  },
  [UnitType.HydrogenBomb]: {
    footprint: 1.5,
    altitude: 3,
    animation: "pulse",
    primitives: [
      p("cylinder", [0, 0.95, 0], [0.38, 1.85, 0.38], "dark"),
      p("cone", [0, 2.1, 0], [0.55, 0.72, 0.55], "emissive"),
    ],
  },
  [UnitType.MIRV]: {
    footprint: 1.6,
    altitude: 3,
    animation: "pulse",
    primitives: [
      p("cylinder", [0, 1.0, 0], [0.42, 2.0, 0.42], "owner"),
      p("cone", [0, 2.3, 0], [0.65, 0.9, 0.65], "emissive"),
    ],
  },
  [UnitType.MIRVWarhead]: {
    footprint: 0.9,
    altitude: 3,
    animation: "pulse",
    primitives: [p("cone", [0, 0.6, 0], [0.4, 1.2, 0.4], "emissive")],
  },
  [UnitType.SAMMissile]: {
    footprint: 0.7,
    altitude: 2.5,
    animation: "pulse",
    primitives: [
      p("cylinder", [0, 0.6, 0], [0.18, 1.1, 0.18], "metal"),
      p("cone", [0, 1.35, 0], [0.28, 0.45, 0.28], "emissive"),
    ],
  },
  [UnitType.Shell]: {
    footprint: 0.45,
    altitude: 1.6,
    animation: "pulse",
    primitives: [p("sphere", [0, 0.25, 0], [0.35, 0.35, 0.35], "emissive")],
  },
};

export const THREE_D_MODELS: Readonly<Record<UnitType, ThreeDModelDefinition>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(RAW_MODELS).map(([type, model]) => [
        type,
        {
          ...model,
          lods: [
            {
              maxScreenSize: Number.POSITIVE_INFINITY,
              primitiveLimit: model.primitives.length,
            },
            {
              maxScreenSize: 4,
              primitiveLimit: Math.min(3, model.primitives.length),
            },
          ],
          signature: `${type}:${model.primitives.map((part) => part.kind).join("+")}`,
        },
      ]),
    ) as unknown as Record<UnitType, ThreeDModelDefinition>,
  );

export function threeDModel(type: UnitType): ThreeDModelDefinition {
  return THREE_D_MODELS[type];
}
