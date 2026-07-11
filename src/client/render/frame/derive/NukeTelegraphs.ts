import type { NukeTelegraphData, UnitState } from "../../types";
import { NUKE_MAGNITUDES, UT_PLANE, UT_TANK } from "../../types";

// Must match RelationMatrix.ts
const RELATION_FRIENDLY = 1;

export const TELEGRAPH_SELF = 0;
export const TELEGRAPH_FRIENDLY = 1;
export const TELEGRAPH_ENEMY = 2;

/**
 * Classify a nuke owner relative to the local player:
 * 0 = own nuke, 1 = ally/teammate, 2 = everyone else.
 * No local player (replay / spectator) → everything is 2 (enemy color).
 */
function classifyOwner(
  ownerID: number,
  localPlayerID: number,
  relationMatrix: Uint8Array | undefined,
  relationSize: number,
): number {
  if (localPlayerID <= 0) return TELEGRAPH_ENEMY;
  if (ownerID === localPlayerID) return TELEGRAPH_SELF;
  if (
    relationMatrix &&
    ownerID > 0 &&
    ownerID < relationSize &&
    localPlayerID < relationSize &&
    relationMatrix[localPlayerID * relationSize + ownerID] === RELATION_FRIENDLY
  ) {
    return TELEGRAPH_FRIENDLY;
  }
  return TELEGRAPH_ENEMY;
}

/**
 * Extract nuke telegraph circles for active nukes with targets.
 *
 * Each telegraph carries a `relation` (self / friendly / enemy) so the
 * renderer can color it by who launched the nuke. Pass the local player's
 * smallID plus the relation matrix from RelationMatrix.ts; omit them in
 * replay / spectator mode to color everything as enemy.
 */
export function extractNukeTelegraphs(
  units: ReadonlyMap<number, UnitState>,
  mapW: number,
  localPlayerID = 0,
  relationMatrix?: Uint8Array,
  relationSize = 0,
): NukeTelegraphData[] {
  const telegraphs: NukeTelegraphData[] = [];
  for (const u of units.values()) {
    if (u.targetTile === null || !u.isActive) continue;
    const relation = classifyOwner(
      u.ownerID,
      localPlayerID,
      relationMatrix,
      relationSize,
    );
    const isTank = u.unitType === UT_TANK;
    // Tank plans are tactical information: only the owner and allies see
    // their route and destination. Enemies still see the unit and its trail.
    if (isTank && relation === TELEGRAPH_ENEMY) continue;
    const mag = isTank
      ? { inner: 0.8, outer: 2.4 }
      : NUKE_MAGNITUDES[u.unitType];
    if (!mag) continue;
    telegraphs.push({
      x: u.targetTile % mapW,
      y: (u.targetTile - (u.targetTile % mapW)) / mapW,
      innerRadius: mag.inner,
      outerRadius: mag.outer,
      relation,
      sourceX: u.pos % mapW,
      sourceY: Math.floor(u.pos / mapW),
      routeKind: u.unitType === UT_PLANE ? 1 : isTank ? 2 : 0,
    });
  }
  return telegraphs;
}

/**
 * Targeted variant — iterates only pre-classified nuke IDs instead of all units.
 * Used by the live path where UnitClassifier maintains the nuke ID set.
 */
export function extractNukeTelegraphsFromIds(
  nukeIds: readonly number[],
  units: ReadonlyMap<number, UnitState>,
  mapW: number,
  localPlayerID = 0,
  relationMatrix?: Uint8Array,
  relationSize = 0,
): NukeTelegraphData[] {
  const telegraphs: NukeTelegraphData[] = [];
  for (const id of nukeIds) {
    const u = units.get(id);
    if (!u || u.targetTile === null || !u.isActive) continue;
    const mag = NUKE_MAGNITUDES[u.unitType];
    if (!mag) continue;
    telegraphs.push({
      x: u.targetTile % mapW,
      y: (u.targetTile - (u.targetTile % mapW)) / mapW,
      innerRadius: mag.inner,
      outerRadius: mag.outer,
      relation: classifyOwner(
        u.ownerID,
        localPlayerID,
        relationMatrix,
        relationSize,
      ),
      sourceX: u.pos % mapW,
      sourceY: Math.floor(u.pos / mapW),
      routeKind: u.unitType === UT_PLANE ? 1 : 0,
    });
  }
  return telegraphs;
}
