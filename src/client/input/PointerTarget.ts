import type { TileRef } from "../../core/game/GameMap";

interface TargetGame {
  isValidCoord(x: number, y: number): boolean;
  ref(x: number, y: number): TileRef;
}

interface LandTargetGame extends TargetGame {
  isLand(tile: TileRef): boolean;
}

interface TargetTransform {
  screenToWorldCoordinates(x: number, y: number): { x: number; y: number };
}

/**
 * Resolve the visible screen point through OpenBack's existing projection
 * exactly once. TransformHandler already accounts for the canvas rectangle
 * and 2D/3D camera, so this intentionally performs no DPR/backing-store scale.
 */
export function targetTileAtScreenPoint(
  game: TargetGame,
  transform: TargetTransform,
  point: { x: number; y: number },
): TileRef | null {
  const world = transform.screenToWorldCoordinates(point.x, point.y);
  return game.isValidCoord(world.x, world.y)
    ? game.ref(world.x, world.y)
    : null;
}

export function landTargetAtScreenPoint(
  game: LandTargetGame,
  transform: TargetTransform,
  point: { x: number; y: number },
): TileRef | null {
  const tile = targetTileAtScreenPoint(game, transform, point);
  return tile !== null && game.isLand(tile) ? tile : null;
}
