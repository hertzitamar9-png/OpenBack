import {
  ALL_UNIT_TYPES,
  UT_ATOM_BOMB,
  UT_CITY,
  UT_DEFENSE_POST,
  UT_FACTORY,
  UT_HYDROGEN_BOMB,
  UT_MANPAD,
  UT_MILITARY_BASE,
  UT_MIRV,
  UT_MIRV_WARHEAD,
  UT_MISSILE_SILO,
  UT_PLANE,
  UT_PORT,
  UT_RUNWAY,
  UT_SAM_LAUNCHER,
  UT_SAM_MISSILE,
  UT_SHELL,
  UT_TANK,
  UT_TANK_MINE,
  UT_TRADE_SHIP,
  UT_TRAIN,
  UT_TRANSPORT,
  UT_WARSHIP,
} from "../../types";

export type WarTableOwnerMask = "none" | "panel" | "body" | "trim";
export type WarTableBuildStyle = "assemble" | "unfold" | "none";
export type WarTableReloadStyle = "pulse" | "turret" | "silo" | "none";
export type WarTableDestroyStyle = "collapse" | "break" | "burn" | "burst";

export interface WarTableMiniature {
  id: string;
  family: "structure" | "ship" | "aircraft" | "armor" | "train" | "missile";
  atlasColumn: number;
  ownerMask: WarTableOwnerMask;
  scale: number;
  groundOffset: number;
  headingAware: boolean;
  buildStyle: WarTableBuildStyle;
  reloadStyle: WarTableReloadStyle;
  destroyStyle: WarTableDestroyStyle;
}

export const WAR_TABLE_STRUCTURE_ORDER = [
  UT_CITY,
  UT_PORT,
  UT_FACTORY,
  UT_DEFENSE_POST,
  UT_SAM_LAUNCHER,
  UT_MISSILE_SILO,
  UT_RUNWAY,
  UT_MANPAD,
  UT_MILITARY_BASE,
  UT_TANK_MINE,
] as const;

export const WAR_TABLE_MOBILE_ORDER = ALL_UNIT_TYPES.filter(
  (type) => !WAR_TABLE_STRUCTURE_ORDER.includes(type as never),
);

const entries = new Map<string, WarTableMiniature>();

function add(
  type: string,
  data: Omit<WarTableMiniature, "id" | "atlasColumn">,
  order: readonly string[],
): void {
  entries.set(type, { id: type, atlasColumn: order.indexOf(type), ...data });
}

const structure = (
  type: string,
  reloadStyle: WarTableReloadStyle = "none",
  scale = 1,
) =>
  add(
    type,
    {
      family: "structure",
      ownerMask: "panel",
      scale,
      groundOffset: 0,
      headingAware: false,
      buildStyle: type === UT_RUNWAY ? "unfold" : "assemble",
      reloadStyle,
      destroyStyle: "collapse",
    },
    WAR_TABLE_STRUCTURE_ORDER,
  );

structure(UT_CITY);
structure(UT_PORT);
structure(UT_FACTORY);
structure(UT_DEFENSE_POST, "pulse");
structure(UT_SAM_LAUNCHER, "turret");
structure(UT_MISSILE_SILO, "silo");
structure(UT_RUNWAY, "pulse", 1.2);
structure(UT_MANPAD, "turret", 0.9);
structure(UT_MILITARY_BASE, "pulse", 1.1);
structure(UT_TANK_MINE, "none", 0.75);

const mobile = (
  type: string,
  family: WarTableMiniature["family"],
  options: Partial<
    Omit<WarTableMiniature, "id" | "family" | "atlasColumn">
  > = {},
) =>
  add(
    type,
    {
      family,
      ownerMask: "body",
      scale: 1,
      groundOffset: family === "aircraft" ? 0.18 : 0,
      headingAware: true,
      buildStyle: "none",
      reloadStyle: "none",
      destroyStyle: family === "missile" ? "burst" : "break",
      ...options,
    },
    WAR_TABLE_MOBILE_ORDER,
  );

mobile(UT_TRANSPORT, "ship", { destroyStyle: "burn" });
mobile(UT_TRADE_SHIP, "ship", { destroyStyle: "burn" });
mobile(UT_WARSHIP, "ship", {
  reloadStyle: "turret",
  destroyStyle: "burn",
  scale: 1.15,
});
mobile(UT_ATOM_BOMB, "missile", { ownerMask: "trim", scale: 0.8 });
mobile(UT_HYDROGEN_BOMB, "missile", { ownerMask: "trim", scale: 0.9 });
mobile(UT_MIRV, "missile", { ownerMask: "trim", scale: 1.05 });
mobile(UT_SAM_MISSILE, "missile", { ownerMask: "trim", scale: 0.65 });
mobile(UT_SHELL, "missile", { ownerMask: "none", scale: 0.45 });
mobile(UT_MIRV_WARHEAD, "missile", { ownerMask: "trim", scale: 0.55 });
mobile(UT_TRAIN, "train", { destroyStyle: "burn", scale: 0.9 });
mobile(UT_PLANE, "aircraft", { destroyStyle: "burn", scale: 1.1 });
mobile(UT_TANK, "armor", {
  reloadStyle: "turret",
  destroyStyle: "burn",
  scale: 1.05,
});

const FALLBACK: WarTableMiniature = {
  id: "fallback",
  family: "structure",
  atlasColumn: 0,
  ownerMask: "body",
  scale: 1,
  groundOffset: 0,
  headingAware: false,
  buildStyle: "none",
  reloadStyle: "none",
  destroyStyle: "break",
};

export function miniatureFor(type: string): WarTableMiniature {
  return entries.get(type) ?? FALLBACK;
}
