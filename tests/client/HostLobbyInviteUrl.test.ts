import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientEnv } from "../../src/client/ClientEnv";
import { crazyGamesSDK } from "../../src/client/CrazyGamesSDK";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";

afterEach(() => vi.restoreAllMocks());

describe("host lobby invite URL", () => {
  it("includes the game's worker prefix like other join links", async () => {
    vi.spyOn(ClientEnv, "shareOrigin").mockReturnValue(
      "https://openback.dedyn.io",
    );
    const worker = vi.spyOn(ClientEnv, "workerPath").mockReturnValue("w1");
    vi.spyOn(crazyGamesSDK, "isOnCrazyGames").mockReturnValue(false);
    const modal = new HostLobbyModal();
    Reflect.set(modal, "lobbyId", "46U9tFUm");
    const url = await Reflect.get(modal, "buildLobbyUrl").call(modal);
    expect(url).toBe("https://openback.dedyn.io/w1/game/46U9tFUm");
    expect(worker).toHaveBeenCalledWith("46U9tFUm");
  });

  it("preserves platform-specific CrazyGames invitations", async () => {
    vi.spyOn(crazyGamesSDK, "isOnCrazyGames").mockReturnValue(true);
    vi.spyOn(crazyGamesSDK, "createInviteLink").mockReturnValue(
      "https://www.crazygames.com/invite/test",
    );
    const modal = new HostLobbyModal();
    Reflect.set(modal, "lobbyId", "46U9tFUm");
    expect(await Reflect.get(modal, "buildLobbyUrl").call(modal)).toBe(
      "https://www.crazygames.com/invite/test",
    );
  });
});
