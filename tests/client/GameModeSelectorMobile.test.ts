import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GameModeSelector } from "../../src/client/GameModeSelector";
import { GameMapType } from "../../src/core/game/Game";
import type { PublicGameInfo } from "../../src/core/Schemas";

describe("mobile lobby countdown", () => {
  beforeEach(() => {
    const language = document.createElement("lang-selector") as HTMLElement & {
      currentLang: string;
      translations: Record<string, string>;
      defaultTranslations: Record<string, string>;
    };
    language.currentLang = "en";
    language.translations = {
      "common.duration_minute_short": "min",
      "common.duration_second_short": "s",
    };
    language.defaultTranslations = language.translations;
    document.body.appendChild(language);
  });

  afterEach(() => document.body.replaceChildren());

  it("reserves enough space to render the complete duration", () => {
    const selector = new GameModeSelector();
    const lobby = {
      startsAt: Date.now() + 75_900,
      gameConfig: {
        gameMap: GameMapType.World,
        publicGameModifiers: [],
      },
      numClients: 0,
      maxPlayers: 50,
    } as unknown as PublicGameInfo;
    const template = (
      selector as unknown as {
        renderLobbyCard(
          lobby: PublicGameInfo,
          title: string,
          highResolution?: boolean,
        ): ReturnType<GameModeSelector["render"]>;
      }
    ).renderLobbyCard(lobby, "World");
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(template, host);

    const timer = host.querySelector<HTMLElement>("[data-lobby-timer]");
    expect(timer?.textContent?.trim()).toBe("1min 15s");
    expect(timer?.classList).toContain("whitespace-nowrap");
    expect(timer?.classList).not.toContain("truncate");
  });

  it("uses the double-resolution source as the featured card baseline", () => {
    const selector = new GameModeSelector();
    const lobby = {
      startsAt: Date.now() + 75_900,
      gameConfig: {
        gameMap: GameMapType.World,
        publicGameModifiers: [],
      },
      numClients: 0,
      maxPlayers: 50,
    } as unknown as PublicGameInfo;
    const template = (
      selector as unknown as {
        renderLobbyCard(
          lobby: PublicGameInfo,
          title: string,
          highResolution?: boolean,
        ): ReturnType<GameModeSelector["render"]>;
      }
    ).renderLobbyCard(lobby, "World", true);
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(template, host);

    const image = host.querySelector<HTMLImageElement>("img");
    expect(decodeURIComponent(image?.getAttribute("src") ?? "")).toContain(
      "thumbnail@2x.webp",
    );
    expect(decodeURIComponent(image?.getAttribute("srcset") ?? "")).toContain(
      "thumbnail@2x.webp 1x",
    );
  });
});
