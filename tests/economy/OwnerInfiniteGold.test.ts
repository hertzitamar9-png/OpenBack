import { PlayerInfo, PlayerType, UnitType } from "../../src/core/game/Game";
import { setup } from "../util/Setup";

describe("owner account infinite gold", () => {
  test("only a player with the server entitlement receives zero costs", async () => {
    const ownerInfo = new PlayerInfo(
      "owner",
      PlayerType.Human,
      "owner001",
      "owner-id",
      false,
      null,
      [],
      ["owner001"],
      null,
    );
    const regularInfo = new PlayerInfo(
      "regular",
      PlayerType.Human,
      "regular1",
      "regular-id",
    );
    const game = await setup(
      "plains",
      { infiniteGold: false, infiniteGoldClientIDs: ["owner001"] },
      [ownerInfo, regularInfo],
    );

    expect(
      game.unitInfo(UnitType.City).cost(game, game.player(ownerInfo.id)),
    ).toBe(0n);
    expect(
      game.unitInfo(UnitType.City).cost(game, game.player(regularInfo.id)),
    ).toBe(125_000n);
  });
});
