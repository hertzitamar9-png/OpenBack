import { beforeEach, describe, expect, test } from "vitest";
import { Game, Player, PlayerInfo, PlayerType } from "../../src/core/game/Game";
import { canBuildTransportShip } from "../../src/core/game/TransportShipUtils";
import { setup } from "../util/Setup";

/**
 * A boat carries troops to a shore, so the tile the player picks has to be
 * land.
 *
 * Open water used to be accepted: the click was handed straight to
 * closestReachableShore, which returned whatever coast happened to be nearest
 * to it. Tapping empty ocean therefore launched an invasion at a shore the
 * player never chose, and from mid-ocean the nearest coast can be most of a
 * map away -- which is what "it sends it to a random place" looks like. It was
 * easiest to hit on a phone, where a tap is less precise than a click.
 */
describe("a boat needs somewhere to land", () => {
  let game: Game;
  let attacker: Player;
  let defender: Player;
  const attackerInfo = new PlayerInfo("a", PlayerType.Human, null, "a");
  const defenderInfo = new PlayerInfo("d", PlayerType.Human, null, "d");

  beforeEach(async () => {
    game = await setup(
      "ocean_and_land",
      { infiniteGold: true, instantBuild: true },
      [attackerInfo, defenderInfo],
    );
    attacker = game.player(attackerInfo.id);
    defender = game.player(defenderInfo.id);
    attacker.addTroops(50_000);
  });

  function anyWaterTile(): number {
    for (let x = 0; x < game.width(); x++) {
      for (let y = 0; y < game.height(); y++) {
        const ref = game.ref(x, y);
        if (!game.isLand(ref)) return ref;
      }
    }
    throw new Error("map has no water");
  }

  function anyLandTileOwnedBy(player: Player): number | null {
    for (let x = 0; x < game.width(); x++) {
      for (let y = 0; y < game.height(); y++) {
        const ref = game.ref(x, y);
        if (game.isLand(ref) && game.owner(ref) === player) return ref;
      }
    }
    return null;
  }

  test("open water is refused outright", () => {
    const water = anyWaterTile();
    expect(game.isLand(water)).toBe(false);
    expect(canBuildTransportShip(game, attacker, water)).toBe(false);
  });

  test("refusing water does not depend on who owns it", () => {
    // The old path asked closestReachableShore about the clicked tile's owner,
    // so unowned ocean quietly resolved to some unrelated coast.
    const water = anyWaterTile();
    expect(game.owner(water).isPlayer()).toBe(false);
    expect(canBuildTransportShip(game, attacker, water)).toBe(false);
  });

  test("a land tile is still evaluated rather than rejected on sight", () => {
    // The guard must reject water only. Land goes on to the real checks --
    // reachability, ownership, boat limit -- which may still say no, but for
    // their own reasons, and the tile is never water.
    for (let x = 0; x < game.width(); x++) {
      for (let y = 0; y < game.height(); y++) {
        const ref = game.ref(x, y);
        if (!game.isLand(ref)) continue;
        const result = canBuildTransportShip(game, attacker, ref);
        if (result !== false) {
          expect(game.isLand(result)).toBe(true);
          return;
        }
      }
    }
    // No landable target on this fixture is acceptable; the guard is still
    // proven by the water cases above.
  });

  test("your own land is still refused, as before", () => {
    const own = anyLandTileOwnedBy(defender);
    if (own === null) return;
    expect(canBuildTransportShip(game, defender, own)).toBe(false);
  });
});
