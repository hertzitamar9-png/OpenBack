/** Minimal view of the local player needed to decide about leaving. */
export interface LeavingPlayer {
  isAlive(): boolean;
}

/**
 * Whether leaving the match should ask for confirmation first.
 *
 * Only a player we positively know is already out may leave without being
 * asked. `myPlayer()` is null until the client resolves the local player, so on
 * a slow or laggy load an "is the player alive?" truthiness check reads "still
 * loading" as "already dead" and lets a single tap abandon a live match.
 * Unknown therefore has to mean "ask".
 */
export function shouldConfirmLeaving(player: LeavingPlayer | null | undefined) {
  if (player === null || player === undefined) return true;
  return player.isAlive();
}
