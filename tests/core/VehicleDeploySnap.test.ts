import { beforeEach, describe, expect, test } from "vitest";
import { PlaneExecution } from "../../src/core/execution/PlaneExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { setup } from "../util/Setup";

/**
 * How far from a runway a click still deploys the aircraft parked there.
 *
 * This was structureMinDist -- the 15-tile spacing rule for buildings, which
 * has nothing to do with aiming a vehicle. Clicking open ground most of a
 * screen away from any runway still launched a plane, and with two runways in
 * reach the click snapped to whichever was nearer rather than the one under
 * the cursor. The radius is its own number now, and deliberately tight.
 */
describe("deploying a vehicle snaps only to a base you are on", () => {
  let game: Game;
  let player: Player;
  const info = new PlayerInfo("a", PlayerType.Human, null, "a");

  beforeEach(async () => {
    game = await setup(
      "plains",
      { infiniteGold: true, instantBuild: true, infiniteTroops: false },
      [info],
    );
    player = game.player(info.id);
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) player.conquer(game.ref(x, y));
    }
    player.addTroops(100_000);
    player.buildUnit(UnitType.Runway, game.ref(5, 5), {});
  });

  const canPlacePlaneAt = (x: number, y: number) =>
    player.buildableUnits(game.ref(x, y), [UnitType.Plane])[0].canBuild !==
    false;

  test("a click on the runway deploys from it", () => {
    expect(canPlacePlaneAt(5, 5)).toBe(true);
  });

  test("a click just beside the runway still deploys from it", () => {
    // Enough slack that the click need not be pixel-perfect.
    expect(canPlacePlaneAt(8, 5)).toBe(true);
  });

  test("a click well away from the runway deploys nothing", () => {
    // All of these used to launch a plane from the runway back at (5, 5).
    expect(canPlacePlaneAt(10, 5)).toBe(false);
    expect(canPlacePlaneAt(15, 5)).toBe(false);
    expect(canPlacePlaneAt(19, 5)).toBe(false);
  });

  test("the snap radius is the vehicle one, not the building spacing", () => {
    const config = game.config();
    expect(config.openBackVehicleSnapRadius()).toBeLessThan(
      config.structureMinDist(),
    );
    expect(config.openBackVehicleSnapRadius()).toBeLessThanOrEqual(4);
  });

  test("a runway that already has its plane will not take another", () => {
    game.addExecution(new PlaneExecution(player, game.ref(5, 5), 1_000));
    game.executeNextTick();
    for (let i = 0; i < 60; i++) game.executeNextTick();

    expect(player.units(UnitType.Plane)).toHaveLength(1);
    expect(canPlacePlaneAt(5, 5)).toBe(false);
  });
});
