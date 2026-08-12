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
