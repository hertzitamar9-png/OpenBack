import { TrainType, UT_PLANE, UT_TANK, UT_TRAIN } from "../../types";
import { miniatureFor } from "./WarTableMiniatureRegistry";

export interface WarTableBuildAnimation {
  assembly: number;
  settle: number;
}

export interface WarTableStructureInstanceInput {
  unitType: string;
  x: number;
  y: number;
  ownerID: number;
  constructionStartTick: number | null;
  constructionDuration: number;
  markedForDeletion: boolean;
  tick: number;
}

export interface WarTableStructureInstance {
  x: number;
  y: number;
  ownerID: number;
  atlasColumn: number;
  assembly: number;
  deletion: number;
  scale: number;
  groundOffset: number;
}

export interface WarTableMovementAnimation {
  wakePhase: number;
  wheelPhase: number;
  exhaustPhase: number;
  treadPhase: number;
}

export interface WarTableMobileInstanceInput {
  unitType: string;
  x: number;
  y: number;
  ownerID: number;
  angle: number;
  tick: number;
  moving: boolean;
  trainType: number | null;
  loaded: boolean | null;
}

export interface WarTableMobileInstance {
  x: number;
  y: number;
  ownerID: number;
  atlasColumn: number;
  heading: number;
  scale: number;
  groundOffset: number;
  family: ReturnType<typeof miniatureFor>["family"];
  variant: number;
  wakePhase: number;
  wheelPhase: number;
  exhaustPhase: number;
  treadPhase: number;
}

const bounded = (value: number): number => Math.max(0, Math.min(1, value));

export function buildAnimation(
  constructionStartTick: number | null,
  tick: number,
  constructionDuration: number,
): WarTableBuildAnimation {
  if (constructionStartTick === null) return { assembly: 1, settle: 1 };
  const duration = Math.max(1, constructionDuration);
  const assembly = bounded((tick - constructionStartTick) / duration);
  return { assembly, settle: assembly >= 1 ? 1 : 0 };
}

export function deletionAnimation(markedForDeletion: boolean): number {
  return markedForDeletion ? 1 : 0;
}

export function structureInstanceFor(
  input: WarTableStructureInstanceInput,
): WarTableStructureInstance {
  const miniature = miniatureFor(input.unitType);
  return {
    x: input.x,
    y: input.y,
    ownerID: input.ownerID,
    atlasColumn: miniature.atlasColumn,
    assembly: buildAnimation(
      input.constructionStartTick,
      input.tick,
      input.constructionDuration,
    ).assembly,
    deletion: deletionAnimation(input.markedForDeletion),
    scale: miniature.scale,
    groundOffset: miniature.groundOffset,
  };
}

function phase(tick: number, divisor: number): number {
  const value = tick / divisor;
  return value - Math.floor(value);
}

export function movementAnimation(
  unitType: string,
  moving: boolean,
  tick: number,
): WarTableMovementAnimation {
  const miniature = miniatureFor(unitType);
  return {
    wakePhase: moving && miniature.family === "ship" ? phase(tick, 18) : 0,
    wheelPhase: moving && miniature.family === "train" ? phase(tick, 12) : 0,
    exhaustPhase:
      moving && miniature.family === "aircraft" ? phase(tick, 16) : 0,
    treadPhase: moving && miniature.family === "armor" ? phase(tick, 10) : 0,
  };
}

export function mobileInstanceFor(
  input: WarTableMobileInstanceInput,
): WarTableMobileInstance {
  const miniature = miniatureFor(input.unitType);
  const motion = movementAnimation(input.unitType, input.moving, input.tick);
  let variant = 0;
  if (input.unitType === UT_TRAIN) {
    if (
      input.trainType === TrainType.Engine ||
      input.trainType === TrainType.TailEngine
    ) {
      variant = 1;
    } else {
      variant = input.loaded ? 3 : 2;
    }
  } else if (input.unitType === UT_PLANE) {
    variant = 4;
  } else if (input.unitType === UT_TANK) {
    variant = 5;
  }
  return {
    x: input.x,
    y: input.y,
    ownerID: input.ownerID,
    atlasColumn: miniature.atlasColumn,
    heading: Number.isFinite(input.angle) ? input.angle : 0,
    scale: miniature.scale,
    groundOffset: miniature.groundOffset,
    family: miniature.family,
    variant,
    ...motion,
  };
}
