import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Config } from "../../src/core/configuration/Config";
import { GameMode, UnitType } from "../../src/core/game/Game";
import { Cluster, TrainStation } from "../../src/core/game/TrainStation";
import {
  createGameWireContext,
  decodeClientMessage,
  encodeClientMessage,
} from "../../src/core/ZbinWire";

describe("OpenFront v0.33.12 integration contract", () => {
  it("round-trips an OpenBack attack intent through the binary wire", () => {
    const ctx = createGameWireContext([
      { clientID: "player01" },
      { clientID: "player02" },
    ]);
    const intent = {
      type: "intent",
      intent: {
        type: "attack",
        targetID: "player02",
        troops: 100,
      },
    } as const;
    expect(decodeClientMessage(encodeClientMessage(intent, ctx), ctx)).toEqual(
      intent,
    );
  });

  it("drops the FFA overtime threshold deterministically", () => {
    const config = new Config(
      {
        gameMode: GameMode.FFA,
        overtime: { enabled: true, startMinutes: 30 },
        disabledUnits: [],
      } as any,
      null,
      false,
    );
    expect(config.percentageTilesOwnedToWin(30 * 60)).toBe(80);
    expect(config.percentageTilesOwnedToWin(31 * 60)).toBe(78);
  });

  it("keeps duplicate train-station insertion idempotent", () => {
    const station = new TrainStation(
      { ticks: () => 0 } as any,
      {
        type: () => UnitType.City,
        owner: () => ({ canTrade: () => true }),
      } as any,
    );
    const cluster = new Cluster();
    cluster.addStation(station);
    cluster.addStation(station);
    expect(cluster.has(station)).toBe(true);
    expect(station.getCluster()).toBe(cluster);
  });

  it("does not restore OpenFront advertising or press promotion", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).not.toContain("AdShield");
    expect(html).not.toContain("openfront.io/press");
  });
});
