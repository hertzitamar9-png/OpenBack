import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { setup } from "./util/Setup";

let game: Game;
let player: Player;
let other: Player;

describe("PlayerImpl", () => {
  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [
      new PlayerInfo("player", PlayerType.Human, null, "player_id"),
      new PlayerInfo("other", PlayerType.Human, null, "other_id"),
    ]);

    player = game.player("player_id");
    other = game.player("other_id");

    player.conquer(game.ref(0, 0));
    other.conquer(game.ref(50, 50));
    player.addGold(BigInt(1000000));

    game.config().structureMinDist = () => 10;
  });

  test("City can be upgraded", () => {
    const city = player.buildUnit(UnitType.City, game.ref(0, 0), {});
    const buCity = player
      .buildableUnits(game.ref(0, 0))
      .find((bu) => bu.type === UnitType.City);
    expect(buCity).toBeDefined();
    expect(buCity!.canUpgrade).toBe(city.id());
  });

  test("DefensePost cannot be upgraded", () => {
    player.buildUnit(UnitType.DefensePost, game.ref(0, 0), {});
    const buDefensePost = player
      .buildableUnits(game.ref(0, 0))
      .find((bu) => bu.type === UnitType.DefensePost);
    expect(buDefensePost).toBeDefined();
    expect(buDefensePost!.canUpgrade).toBeFalsy();
  });

  test("City can be upgraded from another city", () => {
    const city = player.buildUnit(UnitType.City, game.ref(0, 0), {});
    const cityToUpgrade = player.findUnitToUpgrade(
      UnitType.City,
      game.ref(0, 1),
    );
    expect(cityToUpgrade).toBeTruthy();
    if (cityToUpgrade === false) {
      return;
    }
    expect(cityToUpgrade.id()).toBe(city.id());
  });
  test("City cannot be upgraded when too far away", () => {
    player.buildUnit(UnitType.City, game.ref(0, 0), {});
    const cityToUpgrade = player.findUnitToUpgrade(
      UnitType.City,
      game.ref(50, 50),
    );
    expect(cityToUpgrade).toBe(false);
  });
  test.each([
    UnitType.Runway,
    UnitType.MANPAD,
    UnitType.MilitaryBase,
    UnitType.TankMine,
  ] as const)(
    "%s auto-snaps to a nearby owned stack using the regular structure radius",
    (unitType) => {
      const stackTile = game.ref(0, 0);
      const nearbyUnownedTile = game.ref(0, 1);
      player.buildUnit(unitType, stackTile, {});

      const buildable = player.buildableUnits(nearbyUnownedTile, [unitType])[0];

      expect(buildable.canBuild).toBe(stackTile);
    },
  );
  test.each([
    UnitType.Runway,
    UnitType.MANPAD,
    UnitType.MilitaryBase,
    UnitType.TankMine,
  ] as const)(
    "%s does not snap beyond the regular structure radius",
    (unitType) => {
      player.buildUnit(unitType, game.ref(0, 0), {});

      const buildable = player.buildableUnits(game.ref(50, 50), [unitType])[0];

      expect(buildable.canBuild).toBe(false);
    },
  );
  test("Unit cannot be upgraded when not enough gold", () => {
    player.buildUnit(UnitType.City, game.ref(0, 0), {});
    player.removeGold(BigInt(1000000));
    const cityToUpgrade = player.findUnitToUpgrade(
      UnitType.City,
      game.ref(0, 1),
    );
    expect(cityToUpgrade).toBe(false);
  });

  test("Can't send alliance requests when dead", () => {
    // conquer other
    const otherTiles = other.tiles();
    for (const tile of otherTiles) {
      player.conquer(tile);
    }
    expect(other.canSendAllianceRequest(player)).toBe(false);
  });
});
