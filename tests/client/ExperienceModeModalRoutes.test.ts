import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "../../src/client/Api";
import { ClientEnv } from "../../src/client/ClientEnv";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { JoinLobbyModal } from "../../src/client/JoinLobbyModal";
import { SinglePlayerModal } from "../../src/client/SinglePlayerModal";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("experience mode in setup links", () => {
  function solo() {
    const modal = new SinglePlayerModal();
    Reflect.set(modal, "loadNationCount", vi.fn());
    return modal;
  }

  function host() {
    const modal = new HostLobbyModal();
    Reflect.set(modal, "startLobbyUpdates", vi.fn());
    Reflect.set(modal, "refreshBlockedPlayers", vi.fn());
    Reflect.set(modal, "loadNationCount", vi.fn());
    vi.spyOn(document, "addEventListener").mockImplementation(() => {});
    vi.spyOn(api, "createLobby").mockImplementation(
      () => new Promise(() => {}),
    );
    return modal;
  }

  it.each(["2d", "3d"] as const)(
    "honors a direct %s solo link instead of stale mode state",
    (experienceMode) => {
      const modal = solo();
      modal.setExperienceMode(experienceMode === "3d" ? "2d" : "3d");
      Reflect.get(modal, "onOpen").call(modal, { experienceMode });
      expect(Reflect.get(modal, "experienceMode")).toBe(experienceMode);
    },
  );

  it.each(["2d", "3d"] as const)(
    "creates a %s lobby before viewers connect through its invite",
    (experienceMode) => {
      const modal = host();
      modal.setExperienceMode(experienceMode === "3d" ? "2d" : "3d");
      Reflect.get(modal, "onOpen").call(modal, { experienceMode });
      expect(api.createLobby).toHaveBeenCalledWith(experienceMode);
      expect(Reflect.get(modal, "experienceMode")).toBe(experienceMode);
    },
  );

  it.each([solo, host])(
    "preserves the menu selection when opening without route arguments",
    (createModal) => {
      const modal = createModal();
      modal.setExperienceMode("3d");
      Reflect.get(modal, "onOpen").call(modal);
      expect(Reflect.get(modal, "experienceMode")).toBe("3d");
      Reflect.get(modal, "onOpen").call(modal, { experienceMode: "invalid" });
      expect(Reflect.get(modal, "experienceMode")).toBe("3d");
    },
  );

  it.each([
    [null, undefined],
    [{ experienceMode: "3d" }, "3d"],
    [{ experienceMode: "2d" }, "2d"],
    [{ worldMechanics: { threeDMode: true } }, "3d"],
  ])(
    "joins invitations using known lobby mode, not an assumed 2D mode",
    async (config, expected) => {
      vi.spyOn(ClientEnv, "serverHttpBase").mockReturnValue("http://localhost");
      vi.spyOn(ClientEnv, "workerPath").mockReturnValue("w0");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ exists: true }), {
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const modal = new JoinLobbyModal();
      Reflect.set(modal, "gameConfig", config);
      const join = vi.fn();
      modal.addEventListener("join-lobby", join);
      expect(
        await Reflect.get(modal, "checkActiveLobby").call(modal, "abcdefgh"),
      ).toBe(true);
      expect(join).toHaveBeenCalledOnce();
      expect(join.mock.calls[0][0].detail.expectedExperienceMode).toBe(
        expected,
      );
    },
  );
});
