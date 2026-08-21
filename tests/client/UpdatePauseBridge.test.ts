import { afterEach, describe, expect, it, vi } from "vitest";
import { GameRightSidebar } from "../../src/client/hud/layers/GameRightSidebar";
import { TogglePauseIntentEvent } from "../../src/client/InputHandler";
import { UpdateSuspensionEvent } from "../../src/client/openback/UpdateWatcher";
import { PauseGameIntentEvent } from "../../src/client/Transport";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";
import { GameType } from "../../src/core/game/Game";

vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  translateText: (key: string) => key,
}));

function setup(gameType: GameType, listed = false) {
  const bus = new EventBus();
  const sidebar = new GameRightSidebar();
  sidebar.game = {
    config: () => ({
      doomsdayClockConfig: () => undefined,
      gameConfig: () => ({ gameType, maxTimerValue: null }),
      isReplay: () => false,
      listed,
    }),
    inSpawnPhase: () => false,
    elapsedGameSeconds: () => 0,
    myPlayer: () => ({ isLobbyCreator: () => true }),
    ticks: () => 0,
  } as unknown as GameView;
  sidebar.eventBus = bus;
  document.body.appendChild(sidebar);
  sidebar.init();
  sidebar.tick();
  const pauses: boolean[] = [];
  bus.on(PauseGameIntentEvent, (event) => pauses.push(event.paused));
  return { bus, pauses };
}

describe("update pause bridge", () => {
  afterEach(() => document.body.replaceChildren());

  it("pauses and resumes an unpaused single-player match", () => {
    const { bus, pauses } = setup(GameType.Singleplayer);
    bus.emit(new UpdateSuspensionEvent(true));
    bus.emit(new UpdateSuspensionEvent(false));
    expect(pauses).toEqual([true, false]);
  });

  it("does not resume a match that the player had already paused", () => {
    const { bus, pauses } = setup(GameType.Singleplayer);
    bus.emit(new TogglePauseIntentEvent());
    pauses.length = 0;
    bus.emit(new UpdateSuspensionEvent(true));
    bus.emit(new UpdateSuspensionEvent(false));
    expect(pauses).toEqual([]);
  });

  it("does not send an unauthorized pause in a listed public match", () => {
    const { bus, pauses } = setup(GameType.Public, true);
    bus.emit(new UpdateSuspensionEvent(true));
    bus.emit(new UpdateSuspensionEvent(false));
    expect(pauses).toEqual([]);
  });
});
