import { afterEach, describe, expect, it } from "vitest";
import { UnitDisplay } from "../../src/client/hud/layers/UnitDisplay";
import { ActivePlacementChangedEvent } from "../../src/client/InputHandler";
import type { UIState } from "../../src/client/UIState";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";
import { UnitType } from "../../src/core/game/Game";
import { UserSettings } from "../../src/core/game/UserSettings";

describe("UnitDisplay selection cleanup", () => {
  afterEach(() => document.body.replaceChildren());

  it("hides the description when the selected unit is tapped again", async () => {
    const uiState = { ghostStructure: UnitType.City } as UIState;
    const player = {
      gold: () => 1_000_000n,
      isAlive: () => true,
      totalUnitLevels: () => 2,
      units: () => [],
    };
    const display = new UnitDisplay();
    display.game = {
      inSpawnPhase: () => false,
      myPlayer: () => player,
      config: () => ({
        isUnitDisabled: (type: UnitType) => type !== UnitType.City,
      }),
    } as unknown as GameView;
    display.uiState = uiState;
    display.eventBus = new EventBus();
    (display as unknown as { _hoveredUnit: UnitType | null })._hoveredUnit =
      UnitType.City;
    document.body.appendChild(display);
    await display.updateComplete;

    expect(display.querySelector(".game-unit-mobile-info")).not.toBeNull();
    display
      .querySelector<HTMLElement>(".game-unit-item > div:last-child")!
      .click();
    await display.updateComplete;

    expect(uiState.ghostStructure).toBeNull();
    expect(display.querySelector(".game-unit-mobile-info")).toBeNull();
  });

  it("can hide build descriptions without hiding the build bar", async () => {
    (
      UserSettings as unknown as { cache: Map<string, string | null> }
    ).cache.clear();
    localStorage.setItem("settings.buildBarDescriptions", "false");
    const uiState = { ghostStructure: UnitType.City } as UIState;
    const display = new UnitDisplay();
    display.game = {
      inSpawnPhase: () => false,
      myPlayer: () => ({
        gold: () => 1_000_000n,
        isAlive: () => true,
        totalUnitLevels: () => 1,
        units: () => [],
      }),
      config: () => ({
        isUnitDisabled: (type: UnitType) => type !== UnitType.City,
      }),
    } as unknown as GameView;
    display.uiState = uiState;
    display.eventBus = new EventBus();
    document.body.appendChild(display);
    await display.updateComplete;

    expect(display.querySelector(".game-unit-item")).not.toBeNull();
    expect(display.querySelector(".game-unit-mobile-info")).toBeNull();
    localStorage.removeItem("settings.buildBarDescriptions");
  });

  it("hides the description immediately when another interaction clears placement", async () => {
    (
      UserSettings as unknown as { cache: Map<string, string | null> }
    ).cache.clear();
    localStorage.removeItem("settings.buildBarDescriptions");
    const uiState = {
      ghostStructure: UnitType.City,
      activePlacementRevision: 0,
    } as UIState;
    const display = new UnitDisplay();
    display.game = {
      inSpawnPhase: () => false,
      myPlayer: () => ({
        gold: () => 1_000_000n,
        isAlive: () => true,
        totalUnitLevels: () => 1,
        units: () => [],
      }),
      config: () => ({
        isUnitDisabled: (type: UnitType) => type !== UnitType.City,
      }),
    } as unknown as GameView;
    display.uiState = uiState;
    display.eventBus = new EventBus();
    display.init();
    document.body.appendChild(display);
    await display.updateComplete;
    expect(display.querySelector(".game-unit-mobile-info")).not.toBeNull();

    uiState.ghostStructure = null;
    uiState.activePlacementRevision =
      (uiState.activePlacementRevision ?? 0) + 1;
    display.eventBus.emit(new ActivePlacementChangedEvent(null));
    await display.updateComplete;

    expect(display.querySelector(".game-unit-mobile-info")).toBeNull();
  });
});
